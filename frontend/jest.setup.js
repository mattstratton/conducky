/* eslint-disable no-undef */
// Add fetch polyfill for test environment
import 'whatwg-fetch';

// Mock fetch for tests that don't need real network calls
global.fetch = jest.fn();

// Polyfill ResizeObserver for tests (used by Radix UI components)
class ResizeObserver {
  callback;
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof global.ResizeObserver === 'undefined') {
  // @ts-ignore
  global.ResizeObserver = ResizeObserver;
}

// Suppress specific console warnings during tests while preserving errors
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args) => {
  const message = args.join(' ');
  
  // Suppress known React warnings that are not actionable in tests
  if (
    message.includes('Your app (or one of its dependencies) is using an outdated JSX transform') ||
    message.includes('Missing `Description` or `aria-describedby={undefined}` for {DialogContent}') ||
    message.includes('validateDOMNesting') ||
    message.includes('useLayoutEffect does nothing on the server')
  ) {
    return;
  }
  
  // Allow other warnings through
  originalWarn.apply(console, args);
};

console.error = (...args) => {
  const message = args.join(' ');
  
  // Suppress known React DOM warnings that are not actionable in tests
  if (
    message.includes('React does not recognize the `asChild` prop on a DOM element') ||
    message.includes('Warning: ReactDOM.render is no longer supported') ||
    message.includes('Warning: findDOMNode is deprecated') ||
    message.includes('Error checking OAuth providers: ReferenceError: fetch is not defined')
  ) {
    return;
  }
  
  // Allow actual errors through
  originalError.apply(console, args);
};

// Reset fetch mock before each test
beforeEach(() => {
  if (jest.isMockFunction(global.fetch)) {
    global.fetch.mockClear();
  }
});

// Restore original functions after tests if needed
afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
}); 