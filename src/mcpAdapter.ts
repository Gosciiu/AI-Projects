import type { OperationResponse } from "./dto/index.js";
import {
  fileArchive,
  fileCreate,
  fileDelete,
  fileMove,
  fileRead,
  fileUnarchive,
  fileUpdate,
  fileVersionDiff,
  fileVersionGet,
  fileVersionRestore,
  fileVersions,
  projectCreate,
  projectFiles,
  projectHistory,
  projectList,
  projectOpen,
  projectSearchFulltext,
  projectSetDefaultFile,
} from "./operations/index.js";

/**
 * MCP adapter — the thin transport layer (ARCHITECTURE.md Section 11,
 * step 7): tool names/descriptions/schemas + argument pass-through +
 * response serialization. ZERO business logic:
 *
 *  - Arguments are forwarded RAW (as `unknown` fields) into the
 *    operations — GVO step 1 (request validation → VALIDATION_ERROR)
 *    lives there. The JSON Schemas below are documentation for the
 *    client, not enforcement; deliberately no zod/schema validation
 *    here, which would duplicate step 1 with a different error shape.
 *  - Tool names: MCP requires [a-zA-Z0-9_-], so the Section 8 dotted
 *    names map dot → "_" and camelCase → snake_case
 *    (project.setDefaultFile → project_set_default_file).
 *  - Layering: MCP Handler → Operations → Storage. This module must
 *    never import from storage/.
 */

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
  invoke: (args: Record<string, unknown>) => Promise<OperationResponse<unknown>>;
}

/**
 * Every response is the COMPLETE OperationResponse envelope,
 * serialized as JSON into a single text content block. The
 * discriminated union (status: success | error | conflict) IS the
 * contract — the consuming AI must see it whole, especially the
 * "conflict" branch, which has no native MCP equivalent. `isError`
 * is never set here: domain errors and conflicts are legal contract
 * responses, not tool failures (server.ts reserves isError for
 * unexpected exceptions, i.e. corrupted-storage invariants).
 */
export function toCallToolResult(response: OperationResponse<unknown>): {
  content: Array<{ type: "text"; text: string }>;
} {
  return {
    content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
  };
}

/**
 * Section 9 — AI Awareness: the consuming model must learn from the
 * tool descriptions themselves that project deletion exists as a
 * user-only action outside MCP. Appended to project_create /
 * project_list and included in the server instructions.
 */
const PROJECT_DELETE_AWARENESS =
  "Note: deleting a whole project is deliberately NOT available through MCP — " +
  "it exists only as a user-side action outside this server. If a project looks " +
  "abandoned, duplicated or test-only, suggest that the USER deletes it manually; " +
  "never attempt it yourself.";

export const SERVER_INSTRUCTIONS =
  "AI Workspace gives you persistent project memory: files, content versioning, " +
  "history and search. It is content-agnostic and the single source of truth for " +
  "project state. Every tool returns a JSON envelope " +
  '{ status: "success" | "error" | "conflict", data }. Mutating file tools use ' +
  "optimistic locking: pass the versionId (ETag) you last saw; on a mismatch you get " +
  'status "conflict" with the CURRENT versionId and content — rebase and retry, ' +
  "nothing was changed. versionId ETags change on every modification (content, path, " +
  "status) and are NOT version ids from the history; those appear in file_versions / " +
  "project_history. " +
  PROJECT_DELETE_AWARENESS;

const string = { type: "string" } as const;
const pagination = {
  page: { type: "integer", minimum: 1 },
  pageSize: { type: "integer", minimum: 1 },
} as const;

