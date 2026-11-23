import { Router } from "express";
import multer from "multer";
import { pool } from "./db";
import { requireAuth, signToken, verifyPassword } from "./auth";
import { canEdit, canManageSharing, isShareRole, resolveRole } from "./access";
import { fileToDocument, sanitize, UnsupportedFileError } from "./convert";
import { HttpError } from "./errors";

export const router = Router();

const MAX_TITLE = 200;
const MAX_CONTENT = 1_000_000; // characters of HTML
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const normalizeEmail = (value: unknown) => String(value ?? "").trim().toLowerCase();

// ---------- auth ----------

router.post("/login", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password ?? "");
  if (!email || !password) throw new HttpError(400, "Email and password are required");

  const { rows } = await pool.query(
    "select id, email, name, password_hash from users where email = $1",
    [email],
  );
  const user = rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new HttpError(401, "Wrong email or password");
  }
  res.json({
    token: signToken(user.id),
    user: { id: user.id, email: user.email, name: user.name },
  });
});

// Everything below needs a signed-in user.
router.use(requireAuth);

router.get("/me", async (_req, res) => {
  const { rows } = await pool.query("select id, email, name from users where id = $1", [
    res.locals.userId,
  ]);
  if (!rows[0]) throw new HttpError(401, "Please sign in again");
  res.json(rows[0]);
});

router.get("/users", async (_req, res) => {
  const { rows } = await pool.query(
    "select id, email, name from users where id <> $1 order by name",
    [res.locals.userId],
  );
  res.json(rows);
});

// ---------- helpers ----------

async function loadDoc(id: string, userId: number) {
  if (!UUID_RE.test(id)) return null;
  const { rows } = await pool.query(
    `select d.id, d.title, d.content, d.updated_at, d.owner_id, u.name as owner_name,
            s.role as share_role
       from documents d
       join users u on u.id = d.owner_id
       left join document_shares s on s.document_id = d.id and s.user_id = $2
      where d.id = $1`,
    [id, userId],
  );
  const row = rows[0];
  if (!row) return null;
  const role = resolveRole(row.owner_id, userId, row.share_role);
  // Same "not found" for missing and forbidden so ids can't be probed.
  if (!role) return null;
  return { row, role };
}

async function mustLoad(id: string, userId: number) {
  const found = await loadDoc(id, userId);
  if (!found) throw new HttpError(404, "Document not found");
  return found;
}

async function listShares(documentId: string) {
  const { rows } = await pool.query(
    `select s.user_id, u.name, u.email, s.role
       from document_shares s join users u on u.id = s.user_id
      where s.document_id = $1 order by u.name`,
    [documentId],
  );
  return rows;
}

function cleanTitle(value: unknown): string {
  const title = String(value ?? "").trim();
  if (!title) throw new HttpError(400, "Title cannot be empty");
  if (title.length > MAX_TITLE) throw new HttpError(400, `Title must be ${MAX_TITLE} characters or fewer`);
  return title;
}

// ---------- documents ----------

router.get("/documents", async (_req, res) => {
  const userId = res.locals.userId as number;
  const { rows } = await pool.query(
    `select d.id, d.title, d.updated_at, d.owner_id, u.name as owner_name,
            case when d.owner_id = $1 then 'owner' else s.role end as role
       from documents d
       join users u on u.id = d.owner_id
       left join document_shares s on s.document_id = d.id and s.user_id = $1
      where d.owner_id = $1 or s.user_id = $1
      order by d.updated_at desc`,
    [userId],
  );
  res.json(rows);
});

router.post("/documents", async (req, res) => {
  const userId = res.locals.userId as number;
  const title = req.body?.title ? cleanTitle(req.body.title) : "Untitled document";
  const { rows } = await pool.query(
    "insert into documents (owner_id, title, content) values ($1, $2, '<p></p>') returning id",
    [userId, title],
  );
  res.status(201).json({ id: rows[0].id });
});

