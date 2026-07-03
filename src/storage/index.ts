/**
 * Storage layer — JSON file I/O, 1:1 with ARCHITECTURE.md Section 10.
 *
 * Consumed ONLY by the operations layer (`MCP Handler → Operations →
 * Storage`, Section 11) — handlers must never import from here.
 * No validation, no error codes, no sorting/pagination, no ID
 * generation: absence is `null`/`[]`, everything else is the callers'
 * responsibility.
 */
export { DEFAULT_DATA_ROOT } from "./paths.js";
export {
  readProject,
  writeProject,
  listProjects,
  deleteProject,
} from "./projectStorage.js";
export {
  readProjectFile,
  writeProjectFile,
  listProjectFiles,
  deleteProjectFile,
  findProjectFileById,
} from "./fileStorage.js";
export {
  readFileVersion,
  writeFileVersion,
  listFileVersions,
  deleteAllFileVersions,
  findFileVersionById,
} from "./versionStorage.js";
