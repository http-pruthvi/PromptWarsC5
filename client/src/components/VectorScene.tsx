import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Hand-built animated procedural SVG hero backdrop:
 * glass lotus, gold wire ribbons, pearls, glass shards, petals and light rays.
 * Pure vector: resolution independent and lightweight.
 */

// Small seeded PRNG so the scene is identical on every render.
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const CX = 1130 // lotus centre
const CY = 470

export function VectorScene({ className = '', mirror = false }: { className?: string; mirror?: boolean }) {
  const ref = useRef<SVGSVGElement>(null)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(([entry]) => {
      setIsVisible(entry?.isIntersecting ?? true)
    }, { threshold: 0.05 })
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
      { x: 880, y: 360, r: 15 }, { x: 1010, y: 640, r: 11 }, { x: 1290, y: 300, r: 9 },
      { x: 1400, y: 560, r: 13 }, { x: 790, y: 560, r: 7 }, { x: 1230, y: 700, r: 8 },
      { x: 960, y: 250, r: 6 }, { x: 1490, y: 380, r: 6 },
    ]
    const drift = Array.from({ length: 14 }, (_, i) => ({ id: i, x: 640 + r() * 940, y: 60 + r() * 760, r: 1.5 + r() * 2.5, d: 3 + r() * 5, delay: -r() * 6 }))
    const sparkles = [{ x: 1480, y: 700, s: 1 }, { x: 760, y: 330, s: 0.6 }, { x: 1330, y: 160, s: 0.7 }]
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
      <defs>
        <linearGradient id="gBg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f6eee3" />
          <stop offset=".38" stopColor="#f1e1d8" />
          <stop offset=".72" stopColor="#e2c6cc" />
          <stop offset="1" stopColor="#c9a9bf" />
        </linearGradient>
        <linearGradient id="gFloor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff6e8" stopOpacity=".75" />
        </linearGradient>
        <linearGradient id="gRay" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffaf0" stopOpacity=".85" />
          <stop offset="1" stopColor="#fffaf0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9a7430" />
          <stop offset=".45" stopColor="#f1d992" />
          <stop offset="1" stopColor="#b88c3c" />
        </linearGradient>
        <linearGradient id="gGlass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".78" />
          <stop offset=".55" stopColor="#f6dfe3" stopOpacity=".28" />
          <stop offset="1" stopColor="#ffffff" stopOpacity=".55" />
        </linearGradient>
        <linearGradient id="gShard" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset="1" stopColor="#fff" stopOpacity=".05" />
        </linearGradient>
        <linearGradient id="gPetalA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fffaf3" />
          <stop offset="1" stopColor="#f2d4d3" />
        </linearGradient>
        <linearGradient id="gPetalB" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#ecc6cb" />
        </linearGradient>
        <radialGradient id="gPearl" cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".5" stopColor="#f7ece4" />
          <stop offset="1" stopColor="#d9bfb4" />
        </radialGradient>
        <radialGradient id="gCore" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#ff9f7a" />
          <stop offset=".6" stopColor="#f6b79a" stopOpacity=".7" />
          <stop offset="1" stopColor="#f6b79a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="gGlow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#fff" stopOpacity=".65" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id="fBlur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14" /></filter>
        <filter id="fSoft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2" /></filter>
        <filter id="fShadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="18" /></filter>

        {/* one lotus petal pointing up from the origin */}
        <path id="petal" d="M0 0 C -34 -34 -38 -104 0 -150 C 38 -104 34 -34 0 0 Z" />
        <path id="petalSm" d="M0 0 C -24 -26 -26 -76 0 -108 C 26 -76 24 -26 0 0 Z" />
        <path id="fallen" d="M0 0 C 10 -10 26 -10 32 2 C 24 16 8 16 0 0 Z" />
        <path id="spark" d="M0 -22 C 2 -6 6 -2 22 0 C 6 2 2 6 0 22 C -2 6 -6 2 -22 0 C -6 -2 -2 -6 0 -22 Z" />
      </defs>

      {/* backdrop */}
      <rect width="1600" height="900" fill="url(#gBg)" />

      {/* ghost flower silhouettes behind */}
      <g opacity=".16" fill="#8f6f8a" filter="url(#fSoft)">
        <g transform="translate(1270 640) scale(1.6)">
          {[-60, -30, 0, 30, 60].map((a) => <use key={a} href="#petal" transform={`rotate(${a})`} />)}
        </g>
        <g transform="translate(1000 700) scale(1.1)">
          {[-50, -20, 10, 40].map((a) => <use key={a} href="#petalSm" transform={`rotate(${a})`} />)}
        </g>
      </g>

      {/* soft light rays */}
      <g className="v-rays" style={{ mixBlendMode: 'screen' }} filter="url(#fBlur)">
        <polygon points="520,-60 700,-60 1040,900 760,900" fill="url(#gRay)" opacity=".55" />
        <polygon points="760,-60 880,-60 1240,900 1050,900" fill="url(#gRay)" opacity=".4" />
        <polygon points="300,-60 420,-60 640,900 470,900" fill="url(#gRay)" opacity=".35" />
      </g>

      {/* floor */}
      <rect y="690" width="1600" height="210" fill="url(#gFloor)" />
      <ellipse cx={CX} cy="772" rx="360" ry="26" fill="#6b4862" opacity=".16" filter="url(#fShadow)" />

      {/* glow behind lotus */}
      <circle cx={CX} cy={CY} r="300" fill="url(#gGlow)" className="v-breathe" />

      {/* glass shards */}
      <g>
        <g className="v-float" style={{ animationDuration: '12s' }}>
          <polygon points="1370,170 1600,110 1600,260 1420,300" fill="url(#gShard)" stroke="#fff" strokeOpacity=".5" strokeWidth="1.5" />
        </g>
        <g className="v-float" style={{ animationDuration: '10s', animationDelay: '-3s' }}>
          <path d="M 800 400 Q 880 350 960 372 L 940 392 Q 880 380 820 420 Z" fill="url(#gShard)" stroke="#fff" strokeOpacity=".7" strokeWidth="1.5" />
        </g>
        <g className="v-float" style={{ animationDuration: '14s', animationDelay: '-6s' }}>
          <path d="M 1120 760 L 1210 700 Q 1240 690 1250 720 L 1170 790 Z" fill="url(#gShard)" stroke="#fff" strokeOpacity=".6" strokeWidth="1.5" />
        </g>
        <g className="v-float" style={{ animationDuration: '11s', animationDelay: '-2s' }}>
          <path d="M 1000 160 Q 1100 80 1210 120 Q 1120 130 1040 200 Z" fill="url(#gShard)" stroke="#fff" strokeOpacity=".55" strokeWidth="1.5" />
        </g>
      </g>

      {/* soft silk ribbon */}
      <g className="v-sway" style={{ animationDuration: '9s' }}>
        <path d="M 700 760 C 820 640 930 800 1060 690 C 1150 620 1240 700 1330 640 C 1250 760 1130 760 1040 800 C 930 850 800 800 700 760 Z" fill="#f8e6e3" opacity=".78" filter="url(#fSoft)" />
        <path d="M 700 760 C 820 640 930 800 1060 690" fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="2" />
      </g>

      {/* GOLD WIRE RIBBONS */}
      <g className="v-ribbons">
        {ribbons.map((d, i) => (
          <g key={i}>
            <path d={d} fill="none" stroke="url(#gGold)" strokeWidth={i === 3 ? 2.6 : 1.5} strokeLinecap="round" opacity={i === 3 ? 1 : 0.65} className="v-draw" style={{ animationDelay: `${i * 0.18}s` }} pathLength={1} />
            <path d={d} fill="none" stroke="#fff6d8" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="90 900" className="v-flow" style={{ animationDuration: `${7 + i * 1.3}s`, animationDelay: `${-i * 1.1}s` }} opacity=".9" />
          </g>
        ))}
        <ellipse cx={CX} cy={CY + 150} rx="190" ry="60" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="2" className="v-spin" />
        <ellipse cx={CX} cy={CY + 150} rx="230" ry="82" fill="none" stroke="url(#gGold)" strokeWidth="1.2" opacity=".7" className="v-spin" style={{ animationDirection: 'reverse', animationDuration: '34s' }} />
      </g>

      {/* GLASS LOTUS */}
      <g className="v-sway" style={{ transformOrigin: `${CX}px ${CY + 70}px`, animationDuration: '8s' }}>
        <g transform={`translate(${CX} ${CY + 70})`}>
          {/* back petals */}
          <g className="v-breathe" style={{ transformOrigin: '0 0' }}>
            {[-72, -48, -24, 24, 48, 72].map((a) => (
              <use key={a} href="#petal" transform={`rotate(${a}) scale(1.35)`} fill="url(#gGlass)" stroke="#fff" strokeOpacity=".85" strokeWidth="1.6" />
            ))}
            {[-60, -36, -12, 12, 36, 60].map((a) => (
              <use key={a} href="#petalSm" transform={`rotate(${a}) scale(1.45)`} fill="url(#gGlass)" stroke="#f3d4d6" strokeOpacity=".9" strokeWidth="1.3" />
            ))}
          </g>
          {/* core */}
          <circle cx="0" cy="-96" r="52" fill="url(#gCore)" />
          {Array.from({ length: 14 }, (_, i) => {
            const a = (-70 + i * 10.8) * (Math.PI / 180)
            return <line key={i} x1="0" y1="-84" x2={Math.sin(a) * 64} y2={-84 - Math.cos(a) * 60} stroke="#e9a27f" strokeWidth="1.6" strokeLinecap="round" />
          })}
          {Array.from({ length: 14 }, (_, i) => {
            const a = (-70 + i * 10.8) * (Math.PI / 180)
            return <circle key={i} cx={Math.sin(a) * 64} cy={-84 - Math.cos(a) * 60} r="3.2" fill="#f4c9a8" />
          })}
          {/* front petals */}
          {[-40, 0, 40].map((a) => (
            <use key={a} href="#petalSm" transform={`rotate(${a}) scale(1.1)`} fill="url(#gGlass)" stroke="#fff" strokeOpacity=".95" strokeWidth="1.6" />
          ))}
        </g>
      </g>

      {/* PEARLS */}
      {pearls.map((p, i) => (
        <g key={i} className="v-float" style={{ animationDuration: `${7 + (i % 4) * 2}s`, animationDelay: `${-i * 1.3}s` }}>
          <circle cx={p.x} cy={p.y} r={p.r} fill="url(#gPearl)" />
          <circle cx={p.x - p.r * 0.35} cy={p.y - p.r * 0.38} r={p.r * 0.22} fill="#fff" opacity=".95" />
        </g>
      ))}

      {/* FALLING / DRIFTING PETALS */}
      {petalsFar.map((p) => (
        <g key={p.id} transform={`translate(${p.x} ${p.y})`}>
          <g className="v-petal" style={{ animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }}>
            <use href="#fallen" transform={`rotate(${p.rot}) scale(${p.s * 1.15})`} fill={p.tint} stroke="#fff" strokeOpacity=".7" strokeWidth="1" opacity=".92" />
          </g>
        </g>
      ))}

      {/* dust motes */}
      {drift.map((d) => (
        <circle key={d.id} cx={d.x} cy={d.y} r={d.r} fill="#fff" className="v-twinkle" style={{ animationDuration: `${d.d}s`, animationDelay: `${d.delay}s` }} />
      ))}

      {/* sparkles */}
      {sparkles.map((s, i) => (
        <g key={i} transform={`translate(${s.x} ${s.y}) scale(${s.s})`}>
          <use href="#spark" fill="#fff" opacity=".9" className="v-twinkle" style={{ animationDuration: `${3 + i}s`, animationDelay: `${-i}s` }} />
        </g>
      ))}
    </svg>
  )
}
