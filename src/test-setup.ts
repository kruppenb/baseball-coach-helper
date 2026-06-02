// Polyfill ResizeObserver for dnd-kit in jsdom
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
