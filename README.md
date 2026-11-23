# Ajaia Docs

A lightweight collaborative document editor: create and format documents, import files, share with other users, and come back to everything after a refresh.

**Live app:** https://ajaia-docs-ul62.onrender.com  
**Health check:** https://ajaia-docs-ul62.onrender.com/health returns `{"ok":true}` when the database is reachable.

> The app runs on Render's free tier, so the first request after a quiet period can take 30 to 60 seconds while it wakes up.

## Demo accounts

All three use the password `demo1234`.

| User | Email | What to look at |
| --- | --- | --- |
| Alice | alice@demo.com | Owns the "Welcome to Ajaia Docs" document and can share it |
| Bob | bob@demo.com | Has **edit** access to Alice's document |
| Carol | carol@demo.com | Has **view-only** access to Alice's document |

To see sharing end to end: sign in as Alice, open the welcome document, click **Share**, and add or remove people. Then sign in as Bob (can type) and as Carol (read-only banner, disabled toolbar).

## What works

- **Documents:** create, rename (title field), edit, autosave, reopen. The open document survives a refresh.
- **Rich text:** bold, italic, underline, headings (H1/H2), normal text, bulleted and numbered lists. Keyboard shortcuts (Ctrl+B / I / U) work too.
- **File upload:** `.txt`, `.md` and `.docx` files (max 5 MB) become new editable documents. Other file types are rejected with a clear message. Images inside `.docx` files are not imported.
- **Sharing:** every document has one owner. The owner can share with another user as **can edit** or **view only**, change that later, or remove access. The document list separates **My documents** from **Shared with me** and labels the access level.
- **Persistence:** PostgreSQL (Supabase). Formatting is stored as sanitized HTML.
- **Safety and errors:** all inputs are validated, document HTML is sanitized on the server, permissions are enforced on the server for every request, and failures show readable messages.
- **Edit conflicts:** if two people edit the same document, the second save is rejected with a banner and a reload button instead of silently overwriting the first.

## Run it locally

You need Node.js 22 or newer and a Postgres database (a free Supabase project works).

1. Create a `.env` file in the project root:

   ```
   DATABASE_URL=postgresql://postgres.xxxx:YOUR_PASSWORD@aws-0-region.pooler.supabase.com:5432/postgres
   SESSION_SECRET=any-long-random-string
   ```

   Use the **Session pooler** connection string from Supabase's **Connect** button. The direct connection is IPv6-only and often fails on hosts such as Render. For a local Postgres without SSL, also set `DATABASE_SSL=false`.

2. Install and start the server (tables and demo users are created automatically on start):

   ```
   cd server
   npm install
   npm run dev
   ```

3. In a second terminal, start the client:

   ```
   cd client
   npm install
   npm run dev
   ```

4. Open the address Vite prints (usually http://localhost:5173). It proxies `/api` to the server on port 3000.

## Tests

```
cd server
npm test
```

The tests cover the sharing and permission rules (owner / editor / viewer / no access) and the file import logic (text escaping, markdown conversion, script stripping, unsupported file types). They do not need a database.

## Deploy (Render)

Create a **Web Service** from the GitHub repo with:

- **Build command:** `npm --prefix client install --include=dev && npm --prefix client run build && npm --prefix server install`
- **Start command:** `npx --prefix server tsx server/index.ts`
- **Environment variables:** `DATABASE_URL` (session pooler string), `SESSION_SECRET` (long random string), `NODE_VERSION` set to `22`

The server serves the built React app and the API from the same URL.

## Project layout

```
client/   React + TypeScript + Vite + TipTap editor
server/   Express 5 + TypeScript + pg
  access.ts    permission rules (pure, unit tested)
  convert.ts   file import and HTML sanitizing (unit tested)
  routes.ts    HTTP API
  db.ts        schema, seed data, connection pool
  auth.ts      password hashing and signed tokens
```

See `ARCHITECTURE.md` for the reasoning behind these choices and `AI_WORKFLOW.md` for how AI was used.

## Known limits

- Authentication is a demo: seeded accounts, no sign-up, no password reset.
- No real-time co-editing. Saves are last-writer-safe (conflicts are detected) but people do not see each other's cursors.
- `.docx` import keeps text, headings, lists and basic formatting. Images and complex layout are dropped.
- No export, version history or comments.