export function createTools(root: string): McpToolDefinition[] {
  return [
    // ── File Operations (7) ──────────────────────────────────────
    {
      name: "file_read",
      description:
        "Read a file (metadata + current content) by fileId. Works on active and archived files.",
      inputSchema: {
        type: "object",
        properties: { fileId: string },
        required: ["fileId"],
      },
      invoke: (args) => fileRead(root, args),
    },
    {
      name: "file_create",
      description:
        "Create a file in a project with initial content (version 1). The path's extension " +
        "determines its type: .md, .json, .yaml/.yml, or no extension (plain text); anything " +
        "else is rejected. Fails with PATH_CONFLICT if an active file already holds the path.",
      inputSchema: {
        type: "object",
        properties: { projectId: string, path: string, content: string },
        required: ["projectId", "path", "content"],
      },
      invoke: (args) => fileCreate(root, args),
    },
    {
      name: "file_update",
      description:
        "Replace a file's content, creating a new version (history is append-only). Requires " +
        "the file's current versionId (ETag). Identical content is rejected with NO_CHANGES.",
      inputSchema: {
        type: "object",
        properties: { fileId: string, versionId: string, content: string },
        required: ["fileId", "versionId", "content"],
      },
      invoke: (args) => fileUpdate(root, args),
    },
    {
      name: "file_move",
      description:
        "Move/rename a file to newPath (same extension rules as file_create). Requires the " +
        "current versionId (ETag). Does NOT create a content version.",
      inputSchema: {
        type: "object",
        properties: { fileId: string, versionId: string, newPath: string },
        required: ["fileId", "versionId", "newPath"],
      },
      invoke: (args) => fileMove(root, args),
    },
    {
      name: "file_archive",
      description:
        "Archive an active file: hidden from project_open and search, content and history " +
        "preserved, path no longer reserved. Requires the current versionId (ETag). If the " +
        "file was the project's default, the default is cleared.",
      inputSchema: {
        type: "object",
        properties: { fileId: string, versionId: string },
        required: ["fileId", "versionId"],
      },
      invoke: (args) => fileArchive(root, args),
    },
    {
      name: "file_unarchive",
      description:
        "Restore an archived file to active. Requires the current versionId (ETag). Fails " +
        "with PATH_CONFLICT if an active file has taken its path meanwhile. Does NOT restore " +
        "its former default-file status.",
      inputSchema: {
        type: "object",
        properties: { fileId: string, versionId: string },
        required: ["fileId", "versionId"],
      },
      invoke: (args) => fileUnarchive(root, args),
    },
    {
      name: "file_delete",
      description:
        "PERMANENTLY delete a file and ALL its versions (they also vanish from " +
        "project_history). Two-step safety: only ARCHIVED files can be deleted — archive " +
        "first. Requires the current versionId (ETag).",
      inputSchema: {
        type: "object",
        properties: { fileId: string, versionId: string },
        required: ["fileId", "versionId"],
      },
      invoke: (args) => fileDelete(root, args),
    },

    // ── Project Operations (7) ───────────────────────────────────
    {
      name: "project_create",
      description: `Create a new project (empty, no default file). ${PROJECT_DELETE_AWARENESS}`,
      inputSchema: {
        type: "object",
        properties: { name: string },
        required: ["name"],
      },
      invoke: (args) => projectCreate(root, args),
    },
    {
      name: "project_list",
      description: `List all projects, sorted by name. ${PROJECT_DELETE_AWARENESS}`,
      inputSchema: {
        type: "object",
        properties: { ...pagination },
        required: ["page", "pageSize"],
      },
      invoke: (args) => projectList(root, args),
    },
    {
      name: "project_open",
      description:
        "Open a project: returns its default file (with content) if one is set, otherwise " +
        "a complete listing of all active files.",
      inputSchema: {
        type: "object",
        properties: { projectId: string },
        required: ["projectId"],
      },
      invoke: (args) => projectOpen(root, args),
    },
    {
      name: "project_files",
      description:
        "List a project's files sorted by path. Without status: ALL files (active AND " +
        "archived); with status 'active'/'archived': filtered.",
      inputSchema: {
        type: "object",
        properties: {
          projectId: string,
          status: { type: "string", enum: ["active", "archived"] },
          ...pagination,
        },
        required: ["projectId", "page", "pageSize"],
      },
      invoke: (args) => projectFiles(root, args),
    },
    {
      name: "project_search_fulltext",
      description:
        "Case-insensitive substring search over the CURRENT content of ACTIVE files. One " +
        "result per file with an excerpt around the first match; sorted by path (no ranking).",
      inputSchema: {
        type: "object",
        properties: { projectId: string, query: string, ...pagination },
        required: ["projectId", "query", "page", "pageSize"],
      },
      invoke: (args) => projectSearchFulltext(root, args),
    },
    {
      name: "project_history",
      description:
        "Content-change history across a project's files (created versions: create/update/" +
        "restore; moves and archive changes are not recorded), newest first. Each entry's " +
        "versionId is a history version id usable with file_version_get / file_version_diff.",
      inputSchema: {
        type: "object",
        properties: { projectId: string, ...pagination },
        required: ["projectId", "page", "pageSize"],
      },
      invoke: (args) => projectHistory(root, args),
    },
    {
      name: "project_set_default_file",
      description:
        "Set — or clear, by passing an explicit fileId: null — the project's default file " +
        "(the one project_open returns directly). The file must be an active file of this " +
        "project. Requires the project's current versionId as projectVersionId; on mismatch " +
        "returns status 'conflict' where fileId is the PROJECT id, versionId the project's " +
        "current ETag, and content the current default fileId ('' if none).",
      inputSchema: {
        type: "object",
        properties: {
          projectId: string,
          fileId: { type: ["string", "null"] },
          projectVersionId: string,
        },
        required: ["projectId", "fileId", "projectVersionId"],
      },
      invoke: (args) => projectSetDefaultFile(root, args),
    },

    // ── File Version Operations (4) ──────────────────────────────
    {
      name: "file_versions",
      description:
        "List a file's content versions, newest first (the first element is the current " +
        "version). Works on active and archived files.",
      inputSchema: {
        type: "object",
        properties: { fileId: string, ...pagination },
        required: ["fileId", "page", "pageSize"],
      },
      invoke: (args) => fileVersions(root, args),
    },
    {
      name: "file_version_get",
      description: "Fetch a single content version (including content) by its versionId.",
      inputSchema: {
        type: "object",
        properties: { versionId: string },
        required: ["versionId"],
      },
      invoke: (args) => fileVersionGet(root, args),
    },
    {
      name: "file_version_diff",
      description:
        "Unified diff between two versions of the SAME file (VERSION_MISMATCH otherwise). " +
        "The diff is plain text, no interpretation.",
      inputSchema: {
        type: "object",
        properties: { fromVersionId: string, toVersionId: string },
        required: ["fromVersionId", "toVersionId"],
      },
      invoke: (args) => fileVersionDiff(root, args),
    },
    {
      name: "file_version_restore",
      description:
        "Restore an old version's content as a NEW version — history is never rewound. The " +
        "file must be active. targetVersionId names the version to restore; currentVersionId " +
        "is the file's current versionId (ETag). NO_CHANGES if it equals the current content.",
      inputSchema: {
        type: "object",
        properties: { targetVersionId: string, currentVersionId: string },
        required: ["targetVersionId", "currentVersionId"],
      },
      invoke: (args) => fileVersionRestore(root, args),
    },
  ];
}
