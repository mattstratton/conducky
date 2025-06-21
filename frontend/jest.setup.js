/* eslint-disable no-undef */
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
    message.includes('Warning: findDOMNode is deprecated')
  ) {
    return;
  }
  
  // Allow actual errors through
  originalError.apply(console, args);
};

// Restore original functions after tests if needed
afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
}); 