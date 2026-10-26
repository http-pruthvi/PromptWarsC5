/**
 * HTML Sanitization utilities to protect against stored XSS and HTML injection.
 * Strips dangerous HTML tags, attributes, event handlers, and javascript: protocols.
 */

// Common HTML entities map for escaping
const ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
}

/**
 * Escapes raw HTML characters to prevent tag injection when rendered.
 */
export function escapeHtml(str: string): string {
  if (!str) return ''
  return String(str).replace(/[&<>"'/]/g, (s) => ENTITY_MAP[s] as string)
}

/**
 * Strips HTML tags and event handlers from user text, normalizing whitespace.
 * Removes <script>, <iframe>, <style>, <object>, <embed>, <svg>, and all tags,
 * as well as inline javascript: pseudo-protocols and on* event handlers.
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') return ''

  const text = input
    // Remove script / style / iframe blocks and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Strip all remaining HTML tags
    .replace(/<\/?[a-z0-9]+(?:\s+[^>]*)?>/gi, '')
    // Strip javascript: or data: pseudo-protocols
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    // Strip standalone onerror/onload attributes that might leak through
    .replace(/\bon\w+\s*=/gi, '')

  return text.trim()
}
