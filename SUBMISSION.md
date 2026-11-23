# Submission: Ajaia Docs (Full Stack Product Engineer)

## Links

- **Live product:** `[PASTE RENDER URL]`
- **Walkthrough video:** `[PASTE LOOM / YOUTUBE UNLISTED URL]` (also in `walkthrough-url.txt`)

## Test accounts (password for all: `demo1234`)

- alice@demo.com: owns the welcome document, can share it
- bob@demo.com: can edit the shared document
- carol@demo.com: view only

## What is included

| File or folder | Contents |
| --- | --- |
| `client/` | React + TypeScript front end (TipTap editor) |
| `server/` | Express + TypeScript API, database setup, tests |
| `README.md` | Setup, run, test and deploy instructions |
| `ARCHITECTURE.md` | What I prioritized, what I cut, and why |
| `AI_WORKFLOW.md` | How AI was used, what I changed, how I verified |
| `SUBMISSION.md` | This file |
| `walkthrough-url.txt` | The video link |
| `screenshots/` | `[ADD IF USED]` |

## Status

**Working:** create, rename, edit and autosave documents; bold, italic, underline, headings, bulleted and numbered lists; upload of `.txt`, `.md` and `.docx` into new documents; sharing as editor or viewer with owned and shared lists; persistence in Postgres; validation and error handling; conflict detection on simultaneous edits; unit tests for permissions and imports; deployed build.

**Incomplete or cut on purpose:** real-time co-editing, real authentication, export, version history, comments, `.docx` images.

**Next, with another 2 to 4 hours:** version history with restore, Markdown and PDF export, presence indicators, login rate limiting, browser end-to-end tests.
