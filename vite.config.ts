import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [viteReact(), tailwindcss(), viteTsConfigPaths()],
  server: { host: "::", port: 8080 },
});
