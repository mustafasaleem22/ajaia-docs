# Architecture note

## What I prioritized

The brief rewards depth in a few areas over breadth. I put my time into four things, in this order:

1. **A reliable core loop:** create, edit, autosave, reopen. If this feels flaky nothing else matters.
2. **Correct sharing:** permissions are decided in one small pure function and enforced on the server for every request.
3. **A useful import flow:** `.txt`, `.md` and `.docx` turn into editable documents, because that is how teams actually bring existing work into a tool like this.
4. **A deployable, testable build:** one service, one URL, demo accounts and seed data so a reviewer can try sharing in a minute.

## Stack and why

| Choice | Reason |
| --- | --- |
| React + TypeScript + Vite | Fast to build, typed end to end. |
| TipTap (ProseMirror) | A real rich-text engine. A plain `contenteditable` is a time sink for lists, headings and selection handling. |
| Express 5 + TypeScript | Small and familiar. One process serves the API and the built client, so deployment is a single web service. |
| PostgreSQL on Supabase | Free, hosted, persistent, and the same database I use in production work. I use it as plain Postgres through `pg`. |
| Documents stored as sanitized HTML | Simple, preserves formatting, and renders directly in the editor. |

## Data model

- `users(id, email, name, password_hash)`
- `documents(id uuid, owner_id, title, content, created_at, updated_at)`
- `document_shares(document_id, user_id, role)` where role is `viewer` or `editor`, primary key `(document_id, user_id)`

One owner per document keeps the rules easy to reason about. Sharing is a separate table so a document can be shared with many people at different levels.

## Access rules

`resolveRole()` returns `owner`, `editor`, `viewer` or `null`. Everything else follows from it:

- Viewers can read. Editors can read and edit. Only owners can share, unshare and delete.
- A user without access gets the same "not found" as a missing document, so document IDs cannot be probed.
- Checks run on the server. Disabling buttons in the UI is a convenience, not security.

## Reliability decisions

- **Autosave with a short debounce** and a visible status ("Saving…", "All changes saved"). A retry for network or server failures and a warning before closing the tab with unsaved work are implemented but not tested.
- **Optimistic concurrency:** each save sends the `updated_at` it was based on, and the database update only succeeds if that is still current. If two people edit at once, the second save gets a 409 and a clear banner instead of silently overwriting the first.
- **Server-side HTML sanitizing** with an allow-list, applied to saved content and to every import, so a document cannot carry scripts.
- **Validation and error handling:** title and size limits, file type and size checks, a central error handler that returns readable messages and never leaks stack traces.

## What I deliberately cut

- Real-time collaborative editing. It needs a CRDT or operational transform layer, which would have consumed the whole timebox. The conflict check is the honest, cheap alternative.
- Real authentication. Seeded accounts and signed tokens let reviewers test sharing without sign-up friction. A production version would use an identity provider.
- Export, version history and comments.
- Rate limiting and audit logging.

## What I would build next (2 to 4 more hours)

1. Version history (a `document_versions` table written on save) with restore.
2. Export to Markdown and PDF.
3. Real-time presence (who is viewing) over a websocket, as a stepping stone to live co-editing.
4. Login rate limiting, and replace the demo auth with an identity provider.
5. Browser end-to-end tests for the share flow, to complement the unit tests.
