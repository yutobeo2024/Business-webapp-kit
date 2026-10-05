import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** Tên ứng dụng trong <title> lấy từ brand.json ngay lúc build, để tab trình duyệt đúng tên trước khi JS chạy. */
function brandTitle(): Plugin {
  return {
    name: "brand-title",
    transformIndexHtml(html) {
      const brand = JSON.parse(readFileSync(new URL("./brand.json", import.meta.url), "utf8")) as {
        name: string;
      };
      return html.replace("%BRAND_NAME%", escapeHtml(brand.name));
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), brandTitle()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    port: 5173,
    // Dev: gọi /api qua proxy để cùng origin với cookie phiên, giống production (Caddy).
    proxy: { "/api": { target: "http://localhost:3000", changeOrigin: false } },
  },
  build: { sourcemap: true, outDir: "dist" },
});
