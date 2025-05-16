import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { type Server } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Only import vite in development
let createViteServer: any;
let createLogger: any;

if (process.env.NODE_ENV !== 'production') {
  try {
    const vite = await import('vite');
    createViteServer = vite.createServer;
    createLogger = vite.createLogger;
  } catch (e) {
    console.error('Failed to import vite modules:', e);
  }
}

// Get vite config but handle both development and production
async function getViteConfig() {
  if (process.env.NODE_ENV === 'production') {
    return {};
  }
  
  try {
    return (await import("../vite.config.js")).default;
  } catch (e) {
    console.log("Failed to import vite config, using defaults");
    return {};
  }
}

const viteLogger = process.env.NODE_ENV !== 'production' && createLogger ? createLogger() : console;

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
  // Skip in production
  if (process.env.NODE_ENV === 'production') {
    console.log('Skipping Vite setup in production mode');
    return;
  }
  
  if (!createViteServer) {
    throw new Error('Vite modules not available. Cannot setup Vite in development mode.');
  }

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
      error: (msg: string, options: any) => {
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
  console.log('Setting up static file serving for production');
  
  // Check multiple paths for the static files
  const possiblePaths = [
    path.join(__dirname, "..", "public"),
    path.join(__dirname, "public"),
    path.join(__dirname, "..", "client"),
    path.join(__dirname, "..", "..", "client"),
    path.join(__dirname, "..", "..", "public")
  ];
  
  let distPath: string | null = null;
  
  // Find the first path that exists
  for (const testPath of possiblePaths) {
    console.log(`Checking if path exists: ${testPath}`);
    if (fs.existsSync(testPath)) {
      distPath = testPath;
      console.log(`Found valid static files path: ${distPath}`);
      break;
    }
  }

  if (!distPath) {
    throw new Error(
      `Could not find any build directory. Make sure to build the client first. Checked paths: ${possiblePaths.join(', ')}`,
    );
  }

  // Serve static files
  app.use(express.static(distPath));
  console.log(`Serving static files from: ${distPath}`);

  // Check if index.html exists
  const indexPath = path.join(distPath, "index.html");
  if (!fs.existsSync(indexPath)) {
    console.warn(`Warning: index.html not found at ${indexPath}`);
  } else {
    console.log(`Found index.html at ${indexPath}`);
  }

  // fall through to index.html if the file doesn't exist
  app.use("*", (req, res, next) => {
    // Skip API routes in the catch-all handler
    if (req.originalUrl.startsWith('/api/')) {
      return next();
    }
    
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Cannot find index.html');
    }
  });
}
