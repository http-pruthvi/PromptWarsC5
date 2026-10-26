import { motion } from 'framer-motion'
export { Parallax } from './Parallax.js'

const GOLD = 'url(#vkGold)'
const PETAL_S = 'M0 0 C -24 -26 -26 -76 0 -108 C 26 -76 24 -26 0 0 Z'

/**
 * Animated ornamental divider rules.
 */
function OrnamentLotus() {
  return (
    <motion.g
      transform="translate(300 40)"
      variants={{
        hide: { scale: 0, opacity: 0 },
        show: { scale: 1, opacity: 1, transition: { delay: 0.5, type: 'spring', stiffness: 160, damping: 14 } },
      }}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    >
      {[-60, -30, 0, 30, 60].map((a) => (
        <path
          key={a}
          d={PETAL_S}
          transform={`rotate(${a}) scale(.2)`}
          fill="url(#vkPetal)"
          stroke={GOLD}
          strokeWidth="4"
        />
      ))}
    </motion.g>
  )
}

/**
 * Animated ornamental divider rules.
 */
export function SectionOrnament() {
  const lineVariants = {
    hide: { pathLength: 0 },
    show: { pathLength: 1, transition: { duration: 1.6, ease: [0.22, 1, 0.36, 1] } },
  }

  return (
    <div className="ornament" aria-hidden>
      <motion.svg viewBox="0 0 600 50" initial="hide" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
        <motion.path
          d="M284 33 H 20 C 6 33 0 26 0 20"
          stroke={GOLD}
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
          variants={lineVariants}
        />
        <motion.path
          d="M316 33 H 580 C 594 33 600 26 600 20"
          stroke={GOLD}
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
          variants={lineVariants}
        />
        <OrnamentLotus />
      </motion.svg>
    </div>
  )
}

/**
 * Floral corner accent drawing into card boundaries.
 */
export function FloralCorner({ pos = 'tr', size = 120 }: { pos?: 'tr' | 'tl' | 'br' | 'bl'; size?: number }) {
  const leaves: Array<[number, number, number]> = [
    [96, 22, -50],
    [78, 40, 10],
    [58, 54, -45],
    [38, 78, 15],
    [20, 98, -40],
  ]
  return (
    <motion.svg
      className={`corner corner-${pos}`}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden
      initial="hide"
      whileInView="show"
      viewport={{ once: true, margin: '-40px' }}
    >
      <motion.path
        d="M116 4 C 98 20, 88 40, 66 52 S 28 82, 6 116"
        stroke={GOLD}
        strokeWidth="1.6"
        strokeLinecap="round"
        variants={{
          hide: { pathLength: 0 },
          show: { pathLength: 1, transition: { duration: 1.6, ease: [0.22, 1, 0.36, 1] } },
        }}
      />
      {leaves.map(([x, y, r], i) => (
        <motion.path
          key={i}
          d="M0 0 C 7 -6 15 -6 20 0 C 15 6 7 6 0 0 Z"
          transform={`translate(${x} ${y}) rotate(${r})`}
          fill={i % 2 ? '#ecc9cd' : '#e3cf9a'}
          stroke="#b58a3c"
          strokeWidth=".7"
          variants={{
            hide: { opacity: 0, scale: 0 },
            show: { opacity: 1, scale: 1, transition: { delay: 0.5 + i * 0.15, duration: 0.6 } },
          }}
          style={{ transformBox: 'fill-box', transformOrigin: 'left center' }}
        />
      ))}
      <motion.circle
        cx="116"
        cy="4"
        r="4"
        fill="url(#vkPearl)"
        variants={{ hide: { scale: 0 }, show: { scale: 1, transition: { delay: 1.4, type: 'spring' } } }}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
    </motion.svg>
  )
}

/**
 * Botanical floral sprig ornament.
 */
export function Sprig({ size = 170 }: { size?: number }) {
  const leaves: Array<[number, number, number, number]> = [
    [78, 205, -40, 1],
    [82, 170, 220, 1],
    [76, 135, -35, 0.95],
    [80, 102, 215, 0.9],
    [72, 70, -30, 0.8],
    [78, 40, 210, 0.7],
  ]
  return (
    <motion.svg
      width={size}
      height={size * 1.6}
      viewBox="0 0 160 256"
      fill="none"
      initial="hide"
      whileInView="show"
      viewport={{ once: true, margin: '-50px' }}
    >
      <motion.path
        d="M80 255 C 70 200, 95 150, 78 100 S 70 30, 82 5"
        stroke={GOLD}
        strokeWidth="2"
        strokeLinecap="round"
        variants={{
          hide: { pathLength: 0 },
          show: { pathLength: 1, transition: { duration: 2, ease: [0.22, 1, 0.36, 1] } },
        }}
      />
      {leaves.map(([x, y, r, s], i) => (
        <motion.path
          key={i}
          d="M0 0 C 14 -12 34 -12 44 0 C 34 12 14 12 0 0 Z"
          transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}
          fill={i % 2 ? 'url(#vkPetal)' : '#e6d4a2'}
          stroke="#b58a3c"
          strokeWidth="1"
          variants={{
            hide: { opacity: 0, scale: 0 },
            show: { opacity: 0.95, scale: s, transition: { delay: 0.4 + i * 0.18, duration: 0.7 } },
          }}
          style={{ transformBox: 'fill-box', transformOrigin: 'left center' }}
        />
      ))}
      <motion.circle
        cx="82"
        cy="5"
        r="6"
        fill="url(#vkPearl)"
        variants={{ hide: { scale: 0 }, show: { scale: 1, transition: { delay: 1.6, type: 'spring' } } }}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
    </motion.svg>
  )
}

const PEARL_COORDS: Array<[number, number, number]> = [
  [40, 70, 26],
  [82, 44, 16],
  [86, 90, 11],
  [24, 24, 8],
]

/**
 * Pearl cluster ornament with gentle bobbing motion.
 */
export function Pearls({ size = 120 }: { size?: number | undefined }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden>
      {PEARL_COORDS.map(([x, y, r], i) => (
        <g key={i} className="v-bob" style={{ animationDelay: `${-i * 1.4}s` }}>
          <circle cx={x} cy={y} r={r} fill="url(#vkPearl)" />
          <circle cx={x - r * 0.35} cy={y - r * 0.38} r={r * 0.22} fill="#fff" />
        </g>
      ))}
    </svg>
  )
}

/**
 * Gilded sparkle star vector.
 */
export function Sparkle({ size = 46 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-24 -24 48 48" aria-hidden>
      <path
        className="v-twinkle-star"
        d="M0 -22 C 2 -6 6 -2 22 0 C 6 2 2 6 0 22 C -2 6 -6 2 -22 0 C -6 -2 -2 -6 0 -22 Z"
        fill={GOLD}
      />
    </svg>
  )
}
