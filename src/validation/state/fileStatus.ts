import type { ProjectFile } from "../../domain/index.js";
import type { ErrorData } from "../../dto/index.js";
import { errorData } from "../errors.js";

/**
 * Global Validation Order step 3 — Object state (independent of the
 * client's request) → FILE_ARCHIVED / FILE_NOT_ARCHIVED.
 *
 * Runs AFTER existence (step 2) and BEFORE the version match
 * (step 4): a client holding a stale versionId of an archived file
 * gets FILE_ARCHIVED, not a conflict — the file's state blocks the
 * operation regardless of what version the client thinks it has.
 */

/**
 * File must be active. Used by: file.update, file.move,
 * file.archive (archiving an already-archived file is FILE_ARCHIVED),
 * file.version.restore (restore onto an archived file → unarchive
 * first).
 */
export function requireActiveFile(file: ProjectFile): ErrorData | null {
  if (file.status === "active") return null;
  return errorData("FILE_ARCHIVED", `File is archived: ${file.id}`);
}

/**
 * File must be archived. Used by: file.unarchive (unarchiving an
 * active file is FILE_NOT_ARCHIVED), file.delete (the two-step
 * safety catch: only archived files can be hard-deleted).
 */
export function requireArchivedFile(file: ProjectFile): ErrorData | null {
  if (file.status === "archived") return null;
  return errorData("FILE_NOT_ARCHIVED", `File is not archived: ${file.id}`);
}
