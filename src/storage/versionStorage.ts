import { rm } from "node:fs/promises";
import type { FileVersion } from "../domain/index.js";
import { readJson, writeJson, listJsonFiles, listSubdirs } from "./jsonFile.js";
import {
  fileVersionsDir,
  projectsDir,
  versionJsonPath,
  versionsDir,
} from "./paths.js";

/**
 * Storage: FileVersion (`versions/{fileId}/{versionId}.json`)
 *
 * Pure I/O per ARCHITECTURE.md Sections 10 & 11. Stored under
 * `{versionId}.json` — `versionNumber` exists only inside the JSON
 * body, never in the filename.
 */

export async function readFileVersion(
  root: string,
  projectId: string,
  fileId: string,
  versionId: string,
): Promise<FileVersion | null> {
  return readJson<FileVersion>(versionJsonPath(root, projectId, fileId, versionId));
}

/** Creates or overwrites `versions/{fileId}/{versionId}.json`. */
export async function writeFileVersion(
  root: string,
  projectId: string,
  version: FileVersion,
): Promise<void> {
  await writeJson(
    versionJsonPath(root, projectId, version.fileId, version.id),
    version,
  );
}

/**
 * Reads every FileVersion of a file. Works for active and archived
 * files alike (file.versions allows both). Unsorted — the
 * `versionNumber DESC` ordering required by file.versions and the
 * "first element = current version" navigation rule (ARCHITECTURE.md
 * Section 3) are applied in the operations layer.
 */
export async function listFileVersions(
  root: string,
  projectId: string,
  fileId: string,
): Promise<FileVersion[]> {
  const paths = await listJsonFiles(fileVersionsDir(root, projectId, fileId));
  const versions: FileVersion[] = [];
  for (const p of paths) {
    const version = await readJson<FileVersion>(p);
    if (version !== null) versions.push(version);
  }
  return versions;
}

/**
 * HARD DELETE of `versions/{fileId}/` — every FileVersion of the
 * file, physically. Part of file.delete (composed by the operation
 * together with fileStorage.deleteProjectFile). This is why
 * project.history loses the deleted file's entries — deliberate,
 * not a bug (ARCHITECTURE.md Section 8).
 */
export async function deleteAllFileVersions(
  root: string,
  projectId: string,
  fileId: string,
): Promise<void> {
  await rm(fileVersionsDir(root, projectId, fileId), {
    recursive: true,
    force: true,
  });
}

/**
 * Locates a FileVersion by `versionId` alone, scanning every
 * project's `versions/` tree.
 *
 * file.version.get / file.version.diff / file.version.restore
 * identify versions by bare, globally unique `versionId` (UUID v4)
 * with no fileId in the request. A versionId → fileId index is
 * explicitly forbidden (ARCHITECTURE.md Section 12 names exactly
 * this index as banned), so the scan probes
 * `versions/{fileId}/{versionId}.json` for each known fileId — an
 * existence check per file, not a read of every version.
 */
export async function findFileVersionById(
  root: string,
  versionId: string,
): Promise<FileVersion | null> {
  const projectIds = await listSubdirs(projectsDir(root));
  for (const projectId of projectIds) {
    const fileIds = await listSubdirs(versionsDir(root, projectId));
    for (const fileId of fileIds) {
      const version = await readFileVersion(root, projectId, fileId, versionId);
      if (version !== null) return version;
    }
  }
  return null;
}
