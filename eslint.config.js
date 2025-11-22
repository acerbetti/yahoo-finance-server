import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: "./tsconfig.json",
      },
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        global: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      import: importPlugin,
    },
    rules: {
      // Disable base ESLint rules that are handled by TypeScript ESLint
      "no-unused-vars": "off",
      // Import sorting
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
      // Allow console.log in development
      "no-console": "off",
      // Allow unused variables that start with underscore
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      // Allow explicit any in some cases (common in dynamic APIs)
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow require statements in config files
      "@typescript-eslint/no-var-requires": "off",
      // Allow non-null assertions when necessary
      "@typescript-eslint/no-non-null-assertion": "warn",
      // Allow explicit return types on exports
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      // Allow async functions without await (for API handlers)
      "@typescript-eslint/require-await": "off",
    },
  },
  {
    ignores: [
      "dist/",
      "node_modules/",
      "*.js",
      "*.config.js",
      "jest.config.js",
      "coverage/",
      "*.log",
    ],
  },
];
