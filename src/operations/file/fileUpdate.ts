import type { FileVersion, ProjectFile } from "../../domain/index.js";
import type { FileDTO, OperationResponse } from "../../dto/index.js";
import { toFileDTO } from "../../mappers/index.js";
import {
  findProjectFileById,
  writeFileVersion,
  writeProjectFile,
} from "../../storage/index.js";
import {
  checkVersionConflict,
  requireActiveFile,
  requireContentChange,
  requireNonEmptyString,
  requireProjectFile,
  requireString,
} from "../../validation/index.js";
import { loadCurrentVersion } from "../currentVersion.js";
import { newId, nowIso } from "../ids.js";
import { conflict, fail, ok } from "../results.js";

/**
 * file.update — Section 8, File Operations.
 *
 * Effects: new FileVersion (versionNumber + 1) + new ProjectFile
 * ETag. Project.versionId UNCHANGED.
 */
export async function fileUpdate(
  root: string,
  req: { fileId?: unknown; versionId?: unknown; content?: unknown },
): Promise<OperationResponse<FileDTO>> {
  // GVO 1 — request
  const bad =
    requireNonEmptyString(req.fileId, "fileId") ??
    requireNonEmptyString(req.versionId, "versionId") ??
    requireString(req.content, "content");
  if (bad !== null) return fail(bad);
  const fileId = req.fileId as string;
  const versionId = req.versionId as string;
  const content = req.content as string;

  // GVO 2 — existence
  const file = await findProjectFileById(root, fileId);
  const notFound = requireProjectFile(file, fileId);
  if (file === null) return fail(notFound!);

  // GVO 3 — state (before version match: an archived file is
  // FILE_ARCHIVED even for a client holding a stale ETag)
  const archived = requireActiveFile(file);
  if (archived !== null) return fail(archived);

  // GVO 4 — version match (never an error)
  const current = await loadCurrentVersion(root, file);
  const mismatch = checkVersionConflict(file, versionId, current.content);
  if (mismatch !== null) return conflict(mismatch);

  // GVO 5 — business (after step 4: identical content with a stale
  // ETag is a conflict, not NO_CHANGES)
  const noChange = requireContentChange(content, current.content);
  if (noChange !== null) return fail(noChange);

  // Effects — version written before the ETag flip, so a crash in
  // between leaves the old ETag pointing at consistent content.
  const version: FileVersion = {
    id: newId(),
    fileId: file.id,
    versionNumber: current.versionNumber + 1,
    content,
    createdAt: nowIso(),
  };
  const updated: ProjectFile = { ...file, versionId: newId() };
  await writeFileVersion(root, file.projectId, version);
  await writeProjectFile(root, updated);
  return ok(toFileDTO(updated, content));
}
