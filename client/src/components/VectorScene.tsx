import { useEffect, useMemo, useRef, useState } from 'react'
import { SceneGradients } from './scene/SceneGradients'
import { CX, CY, SceneLotus } from './scene/SceneLotus'

function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/**
 * Hand-built animated procedural SVG hero backdrop:
 * glass lotus, gold wire ribbons, pearls, glass shards, petals and light rays.
 */
export function VectorScene({ className = '', mirror = false }: { className?: string; mirror?: boolean }) {
  const ref = useRef<SVGSVGElement>(null)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry?.isIntersecting ?? true)
      },
      { threshold: 0.05 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const { petalsFar, pearls, drift, sparkles, ribbons } = useMemo(() => {
    const r = rng(7)
    const petalsFar = Array.from({ length: 26 }, (_, i) => ({
      id: i,
      x: 560 + r() * 1040,
      y: 40 + r() * 800,
      s: 0.5 + r() * 0.9,
      rot: r() * 360,
      dur: 8 + r() * 9,
      delay: -r() * 12,
      tint: r() > 0.5 ? 'url(#gPetalA)' : 'url(#gPetalB)',
    }))
    const pearls = [
      { x: 880, y: 360, r: 15 },
      { x: 1010, y: 640, r: 11 },
      { x: 1290, y: 300, r: 9 },
      { x: 1400, y: 560, r: 13 },
      { x: 790, y: 560, r: 7 },
      { x: 1230, y: 700, r: 8 },
      { x: 960, y: 250, r: 6 },
      { x: 1490, y: 380, r: 6 },
    ]
    const drift = Array.from({ length: 14 }, (_, i) => ({
      id: i,
      x: 640 + r() * 940,
      y: 60 + r() * 760,
      r: 1.5 + r() * 2.5,
      d: 3 + r() * 5,
      delay: -r() * 6,
    }))
    const sparkles = [
      { x: 1480, y: 700, s: 1 },
      { x: 760, y: 330, s: 0.6 },
      { x: 1330, y: 160, s: 0.7 },
    ]
    const ribbons = Array.from({ length: 7 }, (_, i) => {
      const o = i * 11
      const k = i - 3
      return `M ${640 + k * 14} ${760 - o * 0.4} C ${860 + k * 10} ${470 + o}, ${960} ${800 - o}, ${CX - 30} ${CY + 120 - k * 6} S ${1330 + k * 12} ${180 + o * 1.2}, ${1560} ${380 + k * 18}`
    })
    return { petalsFar, pearls, drift, sparkles, ribbons }
  }, [])

  return (
    <svg
      ref={ref}
      className={`vscene ${className} ${isVisible ? '' : 'is-paused'}`}
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMaxYMid slice"
      role="img"
      aria-label="Animated glass lotus with gold ribbons and drifting petals"
      style={mirror ? { transform: 'scaleX(-1)' } : undefined}
    >
      <SceneGradients />

      <rect width="1600" height="900" fill="url(#gBg)" />

      <g opacity=".16" fill="#8f6f8a" filter="url(#fSoft)">
        <g transform="translate(1270 640) scale(1.6)">
          {[-60, -30, 0, 30, 60].map((a) => (
            <use key={a} href="#petal" transform={`rotate(${a})`} />
          ))}
        </g>
        <g transform="translate(1000 700) scale(1.1)">
          {[-50, -20, 10, 40].map((a) => (
            <use key={a} href="#petalSm" transform={`rotate(${a})`} />
          ))}
        </g>
      </g>

      <g className="v-rays" style={{ mixBlendMode: 'screen' }} filter="url(#fBlur)">
        <polygon points="520,-60 700,-60 1040,900 760,900" fill="url(#gRay)" opacity=".55" />
        <polygon points="760,-60 880,-60 1240,900 1050,900" fill="url(#gRay)" opacity=".4" />
        <polygon points="300,-60 420,-60 640,900 470,900" fill="url(#gRay)" opacity=".35" />
      </g>

      <rect y="690" width="1600" height="210" fill="url(#gFloor)" />
      <ellipse cx={CX} cy="772" rx="360" ry="26" fill="#6b4862" opacity=".16" filter="url(#fShadow)" />
      <circle cx={CX} cy={CY} r="300" fill="url(#gGlow)" className="v-breathe" />

      {/* Gold Wire Ribbons */}
      <g className="v-ribbons">
        {ribbons.map((d, i) => (
          <g key={i}>
            <path
              d={d}
              fill="none"
              stroke="url(#gGold)"
              strokeWidth={i === 3 ? 2.6 : 1.5}
              strokeLinecap="round"
              opacity={i === 3 ? 1 : 0.65}
              className="v-draw"
              style={{ animationDelay: `${i * 0.18}s` }}
              pathLength={1}
            />
            <path
              d={d}
              fill="none"
              stroke="#fff6d8"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeDasharray="90 900"
              className="v-flow"
              style={{ animationDuration: `${7 + i * 1.3}s`, animationDelay: `${-i * 1.1}s` }}
              opacity=".9"
            />
          </g>
        ))}
        <ellipse
          cx={CX}
          cy={CY + 150}
          rx="190"
          ry="60"
          fill="none"
          stroke="#fff"
          strokeOpacity=".7"
          strokeWidth="2"
          className="v-spin"
        />
        <ellipse
          cx={CX}
          cy={CY + 150}
          rx="230"
          ry="82"
          fill="none"
          stroke="url(#gGold)"
          strokeWidth="1.2"
          opacity=".7"
          className="v-spin"
          style={{ animationDirection: 'reverse', animationDuration: '34s' }}
        />
      </g>

      <SceneLotus />

      {/* Pearls */}
      {pearls.map((p, i) => (
        <g
          key={i}
          className="v-float"
          style={{ animationDuration: `${7 + (i % 4) * 2}s`, animationDelay: `${-i * 1.3}s` }}
        >
          <circle cx={p.x} cy={p.y} r={p.r} fill="url(#gPearl)" />
          <circle cx={p.x - p.r * 0.35} cy={p.y - p.r * 0.38} r={p.r * 0.22} fill="#fff" opacity=".95" />
        </g>
      ))}

      {/* Drifting Petals */}
      {petalsFar.map((p) => (
        <g key={p.id} transform={`translate(${p.x} ${p.y})`}>
          <g className="v-petal" style={{ animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }}>
            <use
              href="#fallen"
              transform={`rotate(${p.rot}) scale(${p.s * 1.15})`}
              fill={p.tint}
              stroke="#fff"
              strokeOpacity=".7"
              strokeWidth="1"
              opacity=".92"
            />
          </g>
        </g>
      ))}

      {/* Dust Motes & Sparkles */}
      {drift.map((d) => (
        <circle
          key={d.id}
          cx={d.x}
          cy={d.y}
          r={d.r}
          fill="#fff"
          className="v-twinkle"
          style={{ animationDuration: `${d.d}s`, animationDelay: `${d.delay}s` }}
        />
      ))}
      {sparkles.map((s, i) => (
        <g key={i} transform={`translate(${s.x} ${s.y}) scale(${s.s})`}>
          <use
            href="#spark"
            fill="#fff"
            opacity=".9"
            className="v-twinkle"
            style={{ animationDuration: `${3 + i}s`, animationDelay: `${-i}s` }}
          />
        </g>
      ))}
    </svg>
  )
}
