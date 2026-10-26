import type { EventType } from '@soiree/shared'

const GOLD = 'url(#vkGold)'

/**
 * Illustrated vector vignettes for occasion card representations.
 */
export function OccasionArt({ type }: { type: EventType }) {
  if (type === 'wedding') {
    return (
      <svg className="art art-wedding" viewBox="0 0 220 220" fill="none" aria-hidden>
        <g className="ring ring-a">
          <circle cx="84" cy="130" r="42" stroke={GOLD} strokeWidth="4" />
          <circle cx="84" cy="130" r="34" stroke="#fff" strokeOpacity=".6" strokeWidth="1.2" />
        </g>
        <g className="ring ring-b">
          <circle cx="136" cy="130" r="42" stroke="#5b3f55" strokeWidth="3" />
          <circle cx="136" cy="130" r="34" stroke="#fff" strokeOpacity=".6" strokeWidth="1.2" />
        </g>
        <g className="gem">
          <polygon points="110,66 123,82 110,102 97,82" fill="url(#vkGlass)" stroke="#5b3f55" strokeWidth="2" />
          <path d="M97 82h26M110 66l-6 16 6 20 6-20z" stroke="#5b3f55" strokeWidth="1" opacity=".6" />
        </g>
        <g stroke={GOLD} strokeWidth="2" strokeLinecap="round" className="rays">
          <path d="M110 44v10M86 52l6 8M134 52l-6 8M70 70l8 4M150 70l-8 4" />
        </g>
      </svg>
    )
  }

  if (type === 'birthday') {
    const balloons = [
      { x: 62, y: 98, c: '#e8a9b3', cls: 'b1' },
      { x: 112, y: 76, c: '#f1d28a', cls: 'b2' },
      { x: 162, y: 104, c: '#b8a0cf', cls: 'b3' },
    ]
    return (
      <svg className="art art-birthday" viewBox="0 0 220 220" fill="none" aria-hidden>
        {balloons.map((x) => (
          <g key={x.cls} className={`balloon ${x.cls}`}>
            <path
              d={`M${x.x} ${x.y + 38} C ${x.x - 10} ${x.y + 80}, ${x.x + 12} ${x.y + 110}, ${x.x} ${x.y + 140}`}
              stroke="#5b3f55"
              strokeWidth="1.5"
              strokeOpacity=".6"
            />
            <ellipse cx={x.x} cy={x.y} rx="30" ry="37" fill={x.c} fillOpacity=".75" stroke="#5b3f55" strokeWidth="2" />
            <path
              d={`M${x.x - 14} ${x.y - 18} C ${x.x - 20} ${x.y - 8}, ${x.x - 20} ${x.y + 4}, ${x.x - 16} ${x.y + 10}`}
              stroke="#fff"
              strokeWidth="3"
              strokeLinecap="round"
              opacity=".7"
            />
            <path d={`M${x.x - 5} ${x.y + 38} h10 l-5 7z`} fill="#5b3f55" />
          </g>
        ))}
        <g className="confetti" fill={GOLD}>
          {[
            [30, 40],
            [188, 50],
            [200, 160],
            [20, 150],
            [96, 30],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={3 + (i % 2)} />
          ))}
        </g>
      </svg>
    )
  }

  const dots = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2
    return [110 + Math.cos(a) * 64, 110 + Math.sin(a) * 64] as const
  })

  return (
    <svg className="art art-community" viewBox="0 0 220 220" fill="none" aria-hidden>
      <g className="orbit-art">
        <circle cx="110" cy="110" r="64" stroke={GOLD} strokeWidth="1.6" strokeDasharray="3 7" />
        {dots.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y - 7} r="7" fill="#fff" fillOpacity=".7" stroke="#5b3f55" strokeWidth="2" />
            <path
              d={`M${x - 11} ${y + 14} c0 -10 6 -14 11 -14 s11 4 11 14`}
              stroke="#5b3f55"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        ))}
      </g>
      <g className="heart">
        <path
          d="M110 128c-22-14-30-24-30-34 0-9 7-15 15-15 6 0 12 3 15 10 3-7 9-10 15-10 8 0 15 6 15 15 0 10-8 20-30 34Z"
          fill="url(#vkPetal)"
          stroke="#5b3f55"
          strokeWidth="2.2"
        />
      </g>
    </svg>
  )
}
