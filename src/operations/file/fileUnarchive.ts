import type { ProjectFile } from "../../domain/index.js";
import type { FileMetaDTO, OperationResponse } from "../../dto/index.js";
import { toFileMetaDTO } from "../../mappers/index.js";
import {
  findProjectFileById,
  listProjectFiles,
  writeProjectFile,
} from "../../storage/index.js";
import {
  checkPathConflict,
  checkVersionConflict,
  requireArchivedFile,
  requireNonEmptyString,
  requireProjectFile,
} from "../../validation/index.js";
import { loadCurrentVersion } from "../currentVersion.js";
import { newId } from "../ids.js";
import { conflict, fail, ok } from "../results.js";

/**
 * file.unarchive — Section 8, File Operations.
 *
 * Effects: status "active" + new ProjectFile ETag, NO FileVersion.
 * Does NOT restore Project.defaultFileId, even if this file was the
 * default before archiving — re-designating a default is a separate,
 * deliberate act.
 *
 * PATH_CONFLICT: an archived file keeps its path without reserving
 * it, so an active file may have taken it in the meantime — that is
 * exactly what step 5 rejects here.
 */
export async function fileUnarchive(
  root: string,
  req: { fileId?: unknown; versionId?: unknown },
): Promise<OperationResponse<FileMetaDTO>> {
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

  // GVO 3 — state (unarchiving an active file → FILE_NOT_ARCHIVED)
  const notArchived = requireArchivedFile(file);
  if (notArchived !== null) return fail(notArchived);

  // GVO 4 — version match
  const current = await loadCurrentVersion(root, file);
  const mismatch = checkVersionConflict(file, versionId, current.content);
  if (mismatch !== null) return conflict(mismatch);

  // GVO 5 — business (subject excluded: the archived file itself
  // holds the candidate path)
  const siblings = await listProjectFiles(root, file.projectId);
  const pathTaken = checkPathConflict(file.path, siblings, file.id);
  if (pathTaken !== null) return fail(pathTaken);

  // Effects
  const updated: ProjectFile = { ...file, status: "active", versionId: newId() };
  await writeProjectFile(root, updated);
  return ok(toFileMetaDTO(updated));
}
