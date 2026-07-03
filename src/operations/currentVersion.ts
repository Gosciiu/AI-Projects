import type { FileVersion, ProjectFile } from "../domain/index.js";
import { listFileVersions } from "../storage/index.js";

/**
 * Newest FileVersion of a file — the Section 3 navigation rule
 * (versions sorted versionNumber DESC, first element = current)
 * implemented once for all operations that need current content
 * (file.read, the version-match step of every mutating file op,
 * NO_CHANGES checks, project.search.fulltext).
 *
 * Invariant: every ProjectFile has >= 1 FileVersion (file.create
 * writes version #1 together with the file). Zero versions therefore
 * means corrupted storage — this throws instead of returning null.
 */
export async function loadCurrentVersion(
  root: string,
  file: ProjectFile,
): Promise<FileVersion> {
  const versions = await listFileVersions(root, file.projectId, file.id);
  versions.sort((a, b) => b.versionNumber - a.versionNumber);
  const current = versions[0];
  if (current === undefined) {
    throw new Error(`Corrupted storage: file ${file.id} has no versions`);
  }
  return current;
}
