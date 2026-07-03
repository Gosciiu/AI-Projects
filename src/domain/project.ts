/**
 * Domain entity: Project
 *
 * Per ARCHITECTURE.md Section 2.
 *
 * Invariant: `defaultFileId` may reference only a ProjectFile with
 * status "active". This is guaranteed structurally by the
 * file.archive operation (which clears defaultFileId when archiving
 * the default file) — do NOT add defensive checks elsewhere.
 *
 * `versionId` is an ETag of the ENTIRE Project object (ADR-006
 * extended). It changes whenever any Project field changes (e.g.
 * when file.archive clears defaultFileId). It is NOT a pointer to
 * any FileVersion.
 */
export interface Project {
  id: string;
  name: string;
  defaultFileId: string | null;
  versionId: string;
}
