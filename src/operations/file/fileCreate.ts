import type { FileVersion, ProjectFile } from "../../domain/index.js";
import type { FileDTO, OperationResponse } from "../../dto/index.js";
import { toFileDTO } from "../../mappers/index.js";
import {
  listProjectFiles,
  readProject,
  writeFileVersion,
  writeProjectFile,
} from "../../storage/index.js";
import {
  checkPathConflict,
  requireNonEmptyString,
  requireProject,
  requireString,
  validateSupportedFileType,
} from "../../validation/index.js";
import { newId, nowIso } from "../ids.js";
import { fail, ok } from "../results.js";

/**
 * file.create — Section 8, File Operations.
 *
 * Effects: new ProjectFile (status "active") + FileVersion #1.
 * Project.versionId UNCHANGED — adding a file does not mutate the
 * Project object itself.
 */
export async function fileCreate(
  root: string,
  req: { projectId?: unknown; path?: unknown; content?: unknown },
): Promise<OperationResponse<FileDTO>> {
  // GVO 1 — request; UNSUPPORTED_FILE_TYPE is checked up front
  // (Section 6 marks it "request/business"), before any storage read.
  const bad =
    requireNonEmptyString(req.projectId, "projectId") ??
    requireNonEmptyString(req.path, "path") ??
    requireString(req.content, "content") ??
    validateSupportedFileType(req.path as string);
  if (bad !== null) return fail(bad);
  const projectId = req.projectId as string;
  const path = req.path as string;
  const content = req.content as string;

  // GVO 2 — existence
  const project = await readProject(root, projectId);
  const notFound = requireProject(project, projectId);
  if (project === null) return fail(notFound!);

  // GVO 3–4 — not applicable: no pre-existing object, no client-held version.

  // GVO 5 — business
  const siblings = await listProjectFiles(root, projectId);
  const pathTaken = checkPathConflict(path, siblings);
  if (pathTaken !== null) return fail(pathTaken);

  // Effects
  const file: ProjectFile = {
    id: newId(),
    projectId,
    path,
    versionId: newId(),
    status: "active",
  };
  const version: FileVersion = {
    id: newId(),
    fileId: file.id,
    versionNumber: 1,
    content,
    createdAt: nowIso(),
  };
  await writeFileVersion(root, projectId, version);
  await writeProjectFile(root, file);
  return ok(toFileDTO(file, content));
}
