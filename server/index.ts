// Garantir que as variáveis de ambiente sejam carregadas antes de qualquer outra importação
import dotenv from "dotenv";
// Carregar variáveis de ambiente do arquivo .env
const envResult = dotenv.config();

// Verificar se as variáveis de ambiente do Supabase estão definidas
console.log("📦 Verificando variáveis de ambiente do Supabase");
console.log("SUPABASE_URL está definido:", !!process.env.SUPABASE_URL);
console.log("SUPABASE_KEY está definido:", !!process.env.SUPABASE_KEY);

// Exibir detalhes do carregamento .env (sem exibir valores sensíveis)
if (envResult.error) {
  console.warn("⚠️ Erro ao carregar arquivo .env:", envResult.error.message);
} else {
  console.log("✅ Arquivo .env carregado com sucesso!");
}

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    console.error('Erro capturado pelo middleware de erro:', {
      status,
      message,
      stack: err.stack,
      path: _req.path,
      method: _req.method,
      body: _req.body
    });

    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
