import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  reactPlugin.configs.flat.recommended,
  reactHooks.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.base.json"],
        tsconfigRootDir: new URL(".", import.meta.url).pathname
      }
    },
    settings: { react: { version: "detect" } },
    rules: {
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off"
    }
  }
];
