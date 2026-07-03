/**
 * Validation layer — pure functions, no I/O, reused by all 17
 * operations. Subfolders map 1:1 to Global Validation Order steps
 * (ARCHITECTURE.md Sections 5 & 11):
 *
 *   request/      step 1 → VALIDATION_ERROR (+ UNSUPPORTED_FILE_TYPE)
 *   existence.ts  step 2 → *_NOT_FOUND (root module — see its header)
 *   state/        step 3 → FILE_ARCHIVED / FILE_NOT_ARCHIVED
 *   version/      step 4 → ConflictData, NEVER an error code
 *   business/     step 5 → PATH_CONFLICT / NO_CHANGES / VERSION_MISMATCH
 *
 * Operations must invoke validators strictly in step order.
 */
export type { ErrorCode } from "./errors.js";
export { errorData } from "./errors.js";

// step 1 — request/
export {
  requireNonEmptyString,
  requireString,
  requireOptionalStatusFilter,
} from "./request/fields.js";
export { validatePagination } from "./request/pagination.js";
export type { FileType } from "./request/fileType.js";
export { fileTypeFromPath, validateSupportedFileType } from "./request/fileType.js";

// step 2 — existence (root module)
export {
  requireProject,
  requireProjectFile,
  requireFileVersion,
} from "./existence.js";

// step 3 — state/
export { requireActiveFile, requireArchivedFile } from "./state/fileStatus.js";

// step 4 — version/
export { checkVersionConflict } from "./version/versionMatch.js";

// step 5 — business/
export { checkPathConflict } from "./business/pathConflict.js";
export { requireContentChange } from "./business/noChanges.js";
export { requireSameFile } from "./business/versionMismatch.js";
