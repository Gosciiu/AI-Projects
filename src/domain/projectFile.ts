/**
 * Domain entity: ProjectFile
 *
 * Per ARCHITECTURE.md Section 2.
 *
 * CRITICAL (ADR-006): `versionId` is an ETag of the ENTIRE
 * ProjectFile object — NOT a pointer to FileVersion.id. It changes
 * on EVERY modification of this object:
 *   - file.update  (content change)
 *   - file.move    (path change)
 *   - file.archive / file.unarchive (status change)
 *
 * To reach the current FileVersion, navigate via file.versions
 * (sorted versionNumber DESC; first element = current).
 *
 * Deliberately absent fields:
 *   - `content` — lives exclusively in FileVersion (Single Source
 *     of Truth; no data duplication).
 *   - `type` — computed from `path` extension (see ARCHITECTURE.md
 *     Section 4); never stored, never accepted as request input.
 */
export type FileStatus = "active" | "archived";

export interface ProjectFile {
  id: string;
  projectId: string;
  path: string;
  versionId: string;
  status: FileStatus;
}
