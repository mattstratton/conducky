module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ["**/tests/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[tj]s?(x)"],
  testPathIgnorePatterns: ["/node_modules/", "/generated/", "/dist/"],
  modulePathIgnorePatterns: ["<rootDir>/generated/", "<rootDir>/dist/"],
  verbose: true,
  setupFiles: ["<rootDir>/jest.setup.js"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  globalTeardown: "<rootDir>/jest.teardown.js",
  // Force Jest to exit after tests complete
  forceExit: true,
  // Detect open handles to help debug hanging tests
  detectOpenHandles: true,
  // Set a global timeout to prevent infinite hanging
  testTimeout: 30000,
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  // Prisma 7 generates the client into src/generated/prisma. Keep every test on the
  // shared in-memory mock, as the old __mocks__/@prisma/client auto-mock did.
  moduleNameMapper: {
    '^@prisma/client$': '<rootDir>/__mocks__/@prisma/client.js',
    '(^|/)generated/prisma/client$': '<rootDir>/__mocks__/@prisma/client.js',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/generated/**',
  ],
  reporters: [
    "default",
    [
      "jest-ctrf-json-reporter",
      { outputDir: "ctrf", outputFile: "ctrf-report.json" },
    ],
  ],
};
