/**
 * DTO: DiffDTO
 *
 * Per ARCHITECTURE.md Section 7 & 8 (file.version.diff).
 *
 * `fromVersionId`/`toVersionId` must reference FileVersions sharing
 * the same `fileId`; otherwise the operation rejects the request
 * with VERSION_MISMATCH before ever producing a DiffDTO. `diff` is
 * plain unified-diff text — AI Workspace is domain-agnostic (ADR-001)
 * and performs zero semantic interpretation of the content it diffs.
 */
export interface DiffDTO {
  fileId: string;
  fromVersionId: string;
  fromVersionNumber: number;
  toVersionId: string;
  toVersionNumber: number;
  diff: string;
}
