import type { Plan } from '@soiree/shared'
import { uid } from './generator.js'

function addDays(dateStr: string, days: number): Date {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d
}

const dueDate = (plan: Plan, weeksBefore: number) => addDays(plan.brief.date, -Math.round(weeksBefore * 7))

/**
 * Escapes characters for RFC 5545 TEXT properties (SUMMARY, DESCRIPTION).
 * Backslash MUST be escaped first, followed by semicolons, commas, and newlines.
 */
export function escapeICSText(text: string): string {
  if (!text) return ''
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

/**
 * Folds a content line to adhere to the RFC 5545 75-octet limit.
 * Continuation lines begin with a single space.
 */
export function foldICSLine(line: string): string {
  const MAX_OCTETS = 75
  if (line.length <= MAX_OCTETS) return line

  let result = ''
  let current = line

  while (current.length > MAX_OCTETS) {
    result += current.slice(0, MAX_OCTETS) + '\r\n '
    current = current.slice(MAX_OCTETS)
  }
  result += current
  return result
}

export function buildICS(plan: Plan): string {
  const fmt = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`

  const events = [
    ...plan.timeline.map((m) => ({
      title: m.label,
      detail: m.detail,
      d: dueDate(plan, m.weeksBefore),
    })),
    {
      title: plan.brief.title || 'The big day',
      detail: 'Event day',
      d: new Date(plan.brief.date + 'T00:00:00'),
    },
  ]

  const body = events
    .map((e) => {
      const end = new Date(e.d)
      end.setDate(end.getDate() + 1)
      const rawLines = [
        'BEGIN:VEVENT',
        `UID:${uid()}@soiree`,
        `DTSTAMP:${fmt(new Date())}T000000Z`,
        `DTSTART;VALUE=DATE:${fmt(e.d)}`,
        `DTEND;VALUE=DATE:${fmt(end)}`,
        `SUMMARY:${escapeICSText(e.title)}`,
        `DESCRIPTION:${escapeICSText(e.detail)}`,
        'END:VEVENT',
      ]
      return rawLines.map(foldICSLine).join('\r\n')
    })
    .join('\r\n')

  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Soiree//EN\r\n${body}\r\nEND:VCALENDAR`
}
