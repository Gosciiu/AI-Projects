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
  requireActiveFile,
  requireNonEmptyString,
  requireProjectFile,
  validateSupportedFileType,
} from "../../validation/index.js";
import { loadCurrentVersion } from "../currentVersion.js";
import { newId } from "../ids.js";
import { conflict, fail, ok } from "../results.js";

/**
 * file.move — Section 8, File Operations.
 *
 * Effects: new path + new ProjectFile ETag. NO new FileVersion —
 * FileVersion records content history only (Section 2); `type` is
 * simply recomputed from the new path by the mappers.
 * Project.versionId UNCHANGED.
 *
 * A move to the file's own current path is NOT rejected: NO_CHANGES
 * belongs only to file.update / file.version.restore (Section 6),
 * so a same-path move succeeds and mints a fresh ETag.
 */
export async function fileMove(
  root: string,
  req: { fileId?: unknown; versionId?: unknown; newPath?: unknown },
): Promise<OperationResponse<FileMetaDTO>> {
  // GVO 1 — request (incl. UNSUPPORTED_FILE_TYPE for the new path)
  const bad =
    requireNonEmptyString(req.fileId, "fileId") ??
    requireNonEmptyString(req.versionId, "versionId") ??
    requireNonEmptyString(req.newPath, "newPath") ??
    validateSupportedFileType(req.newPath as string);
  if (bad !== null) return fail(bad);
  const fileId = req.fileId as string;
  const versionId = req.versionId as string;
  const newPath = req.newPath as string;

  // GVO 2 — existence
  const file = await findProjectFileById(root, fileId);
  const notFound = requireProjectFile(file, fileId);
  if (file === null) return fail(notFound!);

  // GVO 3 — state
  const archived = requireActiveFile(file);
  if (archived !== null) return fail(archived);

  // GVO 4 — version match
  const current = await loadCurrentVersion(root, file);
  const mismatch = checkVersionConflict(file, versionId, current.content);
  if (mismatch !== null) return conflict(mismatch);

  // GVO 5 — business (subject excluded: moving onto one's own path
  // must not conflict with oneself)
  const siblings = await listProjectFiles(root, file.projectId);
  const pathTaken = checkPathConflict(newPath, siblings, file.id);
  if (pathTaken !== null) return fail(pathTaken);

  // Effects
  const updated: ProjectFile = { ...file, path: newPath, versionId: newId() };
  await writeProjectFile(root, updated);
  return ok(toFileMetaDTO(updated));
}
