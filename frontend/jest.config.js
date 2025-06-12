module.exports = {
  testEnvironment: "jsdom",
  moduleNameMapper: {
    // Handle CSS imports (with CSS modules)
    "^.+\\.(css|scss|sass)$": "identity-obj-proxy",
    // Handle static assets
    "^.+\\.(jpg|jpeg|png|gif|webp|svg)$": "<rootDir>/__mocks__/fileMock.js",
  },
  setupFilesAfterEnv: ["@testing-library/jest-dom"],
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
  },
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
  reporters: [
    "default",
    [
      "jest-ctrf-json-reporter",
      { outputDir: "ctrf", outputFile: "ctrf-report.json" },
    ],
  ],
};
