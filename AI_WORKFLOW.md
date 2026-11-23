# AI workflow note

> **Draft written for you, not for submission as is.** Lines marked `[YOU]` must be replaced with what actually happened in your session. Delete anything that is not true.

## Tools I used

- Claude, in chat: planning, scoping, and writing the first version of the code.
- `[YOU: name any other assistant used for the earlier setup plan, and Claude Code if you used it]`

## Where AI materially sped me up

- Turning the open brief into a scoped plan: a core loop first, then sharing, upload and deployment.
- Generating the first pass of the Express routes, the Postgres schema, the TipTap editor and the unit tests, which I then read and ran.
- Spotting environment problems early. Examples: Windows PowerShell does not support `printf` or `&&` chaining the way the setup instructions assumed, and `tsx` and `typescript` had to be regular dependencies, not dev-only, so the production start command would work on Render.

## What I changed or rejected

- **Rejected the catch-all route** `app.get("*")` from the first server snippet. The project uses Express 5, which no longer accepts a bare `*` path, so the server would have crashed on start. I used a middleware fallback instead.
- **Kept `.env` in the project root** and made the server load it from there instead of moving it, so secrets stay out of the server folder and Git.
- **Chose conflict detection over real-time collaboration.** AI offered real-time editing as an option. I cut it as too large for the timebox and used an `updated_at` check that rejects stale saves.
- `[YOU: add at least one more thing you changed, rejected, or fixed after reading the generated code, for example a bug you hit while testing]`

## How I verified it

- Unit tests for the permission rules and the import logic (`cd server && npm test`). `[YOU: confirm they pass and paste the result]`
- Manual test of the full flow as three users: Alice owns and shares, Bob edits, Carol is read-only. `[YOU: confirm each check]`
- Upload tested with a `.txt`, a `.md` and a `.docx` file, and with an unsupported type. `[YOU: confirm]`
- Refresh test: document and formatting persist. `[YOU: confirm]`
- Deployed build checked at `/health` and through the live URL. `[YOU: confirm]`
