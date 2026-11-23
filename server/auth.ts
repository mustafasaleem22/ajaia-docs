import "./env";
import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";
import { HttpError } from "./errors";

// Lightweight auth for a demo: seeded users + signed, expiring bearer tokens.
// A real product would use a proper identity provider (see ARCHITECTURE.md).
const SECRET = process.env.SESSION_SECRET || "dev-only-secret-change-me";
if (!process.env.SESSION_SECRET) {
  console.warn("SESSION_SECRET is not set; using an insecure development default.");
}

const b64 = (buf: Buffer | string) => Buffer.from(buf).toString("base64url");
const sign = (payload: string) =>
  crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");

export function signToken(userId: number, ttlMs = 7 * 24 * 60 * 60 * 1000): string {
  const payload = b64(JSON.stringify({ uid: userId, exp: Date.now() + ttlMs }));
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string): number | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data.uid !== "number" || typeof data.exp !== "number") return null;
    if (data.exp < Date.now()) return null;
    return data.uid;
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const userId = token ? verifyToken(token) : null;
  if (userId === null) throw new HttpError(401, "Please sign in again");
  res.locals.userId = userId;
  next();
}
