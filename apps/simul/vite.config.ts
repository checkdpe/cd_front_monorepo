import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "serve" ? "/" : "/simul/",
  publicDir: resolve(__dirname, "../../assets/images"),
  resolve: {
    alias: {
      "@acme/chainlit-client": resolve(__dirname, "../../packages/chainlit-client/src/index.ts"),
      "@acme/chainlit": resolve(__dirname, "../../packages/chainlit/src/index.ts"),
      "@acme/dpe-editor": resolve(__dirname, "../../packages/dpe-editor/src/index.ts"),
      "@acme/template-editor": resolve(__dirname, "../../packages/template-editor/src/index.ts"),
    },
  },
}));


