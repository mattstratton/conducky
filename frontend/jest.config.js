/* eslint-disable no-undef */
module.exports = {
  testEnvironment: "jsdom",
  moduleNameMapper: {
    // Handle CSS imports (with CSS modules)
    "^.+\\.(css|scss|sass)$": "identity-obj-proxy",
    // Handle static assets
    "^.+\\.(jpg|jpeg|png|gif|webp|svg)$": "<rootDir>/__mocks__/fileMock.js",
    "^@/(.*)$": "<rootDir>/$1",
    // Mock react-markdown and related packages
    "^react-markdown$": "<rootDir>/__mocks__/react-markdown.js",
  },
  setupFilesAfterEnv: ["@testing-library/jest-dom", "<rootDir>/jest.setup.js"],
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
  },
  transformIgnorePatterns: [
    "node_modules/"
  ],
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
  reporters: [
    "default",
    [
      "jest-ctrf-json-reporter",
      { outputDir: "ctrf", outputFile: "ctrf-report.json" },
    ],
  ],
};
