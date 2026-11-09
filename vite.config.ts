import path from "path";
import fs from "fs";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin } from "vite";

// Writes sw.js after the build with the exact list of built files, so the app opens offline.
function offlineWorker(): Plugin {
  return {
    name: "offline-worker",
    apply: "build",
    closeBundle() {
      const dist = path.resolve(__dirname, "dist");
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, e.name);
          if (e.isDirectory()) walk(p);
          else if (e.name !== "sw.js") files.push("./" + path.relative(dist, p).split(path.sep).join("/"));
        }
      };
      walk(dist);
      const version = Date.now().toString(36);
      const tpl = fs.readFileSync(path.resolve(__dirname, "public-sw.js"), "utf8");
      fs.writeFileSync(path.join(dist, "sw.js"), tpl.replace("__VERSION__", version).replace("__FILES__", JSON.stringify(["./", ...files])));
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), offlineWorker()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  build: { chunkSizeWarningLimit: 1500 },
});
