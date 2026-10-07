import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
            // or if components sits at project root:
            // "@": path.resolve(__dirname, "."),
        },
    },
    plugins: [react()],
    build: {
        outDir: '../API_AMNOTE_WEB/API_AMNOTE_WEB/wwwroot',
        emptyOutDir: true
    }
})