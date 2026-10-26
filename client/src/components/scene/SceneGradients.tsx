function SceneBackgroundGradients() {
  return (
    <>
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
    </>
  )
}

function ScenePetalGradients() {
  return (
    <>
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
    </>
  )
}

function SceneRadialGradients() {
  return (
    <>
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
    </>
  )
}

function SceneFiltersAndPaths() {
  return (
    <>
      <filter id="fBlur" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="14" />
      </filter>
      <filter id="fSoft" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2.2" />
      </filter>
      <filter id="fShadow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="18" />
      </filter>

      <path id="petal" d="M0 0 C -34 -34 -38 -104 0 -150 C 38 -104 34 -34 0 0 Z" />
      <path id="petalSm" d="M0 0 C -24 -26 -26 -76 0 -108 C 26 -76 24 -26 0 0 Z" />
      <path id="fallen" d="M0 0 C 10 -10 26 -10 32 2 C 24 16 8 16 0 0 Z" />
      <path id="spark" d="M0 -22 C 2 -6 6 -2 22 0 C 6 2 2 6 0 22 C -2 6 -6 2 -22 0 C -6 -2 -2 -6 0 -22 Z" />
    </>
  )
}

/**
 * SVG defs, gradients, and filters for the hero vector backdrop.
 */
export function SceneGradients() {
  return (
    <defs>
      <SceneBackgroundGradients />
      <ScenePetalGradients />
      <SceneRadialGradients />
      <SceneFiltersAndPaths />
    </defs>
  )
}
