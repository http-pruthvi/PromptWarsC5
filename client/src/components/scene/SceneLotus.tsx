export const CX = 1130
export const CY = 470

function LotusBackPetals() {
  return (
    <g className="v-breathe" style={{ transformOrigin: '0 0' }}>
      {[-72, -48, -24, 24, 48, 72].map((a) => (
        <use
          key={a}
          href="#petal"
          transform={`rotate(${a}) scale(1.35)`}
          fill="url(#gGlass)"
          stroke="#fff"
          strokeOpacity=".85"
          strokeWidth="1.6"
        />
      ))}
      {[-60, -36, -12, 12, 36, 60].map((a) => (
        <use
          key={a}
          href="#petalSm"
          transform={`rotate(${a}) scale(1.45)`}
          fill="url(#gGlass)"
          stroke="#f3d4d6"
          strokeOpacity=".9"
          strokeWidth="1.3"
        />
      ))}
    </g>
  )
}

function LotusCore() {
  return (
    <>
      <circle cx="0" cy="-96" r="52" fill="url(#gCore)" />
      {Array.from({ length: 14 }, (_, i) => {
        const a = (-70 + i * 10.8) * (Math.PI / 180)
        return (
          <line
            key={i}
            x1="0"
            y1="-84"
            x2={Math.sin(a) * 64}
            y2={-84 - Math.cos(a) * 60}
            stroke="#e9a27f"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        )
      })}
      {Array.from({ length: 14 }, (_, i) => {
        const a = (-70 + i * 10.8) * (Math.PI / 180)
        return <circle key={i} cx={Math.sin(a) * 64} cy={-84 - Math.cos(a) * 60} r="3.2" fill="#f4c9a8" />
      })}
    </>
  )
}

/**
 * Procedural central glass lotus flower with layered translucent petals.
 */
export function SceneLotus() {
  return (
    <g className="v-sway" style={{ transformOrigin: `${CX}px ${CY + 70}px`, animationDuration: '8s' }}>
      <g transform={`translate(${CX} ${CY + 70})`}>
        <LotusBackPetals />
        <LotusCore />
        {[-40, 0, 40].map((a) => (
          <use
            key={a}
            href="#petalSm"
            transform={`rotate(${a}) scale(1.1)`}
            fill="url(#gGlass)"
            stroke="#fff"
            strokeWidth="1.6"
          />
        ))}
      </g>
    </g>
  )
}
