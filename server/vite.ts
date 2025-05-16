import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get vite config but handle both development and production
async function getViteConfig() {
  try {
    return (await import("../vite.config.js")).default;
  } catch (e) {
    console.log("Failed to import vite config, using defaults");
    return {};
  }
}

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
    hmr: { server },
    allowedHosts: true,
  };

  const viteConfig = await getViteConfig();

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
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
    
    // Skip API routes - let them be handled by their own handlers
    if (url.startsWith('/api/')) {
      return next();
    }

    try {
      // Use path.join with __dirname to construct the path
      const clientTemplate = path.join(
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
}

export function serveStatic(app: Express) {
  // Use path.join with __dirname to construct the path
  const distPath = path.join(__dirname, "..", "public");

  if (!fs.existsSync(distPath)) {
    console.warn(`Could not find the build directory: ${distPath}, falling back to dist/client`);
    // Try alternate path
    const altPath = path.join(__dirname, "..", "client");
    if (fs.existsSync(altPath)) {
      app.use(express.static(altPath));
      app.use("*", (_req, res) => {
        // Skip API routes in the catch-all handler
        if (_req.originalUrl.startsWith('/api/')) {
          return;
        }
        res.sendFile(path.join(altPath, "index.html"));
      });
      return;
    }
    
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    // Skip API routes in the catch-all handler
    if (_req.originalUrl.startsWith('/api/')) {
      return;
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}
