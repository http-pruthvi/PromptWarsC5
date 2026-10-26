/**
 * Shared SVG gradient and filter definitions mounted once at the application root.
 */
export function VectorDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden focusable="false">
      <defs>
        <linearGradient id="vkGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9a7430" />
          <stop offset=".5" stopColor="#f1d992" />
          <stop offset="1" stopColor="#b88c3c" />
        </linearGradient>
        <linearGradient id="vkGlass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".85" />
          <stop offset=".6" stopColor="#f6dfe3" stopOpacity=".35" />
          <stop offset="1" stopColor="#fff" stopOpacity=".6" />
        </linearGradient>
        <linearGradient id="vkPetal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fffaf3" />
          <stop offset="1" stopColor="#efc9cc" />
        </linearGradient>
        <radialGradient id="vkPearl" cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#fff" />
          <stop offset=".55" stopColor="#f7ece4" />
          <stop offset="1" stopColor="#d9bfb4" />
        </radialGradient>
        <radialGradient id="vkCore" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#ff9f7a" />
          <stop offset="1" stopColor="#f6b79a" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  )
}
