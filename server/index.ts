import "./env";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import path from "path";
import { ensureSchema, pool } from "./db";
import { router } from "./routes";
import { HttpError } from "./errors";

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/health", async (_req, res) => {
  try {
    await pool.query("select 1");
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

app.use("/api", router);
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Serve the built React app. Written as middleware (not app.get("*")) because
// Express 5 no longer accepts a bare "*" route path.
const dist = path.join(__dirname, "../client/dist");
app.use(express.static(dist));
app.use((req, res, next) => {
  if (req.method !== "GET") return next();
  res.sendFile(path.join(dist, "index.html"), (err) => {
    if (err) next();
  });
});

// Central error handler: clean JSON for expected errors, no stack traces to clients.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const e = err as { code?: string; status?: number; message?: string };
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (e.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ error: "File is too large (max 5 MB)" });
    return;
  }
  if (typeof e.status === "number" && e.status < 500) {
    res.status(e.status).json({ error: "Invalid request" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our side" });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`up on ${port}`));

// Run after listening so /health can report database problems instead of the process dying.
ensureSchema()
  .then(() => console.log("database ready"))
  .catch((err) => console.error("Database setup failed", err));
