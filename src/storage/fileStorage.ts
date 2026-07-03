import { rm } from "node:fs/promises";
import type { ProjectFile } from "../domain/index.js";
import { readJson, writeJson, listJsonFiles, listSubdirs } from "./jsonFile.js";
import { fileJsonPath, filesDir, projectsDir } from "./paths.js";

/**
 * Storage: ProjectFile (`files/{fileId}.json`)
 *
 * Pure I/O per ARCHITECTURE.md Sections 10 & 11. Stored under
 * `{fileId}.json` — never under the business `path` field.
 */

export async function readProjectFile(
  root: string,
  projectId: string,
  fileId: string,
): Promise<ProjectFile | null> {
  return readJson<ProjectFile>(fileJsonPath(root, projectId, fileId));
}

/** Creates or overwrites `files/{fileId}.json`. */
export async function writeProjectFile(
  root: string,
  file: ProjectFile,
): Promise<void> {
  await writeJson(fileJsonPath(root, file.projectId, file.id), file);
}

/**
 * Reads every ProjectFile of a project (active AND archived).
 * Unsorted — filtering by status, sorting (`path ASC`) and
 * pagination are the operations layer's concern.
 */
export async function listProjectFiles(
  root: string,
  projectId: string,
): Promise<ProjectFile[]> {
  const paths = await listJsonFiles(filesDir(root, projectId));
  const files: ProjectFile[] = [];
  for (const p of paths) {
    const file = await readJson<ProjectFile>(p);
    if (file !== null) files.push(file);
  }
  return files;
}

/**
 * Deletes ONLY `files/{fileId}.json`. The physical removal of the
 * file's versions dir is versionStorage.deleteAllFileVersions() —
 * the file.delete operation composes both (plus the defensive
 * `defaultFileId` cleanup on Project). Storage stays primitive.
 */
export async function deleteProjectFile(
  root: string,
  projectId: string,
  fileId: string,
): Promise<void> {
  await rm(fileJsonPath(root, projectId, fileId), { force: true });
}

/**
 * Locates a ProjectFile by `fileId` alone, scanning every project.
 *
 * Needed because most File Operations (file.read, file.update, …)
 * identify the file by bare `fileId` with no `projectId` in the
 * request. A global fileId → projectId index is explicitly forbidden
 * (ARCHITECTURE.md Sections 10 & 12: no indexes, no cache), so a
 * linear scan over `data/projects/*` is the intended MVP behavior —
 * do not "optimize" this with a lookup table.
 */
export async function findProjectFileById(
  root: string,
  fileId: string,
): Promise<ProjectFile | null> {
  const projectIds = await listSubdirs(projectsDir(root));
  for (const projectId of projectIds) {
    const file = await readProjectFile(root, projectId, fileId);
    if (file !== null) return file;
  }
  return null;
}
