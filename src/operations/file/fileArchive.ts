import type { Project, ProjectFile } from "../../domain/index.js";
import type { FileMetaDTO, OperationResponse } from "../../dto/index.js";
import { toFileMetaDTO } from "../../mappers/index.js";
import {
  findProjectFileById,
  readProject,
  writeProject,
  writeProjectFile,
} from "../../storage/index.js";
import {
  checkVersionConflict,
  requireActiveFile,
  requireNonEmptyString,
  requireProjectFile,
} from "../../validation/index.js";
import { loadCurrentVersion } from "../currentVersion.js";
import { newId } from "../ids.js";
import { conflict, fail, ok } from "../results.js";

/**
 * file.archive — Section 8, File Operations.
 *
 * Effects: status "archived" + new ProjectFile ETag, NO FileVersion.
 * If the file was the project's default: Project.defaultFileId set
 * to null AND a new Project.versionId — the only file operation that
 * mutates the Project object. This is what structurally guarantees
 * the Section 2 invariant (defaultFileId only ever points at an
 * active file).
 */
export async function fileArchive(
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

  // GVO 3 — state (archiving an archived file → FILE_ARCHIVED)
  const archived = requireActiveFile(file);
  if (archived !== null) return fail(archived);

  // GVO 4 — version match
  const current = await loadCurrentVersion(root, file);
  const mismatch = checkVersionConflict(file, versionId, current.content);
  if (mismatch !== null) return conflict(mismatch);

  // GVO 5 — none for archive.

  // Effects — Project cleanup FIRST, status flip second: a crash in
  // between leaves a legal state (an active file that simply is no
  // longer the default), never a defaultFileId pointing at an
  // archived file — the Section 2 invariant projectOpen relies on.
  // Same cleanup-first order as fileDelete.
  const project = await readProject(root, file.projectId);
  if (project === null) {
    // The file was just read from under this project's directory.
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

  const updated: ProjectFile = { ...file, status: "archived", versionId: newId() };
  await writeProjectFile(root, updated);

  return ok(toFileMetaDTO(updated));
}
