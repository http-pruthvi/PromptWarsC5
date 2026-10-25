# Soirée — Security Policy & Hardening Specification

This document outlines the security architecture, threat model mitigations, authentication mechanisms, and input validation policies implemented in **Soirée**.

---

## 1. Threat Model & Defense-in-Depth Summary

| Risk Vector                         | Threat Classification                    | Mitigation Implemented                                                                                                                                                           |
| :---------------------------------- | :--------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Injected / Unexpected Fields**    | Prototype pollution, schema bypass       | **Strict Zod validation** with `.strict()` on every body, query, and path parameter. Unknown keys rejected with HTTP 400.                                                        |
| **Large Payload Floods**            | Denial of Service (DoS), OOM crash       | **Body size limits**: JSON bodies capped at 256KB (`limit: '256kb'`), urlencoded capped at 100KB. Payloads exceeding limits return HTTP 413 `PayloadTooLargeError`.              |
| **Cross-Site Scripting (XSS)**      | Malicious script execution in browser    | Server-side text sanitization (`sanitizeText`) and HTML entity escaping (`escapeHtml`). React default auto-escaping in client views.                                             |
| **Token Theft / Session Hijacking** | Cookie theft via JavaScript              | Sealed **`httpOnly`** JWT session cookie (`sameSite: 'lax'`, `secure: true` in production).                                                                                      |
| **Default Secret Misconfiguration** | Token forgery via known secret           | **Production startup guard**: Server verifies `JWT_SECRET` on boot and refuses to start if unset or left as default placeholder.                                                 |
| **Internal Stack Leakage**          | Information disclosure                   | Error handler masks 5xx exceptions in production with generic `"Something went wrong"`, logging stack traces server-side only.                                                   |
| **SQL Injection**                   | Unauthorized data access / mutation      | 100% parameterized prepared statements via `better-sqlite3`. Zero string concatenation in SQL queries.                                                                           |
| **Cross-User Data Access**          | Broken Object Level Authorization (BOLA) | Mandatory ownership verification middleware (`verifyPlanOwnership`) checking `user_id` against JWT claims on all plan mutations.                                                 |
| **Public Link Data Leakage**        | Confidential budget/PII exposure         | Dedicated public query and schema (`PublicPlanView`) strictly excluding budget amounts, spent tracking, notes, and chat logs. Dynamic `noindex, nofollow` robots meta injection. |
| **Calendar Injection**              | Malicious command injection via `.ics`   | RFC 5545 compliant line-folding at 75 octets and special character escaping (`\`, `,`, `;`, `\n`).                                                                               |

---

## 2. Strict Input Validation (Section B.2 Hardening)

Every endpoint in the Soirée API enforces strict schema validation using Zod:

### Path Parameter Validation

All ID parameters (`:id`, `:itemId`, `:guestId`, `:token`) are validated before route handler execution:

```ts
const ParamsSchema = z
  .object({
    id: z.string().min(1).max(64),
  })
  .strict()
```

### Query Parameter Validation

Pagination and filtering query strings reject unexpected or injected parameters:

```ts
const QuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict()
```

_Tested & Verified_: Requesting `/api/plans?injectedQuery=malicious` returns HTTP 400 with unrecognized keys error.

### Request Body Validation

All POST and PATCH payloads enforce exact schemas with `.strict()`:

```ts
const BriefSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    type: z.enum(['wedding', 'birthday', 'community']),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    guests: z.number().int().min(1).max(10000),
    budget: z.number().min(0).max(100000000),
    currency: z.enum(['INR', 'USD', 'EUR', 'GBP']),
    city: z.string().trim().max(80).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .strict()
```

_Tested & Verified_: Submitting `{ title: "My Party", ..., extraMaliciousField: "hack" }` is blocked with HTTP 400.

---

## 3. Request Body Size Limits & DoS Protection

In `server/src/app.ts`:

```ts
app.use(express.json({ limit: '256kb' }))
app.use(express.urlencoded({ extended: true, limit: '100kb' }))
```

When a client submits a payload larger than 256KB, Express immediately halts ingestion and passes a `PayloadTooLargeError` (`entity.too.large`) to the centralized error handler:

```ts
if (err.type === 'entity.too.large' || err.status === 413) {
  res.status(413).json({ error: 'Payload too large. Maximum request body is 256KB.' })
  return
}
```

_Tested & Verified_: A 300KB JSON payload sent to `/api/plans` returns HTTP 413 `Payload too large`.

---

## 4. RFC 5545 iCalendar (`.ics`) Escaping & Line Folding

Exported celebration calendars (`server/src/services/ics.ts`) conform to RFC 5545 specifications:

1. **Character Escaping**: Backslashes, commas, semicolons, and newlines in event titles, summaries, and descriptions are escaped:
   ```ts
   export function escapeIcsText(s: string): string {
     return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
   }
   ```
2. **75-Octet Line Folding**: Lines exceeding 75 octets are folded using `\r\n ` (CRLF followed by a single space):
   ```ts
   export function foldLine(line: string): string {
     // Splits line into chunks of <= 75 bytes and prefixes subsequent lines with a space
   }
   ```

_Tested & Verified_: Milestone labels containing quotes, semicolons, and multiline descriptions format into valid RFC 5545 files accepted by Google Calendar, Apple Calendar, and Microsoft Outlook without syntax corruption.

---

## 5. HTML Sanitization Against XSS

User-provided text stored in the database or reflected in public shared views is sanitized via `server/src/utils/sanitize.ts`:

```ts
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
```

_Tested & Verified_: Strings like `<script>alert('xss')</script>` or `<img src=x onerror=alert(1)>` are neutralized before persistence and public rendering.

---

## 6. Authentication & Session Hardening

- **JWT Storage**: Tokens are sealed in an `httpOnly`, `sameSite: 'lax'`, `path: '/'` cookie named `soiree_token`.
- **Sliding Session Renewal**: Every authenticated request with a valid cookie receives an automatic sliding renewal (7 days from request time), maintaining an active session for engaged users without credential re-entry.
- **Dual Authentication**: Accepts both `Cookie: soiree_token=...` and `Authorization: Bearer <token>` for seamless browser and programmatic API clients.
- **Production Startup Guard**:
  ```ts
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'soiree-default-jwt-secret-do-not-use-in-real-prod') {
      console.error('[SECURITY CRITICAL]: JWT_SECRET must be set to a secure secret in production. Aborting.')
      process.exit(1)
    }
  }
  ```

---

## 7. Public Read-Only Plan Isolation

Public celebration links (`/api/public/plans/:token`) operate under strict privacy controls:

1. **Confidentiality Filtering**: Returns only a sanitized subset (`PublicPlanView`) containing title, event type, date, city, moodboard palette, milestone titles, vendor category statuses, and creative ideas.
2. **Hidden Fields**: Budget allocations, spent amounts, contingency reserves, private host notes, guest lists, account email, and database user IDs are completely excluded from the query.
3. **Robots Meta Exclusion**: The public page dynamically injects `<meta name="robots" content="noindex, nofollow">` to prevent web crawlers from indexing private celebration details.
4. **Rate Limiting**: Public token lookups are capped at 120 requests per 15 minutes per IP to mitigate token scanning.
