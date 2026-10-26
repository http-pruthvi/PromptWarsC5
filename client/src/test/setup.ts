import '@testing-library/jest-dom'

class MockIntersectionObserver {
  observe() {}
  disconnect() {}
  unobserve() {}
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
})
Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
})

class MockResizeObserver {
  observe() {}
  disconnect() {}
  unobserve() {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
})
Object.defineProperty(global, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
})

const matchMediaMock = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {
    return false
  },
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: matchMediaMock,
})
Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  configurable: true,
  value: matchMediaMock,
})

window.scrollTo = () => {}
window.HTMLElement.prototype.scrollIntoView = () => {}

HTMLCanvasElement.prototype.getContext = (() => ({
  fillRect() {},
  clearRect() {},
  beginPath() {},
  moveTo() {},
  lineTo() {},
  arc() {},
  fill() {},
  stroke() {},
  save() {},
  restore() {},
})) as unknown as typeof HTMLCanvasElement.prototype.getContext
