import type { Project, ProjectFile } from "../../domain/index.js";
import type { OperationResponse, ProjectMetaDTO } from "../../dto/index.js";
import { toProjectMetaDTO } from "../../mappers/index.js";
import {
  findProjectFileById,
  readProject,
  writeProject,
} from "../../storage/index.js";
import {
  checkProjectVersionConflict,
  requireActiveFile,
  requireFileInProject,
  requireNonEmptyString,
  requireNonEmptyStringOrNull,
  requireProject,
  requireProjectFile,
} from "../../validation/index.js";
import { newId } from "../ids.js";
import { conflict, fail, ok } from "../results.js";

/**
 * project.setDefaultFile — Section 8, operation 18 (added
 * 2026-07-03). Sets (`fileId: string`) or unsets (`fileId: null` —
 * explicit null, never undefined) the project's default file.
 *
 * The FIRST and only operation optimistically locking on
 * Project.versionId: `projectVersionId` is compared against the
 * Project ETag at step 4, and a mismatch yields ConflictData with
 * project-role field mapping (see checkProjectVersionConflict).
 *
 * Effects: defaultFileId = fileId + new Project.versionId. No
 * NO_CHANGES in this operation's contract — re-setting the same
 * value succeeds and mints a fresh ETag (like a same-path move).
 * Together with file.archive/file.delete (which clear the default)
 * this closes the default-file lifecycle: set / read / change /
 * clear.
 */
export async function projectSetDefaultFile(
  root: string,
  req: { projectId?: unknown; fileId?: unknown; projectVersionId?: unknown },
): Promise<OperationResponse<ProjectMetaDTO>> {
  // GVO 1 — request (fileId: non-empty string OR explicit null)
  const bad =
    requireNonEmptyString(req.projectId, "projectId") ??
    requireNonEmptyStringOrNull(req.fileId, "fileId") ??
    requireNonEmptyString(req.projectVersionId, "projectVersionId");
  if (bad !== null) return fail(bad);
  const projectId = req.projectId as string;
  const fileId = req.fileId as string | null;
  const projectVersionId = req.projectVersionId as string;

  // GVO 2 — existence: the project, then (when setting) the file
  const project = await readProject(root, projectId);
  const noProject = requireProject(project, projectId);
  if (project === null) return fail(noProject!);

  let file: ProjectFile | null = null;
  if (fileId !== null) {
    file = await findProjectFileById(root, fileId);
    const noFile = requireProjectFile(file, fileId);
    if (file === null) return fail(noFile!);

    // GVO 3 — state: Section 2 invariant, the default may only ever
    // point at an ACTIVE file
    const archived = requireActiveFile(file);
    if (archived !== null) return fail(archived);
  }

  // GVO 4 — version match on the PROJECT ETag (never an error)
  const mismatch = checkProjectVersionConflict(project, projectVersionId);
  if (mismatch !== null) return conflict(mismatch);

  // GVO 5 — business: the file must belong to THIS project
  // (FILE_NOT_FOUND — Section 8 footnote, no new error code)
  if (file !== null) {
    const foreign = requireFileInProject(file, projectId);
    if (foreign !== null) return fail(foreign);
  }

  // Effects
  const updated: Project = {
    ...project,
    defaultFileId: fileId,
    versionId: newId(),
  };
  await writeProject(root, updated);
  return ok(toProjectMetaDTO(updated));
}
