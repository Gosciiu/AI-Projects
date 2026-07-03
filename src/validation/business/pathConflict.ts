import type { ProjectFile } from "../../domain/index.js";
import type { ErrorData } from "../../dto/index.js";
import { errorData } from "../errors.js";

/**
 * Global Validation Order step 5 — PATH_CONFLICT (file.create,
 * file.move, file.unarchive).
 *
 * A conflict is another ACTIVE file occupying the candidate path.
 * Archived files do NOT block a path: Section 8 lists PATH_CONFLICT
 * as a possible outcome of file.unarchive, which is only coherent if
 * archived files keep their `path` without reserving it — an active
 * file may have taken the path in the meantime, and that is exactly
 * the case unarchive must reject.
 *
 * `excludeFileId` exists for file.move and file.unarchive, where the
 * subject file is itself in the listing and must not conflict with
 * its own path (e.g. move that changes only the extension case, or
 * any unarchive — the archived subject holds the candidate path).
 */
export function checkPathConflict(
  candidatePath: string,
  projectFiles: ProjectFile[],
  excludeFileId?: string,
): ErrorData | null {
  const conflicting = projectFiles.find(
    (f) =>
      f.status === "active" &&
      f.path === candidatePath &&
      f.id !== excludeFileId,
  );
  if (conflicting === undefined) return null;
  return errorData(
    "PATH_CONFLICT",
    `Path already used by active file ${conflicting.id}: ${candidatePath}`,
  );
}
