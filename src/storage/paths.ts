import path from "node:path";

/**
 * Filesystem Layout — path builders, 1:1 with ARCHITECTURE.md
 * Section 10:
 *
 *   data/
 *     projects/
 *       {projectId}/
 *         project.json
 *         files/
 *           {fileId}.json
 *         versions/
 *           {fileId}/
 *             {versionId}.json
 *
 * On-disk names are always IDs, never business attributes:
 *   - ProjectFile is stored as `{fileId}.json`, NOT under its `path`
 *     (path is unstable and may contain characters illegal on disk).
 *   - FileVersion is stored as `{versionId}.json`, NOT under its
 *     `versionNumber` (versionNumber lives only inside the JSON;
 *     the API identifier is always FileVersion.id).
 *
 * Every path in the storage layer must be built through these
 * helpers — no ad-hoc `path.join` elsewhere.
 */

/** Default data root, relative to the process working directory. */
export const DEFAULT_DATA_ROOT = "data";

export function projectsDir(root: string): string {
  return path.join(root, "projects");
}

export function projectDir(root: string, projectId: string): string {
  return path.join(projectsDir(root), projectId);
}

export function projectJsonPath(root: string, projectId: string): string {
  return path.join(projectDir(root, projectId), "project.json");
}

export function filesDir(root: string, projectId: string): string {
  return path.join(projectDir(root, projectId), "files");
}

export function fileJsonPath(
  root: string,
  projectId: string,
  fileId: string,
): string {
  return path.join(filesDir(root, projectId), `${fileId}.json`);
}

export function versionsDir(root: string, projectId: string): string {
  return path.join(projectDir(root, projectId), "versions");
}

export function fileVersionsDir(
  root: string,
  projectId: string,
  fileId: string,
): string {
  return path.join(versionsDir(root, projectId), fileId);
}

export function versionJsonPath(
  root: string,
  projectId: string,
  fileId: string,
  versionId: string,
): string {
  return path.join(fileVersionsDir(root, projectId, fileId), `${versionId}.json`);
}
