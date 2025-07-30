import path from "path";
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(),],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
    build: {
        outDir: "../backend/static",
        emptyOutDir: true,
        sourcemap: true
    },
    server: {
        host: true,
        proxy: {
            "/api": {
                target: "http://localhost:5000",
                changeOrigin: true,
                secure: false
            }
        }
    }
});

