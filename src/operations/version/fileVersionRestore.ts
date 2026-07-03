import type { FileVersion, ProjectFile } from "../../domain/index.js";
import type { FileDTO, OperationResponse } from "../../dto/index.js";
import { toFileDTO } from "../../mappers/index.js";
import {
  findFileVersionById,
  findProjectFileById,
  writeFileVersion,
  writeProjectFile,
} from "../../storage/index.js";
import {
  checkVersionConflict,
  requireActiveFile,
  requireContentChange,
  requireFileVersion,
  requireNonEmptyString,
} from "../../validation/index.js";
import { loadCurrentVersion } from "../currentVersion.js";
import { newId, nowIso } from "../ids.js";
import { conflict, fail, ok } from "../results.js";

/**
 * file.version.restore — Section 8, File Version Operations.
 *
 * NEVER rewinds history (ADR-005): restoring v2 onto a file at v4
 * creates v5 whose content equals v2's. `targetVersionId` names the
 * FileVersion to restore; `currentVersionId` is the client-held
 * ProjectFile ETag for the optimistic-lock check — two different
 * identifier kinds in one request (Section 3).
 *
 * Requires an active file (FILE_ARCHIVED → unarchive first);
 * restoring content identical to the current version → NO_CHANGES
 * (no redundant FileVersion is ever minted).
 */
export async function fileVersionRestore(
  root: string,
  req: { targetVersionId?: unknown; currentVersionId?: unknown },
): Promise<OperationResponse<FileDTO>> {
  // GVO 1 — request
  const bad =
    requireNonEmptyString(req.targetVersionId, "targetVersionId") ??
    requireNonEmptyString(req.currentVersionId, "currentVersionId");
  if (bad !== null) return fail(bad);
  const targetVersionId = req.targetVersionId as string;
  const currentVersionId = req.currentVersionId as string;

  // GVO 2 — existence (the target version; its owning file existing
  // is an invariant, not a client-addressable error — FILE_NOT_FOUND
  // is absent from restore's error list)
  const target = await findFileVersionById(root, targetVersionId);
  const notFound = requireFileVersion(target, targetVersionId);
  if (target === null) return fail(notFound!);

  const file = await findProjectFileById(root, target.fileId);
  if (file === null) {
    throw new Error(
      `Corrupted storage: file ${target.fileId} missing for version ${target.id}`,
    );
  }

  // GVO 3 — state
  const archived = requireActiveFile(file);
  if (archived !== null) return fail(archived);

  // GVO 4 — version match (against the client-held ETag)
  const current = await loadCurrentVersion(root, file);
  const mismatch = checkVersionConflict(file, currentVersionId, current.content);
  if (mismatch !== null) return conflict(mismatch);

  // GVO 5 — business
  const noChange = requireContentChange(target.content, current.content);
  if (noChange !== null) return fail(noChange);

  // Effects — same write order as fileUpdate: version before ETag flip.
  const version: FileVersion = {
    id: newId(),
    fileId: file.id,
    versionNumber: current.versionNumber + 1,
    content: target.content,
    createdAt: nowIso(),
  };
  const updated: ProjectFile = { ...file, versionId: newId() };
  await writeFileVersion(root, file.projectId, version);
  await writeProjectFile(root, updated);
  return ok(toFileDTO(updated, target.content));
}
