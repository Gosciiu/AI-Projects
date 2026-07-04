import type { Project, ProjectFile } from "../../domain/index.js";
import type { ConflictData } from "../../dto/index.js";

/**
 * Global Validation Order step 4 — Version match.
 *
 * NEVER an error code. A mismatch produces ConflictData, which the
 * operation wraps as `{ status: "conflict", data }` — a first-class
 * response branch (Section 5). This module therefore does not import
 * errors.ts at all; that is deliberate and should stay that way.
 *
 * The compared versionId is the ProjectFile ETag (ADR-006) — it
 * moves on content, path AND status changes, so a client that last
 * saw the file before a move/archive also conflicts here (if it got
 * past step 3), not just one that missed a content update.
 *
 * `currentContent` is the content of the file's newest FileVersion.
 * Validators are pure — the operation loads it (file.versions,
 * versionNumber DESC, first element; Section 3) and passes it in, so
 * the returned ConflictData can hand the client the current state to
 * rebase onto.
 */
export function checkVersionConflict(
  file: ProjectFile,
  requestedVersionId: string,
  currentContent: string,
): ConflictData | null {
  if (file.versionId === requestedVersionId) return null;
  return {
    fileId: file.id,
    versionId: file.versionId,
    content: currentContent,
  };
}

/**
 * Step 4 for the PROJECT object — used only by project.setDefaultFile,
 * the single operation optimistically locking on Project.versionId
 * (Section 8, operation 18; Section 12).
 *
 * ConflictData's shape is frozen and file-flavored (Section 7), so
 * the mapping preserves each field's ROLE from the file case rather
 * than its name:
 *   fileId    = id of the conflicted object    → project.id
 *   versionId = its CURRENT ETag (for retry)   → project.versionId
 *   content   = its current contested state    → current defaultFileId,
 *               "" when null (file ids are UUIDs, never empty, so ""
 *               is unambiguous)
 */
export function checkProjectVersionConflict(
  project: Project,
  requestedVersionId: string,
): ConflictData | null {
  if (project.versionId === requestedVersionId) return null;
  return {
    fileId: project.id,
    versionId: project.versionId,
    content: project.defaultFileId ?? "",
  };
}
