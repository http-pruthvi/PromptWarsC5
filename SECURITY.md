# Security Policy

The Soirée team takes the security and privacy of our users, events, and party plans seriously. This document outlines our security architecture, policies, supported versions, and responsible disclosure process.

---

## 1. Supported Versions

We provide security updates and patches for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

---

## 2. Reporting a Vulnerability

If you discover a security vulnerability in Soirée, please report it privately. **Do NOT open a public GitHub issue.**

### Reporting Channels

- **Security Email**: [security@soiree.app](mailto:security@soiree.app)
- **RFC 9116 Security Endpoint**: `/.well-known/security.txt` and `/security.txt`

### What to Include

1. **Description**: Clear description of the vulnerability and its potential impact.
2. **Reproduction Steps**: Step-by-step instructions or proof-of-concept (PoC) script.
3. **Affected Endpoints**: Specific API routes or client components involved.
4. **Environment**: Browser version, operating system, and runtime details.

### Response SLA & Timeline

- **Initial Acknowledgment**: Within 24 hours.
- **Triage & Assessment**: Within 48 hours.
- **Remediation & Patch**: Within 7 business days for high/critical vulnerabilities.
- **Coordinated Disclosure**: We adhere to a 90-day responsible disclosure window.

---

## 3. Safe Harbor

Any research conducted in good faith according to this policy is considered authorized. We will not pursue legal action against security researchers who:

- Make a reasonable effort to avoid data loss, service degradation, or privacy violations.
- Do not access, modify, or exfiltrate private user or guest data beyond what is minimally necessary for a PoC.
- Provide us adequate time to address the reported vulnerability before public disclosure.

---

## 4. Security Architecture & Controls

### 4.1 Dependency Hardening

- **Zero Production Vulnerabilities**: Audited with `npm audit --omit=dev` ensuring 0 high or critical vulnerabilities.
- Automated lockfile scanning and dependency overrides to patch upstream CVEs.

### 4.2 HTTP Security Headers

Soirée enforces enterprise-grade HTTP response headers via Helmet:

- **Content-Security-Policy (CSP)**: Strict `default-src 'self'` policy with whitelisted fonts, images (`images.unsplash.com`), and blocked object/frame embeds.
- **Cross-Origin-Opener-Policy (COOP)**: `same-origin` to isolate browsing contexts.
- **Cross-Origin-Resource-Policy (CORP)**: `same-origin` to prevent unauthorized resource leakage.
- **HTTP Strict Transport Security (HSTS)**: 1-year duration (`max-age=31536000; includeSubDomains; preload`).
- **Permissions-Policy**: Restricts access to sensitive browser capabilities: `camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()`.
- **Referrer-Policy**: `strict-origin-when-cross-origin`.

### 4.3 Authentication & Session Security

- **Timing Attack Mitigation**: Login verification uses precomputed dummy bcrypt comparisons on non-existent accounts, preventing timing-based user enumeration.
- **Secure Cookie Attributes**: JWT tokens are issued via sliding session cookies with:
  - `httpOnly: true` (inaccessible to JavaScript)
  - `sameSite: 'lax'` (CSRF mitigation)
  - `secure: true` in production environments
  - `path: '/'` with a 30-day sliding expiration refreshed on authenticated requests
- **Password Hashing**: Bcrypt with configurable salt work factor (default: 10 rounds).

### 4.4 Input Validation & Denial-of-Service Defense

- **Strict Schema Validation**: All request bodies, query parameters, and route parameters are validated using strict Zod schemas.
- **Payload Size Limits**: Strict Express body parser limit of `256kb` on JSON and `100kb` on URL-encoded data.
- **Multi-Tier Rate Limiting**:
  - General API: 300 requests / 15 minutes per IP.
  - Authentication: 60 attempts / 15 minutes per IP.
  - Public Shared Plans: 120 requests / 15 minutes per IP.

### 4.5 Data Sanitization & Public Sharing

- **Cryptographic Share Tokens**: URL-safe 144-bit entropy tokens (`crypto.randomBytes(18).toString('base64url')`).
- **Sanitized Public Views**: Whitelisted public fields strip all confidential organizer contact details, vendor contacts, and private notes.
