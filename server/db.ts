import "./env";
import { Pool } from "pg";
import { hashPassword } from "./auth";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Hosted Postgres (Supabase) needs SSL. Set DATABASE_SSL=false for a local database.
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
});

pool.on("error", (err) => console.error("Unexpected database error", err));

export const DEMO_PASSWORD = "demo1234";

const SEED_USERS = [
  { email: "alice@demo.com", name: "Alice Johnson" },
  { email: "bob@demo.com", name: "Bob Smith" },
  { email: "carol@demo.com", name: "Carol Davis" },
];

const SCHEMA = `
create table if not exists users (
  id serial primary key,
  email text unique not null,
  name text not null,
  password_hash text not null
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  owner_id integer not null references users(id) on delete cascade,
  title text not null default 'Untitled document',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists document_shares (
  document_id uuid not null references documents(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  role text not null check (role in ('viewer', 'editor')),
  created_at timestamptz not null default now(),
  primary key (document_id, user_id)
);

create index if not exists idx_documents_owner on documents(owner_id);
create index if not exists idx_shares_user on document_shares(user_id);
`;

/** Creates tables and seeds demo users. Safe to run on every start. */
export async function ensureSchema(): Promise<void> {
  await pool.query(SCHEMA);

  for (const u of SEED_USERS) {
    await pool.query(
      "insert into users (email, name, password_hash) values ($1, $2, $3) on conflict (email) do nothing",
      [u.email, u.name, hashPassword(DEMO_PASSWORD)],
    );
  }

  // First run only: give reviewers something to look at, with sharing already set up.
  const { rows } = await pool.query("select count(*)::int as n from documents");
  if (rows[0].n === 0) {
    const users = await pool.query("select id, email from users");
    const id = (email: string) => users.rows.find((u) => u.email === email)?.id as number;
    const doc = await pool.query(
      "insert into documents (owner_id, title, content) values ($1, $2, $3) returning id",
      [
        id("alice@demo.com"),
        "Welcome to Ajaia Docs",
        "<h1>Welcome</h1><p>This document is owned by <strong>Alice</strong>. " +
          "It is shared with Bob (can edit) and Carol (view only).</p>" +
          "<ul><li>Try <em>bold</em>, <u>underline</u> and lists</li><li>Upload a .txt, .md or .docx from the document list</li></ul>",
      ],
    );
    await pool.query(
      "insert into document_shares (document_id, user_id, role) values ($1, $2, 'editor'), ($1, $3, 'viewer')",
      [doc.rows[0].id, id("bob@demo.com"), id("carol@demo.com")],
    );
  }
}
