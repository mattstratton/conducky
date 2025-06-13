// Global test declarations for Jest
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const jest: any;
declare const describe: (description: string, callback: () => void) => void;
declare const it: (description: string, callback: (() => void) | (() => Promise<void>)) => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const expect: any;
declare const beforeEach: (callback: () => void) => void;
declare const afterEach: (callback: () => void) => void;

// Extend global for tests
interface Global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetch: any;
}

// User related types used in tests
interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
} 