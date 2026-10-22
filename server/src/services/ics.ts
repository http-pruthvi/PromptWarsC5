import type { Plan } from '@soiree/shared'
import { uid } from './generator.js'

function addDays(dateStr: string, days: number): Date {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d
}

const dueDate = (plan: Plan, weeksBefore: number) => addDays(plan.brief.date, -Math.round(weeksBefore * 7))

export function buildICS(plan: Plan): string {
  const fmt = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`

  const esc = (s: string) => (s || '').replace(/[,;\\]/g, (m) => '\\' + m).replace(/\n/g, '\\n')

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
      return [
        'BEGIN:VEVENT',
        `UID:${uid()}@soiree`,
        `DTSTAMP:${fmt(new Date())}T000000Z`,
        `DTSTART;VALUE=DATE:${fmt(e.d)}`,
        `DTEND;VALUE=DATE:${fmt(end)}`,
        `SUMMARY:${esc(e.title)}`,
        `DESCRIPTION:${esc(e.detail)}`,
        'END:VEVENT',
      ].join('\r\n')
    })
    .join('\r\n')

  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Soiree//EN\r\n${body}\r\nEND:VCALENDAR`
}
