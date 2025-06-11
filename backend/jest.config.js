module.exports = {
  testMatch: ["**/tests/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[tj]s?(x)"],
  testPathIgnorePatterns: ["/node_modules/", "/generated/"],
  modulePathIgnorePatterns: ["<rootDir>/generated/"],
  verbose: true,
  setupFiles: ["<rootDir>/jest.setup.js"],
  reporters: [
    "default",
    [
      "jest-ctrf-json-reporter",
      { outputDir: "ctrf", outputFile: "ctrf-report.json" },
    ],
  ],
};
