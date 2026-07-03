import type { Project } from "../../domain/index.js";
import type { OperationResponse } from "../../dto/index.js";
import {
  deleteAllFileVersions,
  deleteProjectFile,
  findProjectFileById,
  readProject,
  writeProject,
} from "../../storage/index.js";
import {
  checkVersionConflict,
  requireArchivedFile,
  requireNonEmptyString,
  requireProjectFile,
} from "../../validation/index.js";
import { loadCurrentVersion } from "../currentVersion.js";
import { newId } from "../ids.js";
import { conflict, fail, ok } from "../results.js";

/**
 * file.delete — Section 8, File Operations.
 *
 * Two-step safety catch: only an ARCHIVED file can be deleted
 * (FILE_NOT_ARCHIVED otherwise) — archive first, delete second.
 *
 * HARD DELETE: composes the storage primitives deleteProjectFile +
 * deleteAllFileVersions. project.history loses this file's entries —
 * deliberate, not a bug. defaultFileId is cleared DEFENSIVELY:
 * file.archive already cleared it (delete requires archived status),
 * so this only fires on storage corrupted by other means.
 *
 * NOT project.delete — deleting a whole project is not an MCP-facing
 * operation at all (Section 9).
 */
export async function fileDelete(
  root: string,
  req: { fileId?: unknown; versionId?: unknown },
): Promise<OperationResponse<null>> {
  // GVO 1 — request
  const bad =
    requireNonEmptyString(req.fileId, "fileId") ??
    requireNonEmptyString(req.versionId, "versionId");
  if (bad !== null) return fail(bad);
  const fileId = req.fileId as string;
  const versionId = req.versionId as string;

  // GVO 2 — existence
  const file = await findProjectFileById(root, fileId);
  const notFound = requireProjectFile(file, fileId);
  if (file === null) return fail(notFound!);

  // GVO 3 — state (two-step safety: must be archived)
  const notArchived = requireArchivedFile(file);
  if (notArchived !== null) return fail(notArchived);

  // GVO 4 — version match
  const current = await loadCurrentVersion(root, file);
  const mismatch = checkVersionConflict(file, versionId, current.content);
  if (mismatch !== null) return conflict(mismatch);

  // GVO 5 — none for delete.

  // Effects — defensive defaultFileId cleanup first.
  const project = await readProject(root, file.projectId);
  if (project === null) {
    throw new Error(
      `Corrupted storage: project ${file.projectId} missing for file ${file.id}`,
    );
  }
  if (project.defaultFileId === file.id) {
    const updatedProject: Project = {
      ...project,
      defaultFileId: null,
      versionId: newId(),
    };
    await writeProject(root, updatedProject);
  }

  // ProjectFile record first, then versions: a crash in between
  // leaves orphaned (invisible to file-scoped reads) version files
  // rather than a visible file whose content is gone.
  await deleteProjectFile(root, file.projectId, file.id);
  await deleteAllFileVersions(root, file.projectId, file.id);

  return ok(null);
}
