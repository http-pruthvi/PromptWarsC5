export type IconName = 'budget' | 'timeline' | 'vendors' | 'ideas' | 'chat' | 'export'

const ICONS: Record<IconName, string[]> = {
  budget: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z', 'M8.5 7.5h7', 'M8.5 11h7', 'M9 7.5c4.5 0 4.5 5 0 5h-.5l6.5 5.5'],
  timeline: [
    'M6.5 5h11A3 3 0 0 1 20.5 8v9a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z',
    'M8 3v4',
    'M16 3v4',
    'M3.5 10h17',
    'M8.5 15l2.5 2.5L16 13',
  ],
  vendors: [
    'M4 9l1.5-5h13L20 9',
    'M4 9c0 2 3 2 4 0 1 2 3 2 4 0 1 2 3 2 4 0 1 2 4 2 4 0',
    'M5.5 11.5V20h13v-8.5',
    'M10 20v-5h4v5',
  ],
  ideas: ['M5 19L15 9', 'M13.5 7.5l3 3', 'M17.5 3v4', 'M15.5 5h4', 'M20 11v3', 'M18.5 12.5h3'],
  chat: [
    'M6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4A2.5 2.5 0 0 1 4 13.5v-7A2.5 2.5 0 0 1 6.5 4Z',
    'M12 13.2c-2.2-1.5-3-2.5-3-3.6 0-1 .8-1.6 1.6-1.6.6 0 1.1.3 1.4.9.3-.6.8-.9 1.4-.9.8 0 1.6.6 1.6 1.6 0 1.1-.8 2.1-3 3.6Z',
  ],
  export: [
    'M6 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',
    'M18 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',
    'M18 15.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',
    'M8.2 10.8l7.6-3.6',
    'M8.2 13.2l7.6 3.6',
  ],
}

/**
 * Line icon that draws itself sequentially on hover or focus.
 */
export function FeatureIcon({ name, size = 28 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="draw-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {ICONS[name].map((d, i) => (
        <path key={i} d={d} pathLength={1} style={{ animationDelay: `${i * 0.08}s` }} />
      ))}
    </svg>
  )
}
