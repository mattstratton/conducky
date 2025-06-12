export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "coverage/**",
      "**/*.config.js",
      "**/*.config.mjs",
      "**/*.test.js",
      "**/*.test.ts",
      "**/*.test.tsx",
      "__mocks__/**",
    ],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {},
  },
  // Add your actual config here, e.g.:
  // {
  //   files: ["**/*.{js,jsx,ts,tsx}"],
  //   ...rules/plugins...
  // }
]; 