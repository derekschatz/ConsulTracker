import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const viteConfigPath = path.resolve(__dirname, "..", "vite.config.ts");

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: {
      server,
    },
    allowedHosts: true as true,
  };

  try {
    const vite = await createViteServer({
      configFile: viteConfigPath,
      customLogger: {
        ...viteLogger,
        error: (msg, options) => {
          viteLogger.error(msg, options);
          process.exit(1);
        },
      },
      server: serverOptions,
      appType: "custom",
    });

    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;

      try {
        const clientTemplate = path.resolve(
          __dirname,
          "..",
          "client",
          "index.html",
        );

        // always reload the index.html file from disk incase it changes
        let template = await fs.promises.readFile(clientTemplate, "utf-8");
        template = template.replace(
          `src="/src/main.tsx"`,
          `src="/src/main.tsx?v=${Date.now()}"`,
        );
        const page = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } catch (error) {
    console.error("Error creating Vite server:", error);
    throw error;
  }
}

export function serveStatic(app: Express) {
  try {
    // In production, use the dist/client directory
    const distPath = path.resolve(__dirname, "..", "client", "public");

    if (!fs.existsSync(distPath)) {
      console.warn(`Static directory not found: ${distPath}`);
      console.warn("Creating empty client directory");
      fs.mkdirSync(distPath, { recursive: true });
    }

    console.log(`Serving static files from: ${distPath}`);
    app.use(express.static(distPath));

    // fall through to index.html if the file doesn't exist
    app.use("*", (_req, res) => {
      const indexPath = path.resolve(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Application not properly built. Missing index.html");
      }
    });
  } catch (error) {
    console.error("Error setting up static file serving:", error);
    throw error;
  }
}
