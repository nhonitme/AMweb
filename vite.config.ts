import { createReadStream, existsSync, statSync } from "node:fs"
import path from "node:path"
import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"

const AMNOTE_UI_MIME: Record<string, string> = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".txt": "text/plain; charset=utf-8",
    ".woff2": "font/woff2",
}

/** Serve kit hosting/ only during `vite` / `npm run dev` (not production build). */
function amnoteUiGuidelinesDevPlugin(): Plugin {
    const root = path.resolve(__dirname, "dev-static/amnote-ui")
    return {
        name: "amnote-ui-guidelines-dev",
        apply: "serve",
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                if (!req.url?.startsWith("/amnote-ui")) {
                    next()
                    return
                }

                const rawPath = decodeURIComponent(req.url.slice("/amnote-ui".length).split("?")[0] || "/")
                let filePath = path.normalize(path.join(root, rawPath))
                if (!filePath.startsWith(root)) {
                    res.statusCode = 403
                    res.end("Forbidden")
                    return
                }

                if (existsSync(filePath) && statSync(filePath).isDirectory()) {
                    filePath = path.join(filePath, "index.html")
                }

                if (!existsSync(filePath) || !statSync(filePath).isFile()) {
                    next()
                    return
                }

                const ext = path.extname(filePath).toLowerCase()
                res.setHeader("Content-Type", AMNOTE_UI_MIME[ext] || "application/octet-stream")
                createReadStream(filePath).pipe(res)
            })
        },
    }
}

export default defineConfig({
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
            // or if components sits at project root:
            // "@": path.resolve(__dirname, "."),
        },
    },
    plugins: [react(), amnoteUiGuidelinesDevPlugin()],
    build: {
        outDir: '../API_AMNOTE_WEB/API_AMNOTE_WEB/wwwroot',
        emptyOutDir: true
    }
})