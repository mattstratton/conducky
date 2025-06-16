module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ["**/tests/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[tj]s?(x)"],
  testPathIgnorePatterns: ["/node_modules/", "/generated/", "/dist/"],
  modulePathIgnorePatterns: ["<rootDir>/generated/", "<rootDir>/dist/"],
  verbose: true,
  setupFiles: ["<rootDir>/jest.setup.js"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
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
