import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: process.env.COAMA_API_PROXY || "http://127.0.0.1:8080",
        changeOrigin: true,
        secure: false,
        rewrite: path => path.replace(/^\/api/, ""),
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, res) => {
            console.warn("[Vite Proxy Warning]", err.message);
            if (res && !res.headersSent) {
              res.writeHead(503, { "content-type": "application/json; charset=utf-8" });
              res.end(JSON.stringify({ error: "Servidor API no disponible o reiniciando. Intente nuevamente en unos segundos." }));
            }
          });
        }
      }
    }
  }
});
