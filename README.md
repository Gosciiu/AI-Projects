# AI Workspace

**Persistent project memory for AI models, served over MCP.**

AI Workspace is a local [Model Context Protocol](https://modelcontextprotocol.io) server that gives AI assistants (Claude Desktop, and any other MCP-capable client) something they fundamentally lack: durable, versioned, searchable memory of your projects that survives between conversations.

No cloud. No database. No subscription. Just JSON files on your disk, fully under your control.

---

## The problem it solves

AI assistants forget everything between sessions. Every new conversation starts from zero: you re-explain the project, re-paste the context, re-upload the documents — and the AI still loses details as the project grows.

AI Workspace flips the responsibility: **the AI itself maintains the project's memory.** At the start of a session it opens the project and reads the current state. During the session it updates documents, and every content change is versioned automatically. The next session — days or weeks later, in a completely new chat — picks up exactly where the last one ended.

## What it does

- **Projects & files** — organize work into projects, each holding any number of text files (`.md`, `.json`, `.yaml`, plain text)
- **Automatic versioning** — every content change creates an immutable version; history is append-only and can never be silently rewritten
- **Time travel** — list versions, fetch any historical version, diff two versions (unified diff), restore old content *as a new version* (history is never rewound)
- **Optimistic locking** — every write requires the current version tag (ETag); concurrent modifications are detected and rejected as explicit conflicts, never silently merged or overwritten
- **Full-text search** — case-insensitive search across the current content of active files
- **Project history** — a chronological feed of every content change across the whole project
- **Default file** — mark one file (e.g. `STATUS.md`) as the project's entry point; opening the project returns it directly, so the AI lands on the right context in one call
- **Archive before delete** — files must be archived (reversible) before they can be deleted (irreversible); a two-step safety mechanism against accidental data loss
- **Human-only project deletion** — AI can create and list projects, but deleting an entire project is deliberately **not exposed over MCP**. Only you can do that, manually. The AI knows the capability exists and may *suggest* it — it can never *execute* it.

## What it deliberately does NOT do

AI Workspace is content-agnostic by design. It stores, versions and finds text — it never interprets it. There is no semantic search, no embeddings, no AI inside the server, no schema imposed on your files. All intelligence lives in the AI client; all memory lives here. This keeps the engine simple, predictable, and universal: the same server works for a novel, a codebase design doc, a research log, or a D&D campaign.

There are also **no indexes, no cache, and no database** — deliberately. Your data is plain, pretty-printed JSON files you can open, read, diff and back up with any tool you already use.

## How your data is stored

```
data/
  projects/
    {projectId}/
      project.json              # project metadata
      files/
        {fileId}.json           # file metadata (path, status, ETag)
      versions/
        {fileId}/
          {versionId}.json      # immutable content versions
```

Everything is UUID-addressed and human-readable. Delete the `data/` folder and the memory is gone; copy it and the memory moves with you.

## The 18 MCP tools

| Group | Tools |
|---|---|
| **Files** (7) | `file_read`, `file_create`, `file_update`, `file_move`, `file_archive`, `file_unarchive`, `file_delete` |
| **Projects** (7) | `project_create`, `project_list`, `project_open`, `project_files`, `project_search_fulltext`, `project_history`, `project_set_default_file` |
| **Versions** (4) | `file_versions`, `file_version_get`, `file_version_diff`, `file_version_restore` |

Every state-changing tool follows the same validation order and returns one of three response shapes: `success`, `error` (with a stable error code), or `conflict` (with the current ETag and content, so the client can rebase and retry). Conflicts are first-class citizens, not errors.

## Quick start

Requirements: [Node.js](https://nodejs.org) 18+ (LTS recommended).

```bash
git clone https://github.com/YOUR_USERNAME/ai-workspace.git
cd ai-workspace
npm install
npm run build
```

Verify it runs:

```bash
node dist/server.js
# → AI Workspace MCP server running (data root: data)
```

### Connect to Claude Desktop

Add to your `claude_desktop_config.json` (Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "ai-workspace": {
      "command": "node",
      "args": ["/absolute/path/to/ai-workspace/dist/server.js"],
      "env": { "AI_WORKSPACE_DATA_ROOT": "/absolute/path/to/ai-workspace/data" }
    }
  }
}
```

Fully restart Claude Desktop (quit from the system tray, not just the window). You should see 18 `ai-workspace` tools available.

The data root can also be set with `--data-root <path>`; it defaults to `./data`.

### First session

In a new conversation, try:

> *Create a project called "My Novel" in AI Workspace, add a file `outline.md` with my three-act structure, and set it as the default file.*

From then on, any future conversation can start with:

> *Open "My Novel" and continue where we left off.*

## A suggested workflow

1. **One project per real-world project.** Keep a `STATUS.md` or `README.md` as the default file — the AI reads it first on every `project_open`.
2. **Let the AI maintain the docs.** After each working session, ask it to update the status file and any documents you touched. Versioning is automatic.
3. **Use history when things go wrong.** `file_version_diff` shows exactly what changed between any two versions; `file_version_restore` brings old content back without destroying anything.
4. **Archive instead of deleting.** Archived files disappear from the default views and free up their path, but keep their full history and can be restored at any time.

## Development

```bash
npm run dev      # run from TypeScript sources (tsx), no build step
npm test         # 48 end-to-end tests on a real temp filesystem
npm run build    # compile to dist/
```

The codebase is strictly layered (`MCP adapter → operations → storage`), fully typed (TypeScript strict mode), and every architectural rule is documented:

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — the binding specification: domain model, all 18 operations, validation order, error codes, filesystem layout
- [`docs/Architecture_FINAL.md`](./docs/Architecture_FINAL.md) — the full design history with rationale for every decision (ADRs)

## Security notes

- The server is **local, single-user, and unauthenticated by design** — it speaks stdio to a client on the same machine. Do not expose it to a network without adding an authentication layer.
- Write actions in MCP clients may be subject to the client's own confirmation prompts — that's a feature, not a bug.
- Your data never leaves your machine.

## License

MIT

---

*Built through an unusual process: designed collaboratively by two AI models (Claude and ChatGPT) acting as peer architects/reviewers, implemented by Claude Code, with a human product owner making the final calls. Every layer was independently reviewed twice before merging. The full design history in `docs/` documents how that worked.*