// Declared before /documents/:id routes to keep the intent obvious.
router.post("/documents/import", upload.single("file"), async (req, res) => {
  const userId = res.locals.userId as number;
  if (!req.file) throw new HttpError(400, "Choose a file to upload");

  let imported;
  try {
    imported = await fileToDocument(req.file.originalname, req.file.buffer);
  } catch (err) {
    if (err instanceof UnsupportedFileError) throw new HttpError(400, err.message);
    console.error("Import failed", err);
    throw new HttpError(400, "That file could not be read. Is it a valid document?");
  }
  const { rows } = await pool.query(
    "insert into documents (owner_id, title, content) values ($1, $2, $3) returning id",
    [userId, imported.title, imported.html],
  );
  res.status(201).json({ id: rows[0].id });
});

router.get("/documents/:id", async (req, res) => {
  const userId = res.locals.userId as number;
  const { row, role } = await mustLoad(req.params.id, userId);
  res.json({
    id: row.id,
    title: row.title,
    content: row.content,
    updated_at: row.updated_at,
    role,
    owner: { id: row.owner_id, name: row.owner_name },
    shares: canManageSharing(role) ? await listShares(row.id) : undefined,
  });
});

router.patch("/documents/:id", async (req, res) => {
  const userId = res.locals.userId as number;
  const { row, role } = await mustLoad(req.params.id, userId);
  if (!canEdit(role)) throw new HttpError(403, "You have view-only access to this document");

  const body = req.body ?? {};
  const title = body.title === undefined ? null : cleanTitle(body.title);
  let content: string | null = null;
  if (body.content !== undefined) {
    if (typeof body.content !== "string") throw new HttpError(400, "Content must be a string");
    if (body.content.length > MAX_CONTENT) throw new HttpError(413, "Document is too large");
    content = sanitize(body.content);
  }
  const baseUpdatedAt = body.baseUpdatedAt ? new Date(body.baseUpdatedAt) : null;
  if (baseUpdatedAt && Number.isNaN(baseUpdatedAt.getTime())) {
    throw new HttpError(400, "Invalid baseUpdatedAt");
  }

  // Optimistic concurrency: only save if nobody else saved since the client loaded.
  const result = await pool.query(
    `update documents
        set title = coalesce($2, title), content = coalesce($3, content), updated_at = now()
      where id = $1
        and ($4::timestamptz is null or date_trunc('milliseconds', updated_at) = $4::timestamptz)
      returning updated_at`,
    [row.id, title, content, baseUpdatedAt],
  );
  if (result.rowCount === 0) {
    throw new HttpError(409, "Someone else saved a newer version of this document");
  }
  res.json({ updated_at: result.rows[0].updated_at });
});

router.delete("/documents/:id", async (req, res) => {
  const userId = res.locals.userId as number;
  const { row, role } = await mustLoad(req.params.id, userId);
  if (!canManageSharing(role)) throw new HttpError(403, "Only the owner can delete a document");
  await pool.query("delete from documents where id = $1", [row.id]);
  res.json({ ok: true });
});

// ---------- sharing ----------

router.post("/documents/:id/share", async (req, res) => {
  const userId = res.locals.userId as number;
  const { row, role } = await mustLoad(req.params.id, userId);
  if (!canManageSharing(role)) throw new HttpError(403, "Only the owner can share this document");

  const email = normalizeEmail(req.body?.email);
  const shareRole = req.body?.role;
  if (!email) throw new HttpError(400, "Choose who to share with");
  if (!isShareRole(shareRole)) throw new HttpError(400, "Role must be 'editor' or 'viewer'");

  const target = await pool.query("select id from users where email = $1", [email]);
  if (!target.rows[0]) throw new HttpError(404, "No user with that email");
  if (target.rows[0].id === row.owner_id) throw new HttpError(400, "You already own this document");

  await pool.query(
    `insert into document_shares (document_id, user_id, role) values ($1, $2, $3)
     on conflict (document_id, user_id) do update set role = excluded.role`,
    [row.id, target.rows[0].id, shareRole],
  );
  res.json(await listShares(row.id));
});

router.delete("/documents/:id/share/:userId", async (req, res) => {
  const userId = res.locals.userId as number;
  const { row, role } = await mustLoad(req.params.id, userId);
  if (!canManageSharing(role)) throw new HttpError(403, "Only the owner can change sharing");

  const targetId = Number(req.params.userId);
  if (!Number.isInteger(targetId)) throw new HttpError(400, "Invalid user");
  await pool.query("delete from document_shares where document_id = $1 and user_id = $2", [
    row.id,
    targetId,
  ]);
  res.json(await listShares(row.id));
});
