module.exports = {
  testMatch: [
    "**/tests/**/*.[jt]s?(x)",
    "**/?(*.)+(spec|test).[tj]s?(x)"
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/generated/"
  ],
  modulePathIgnorePatterns: [
    "<rootDir>/generated/"
  ],
  verbose: true,
  reporters: [
    "default",
    ["jest-ctrf-json-reporter", { outputDir: "ctrf", outputFile: "ctrf-report.json" }]
  ]
}; 