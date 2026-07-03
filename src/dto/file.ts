/**
 * DTOs: FileDTO, FileMetaDTO
 *
 * Per ARCHITECTURE.md Sections 2, 4 & 7.
 *
 * `type` is always computed from `path` (Section 4) at the mapper
 * boundary (domain ProjectFile → DTO). It is never persisted on the
 * ProjectFile entity and must never be accepted as request input.
 *
 * `versionId` here is the ProjectFile ETag (ADR-006) — the same
 * field used by SearchResultDTO, and DIFFERENT from
 * HistoryEntryDTO.versionId, which is a FileVersion.id. See
 * history.ts / search.ts for the full contrast.
 */
export interface FileDTO {
  id: string;
  projectId: string;
  path: string;
  type: string;
  versionId: string;
  status: "active" | "archived";
  content: string;
}

/**
 * Identical to FileDTO minus `content`. Used wherever the caller
 * needs file identity/metadata but the (potentially large) content
 * body would be wasteful to transfer — e.g. listing pages
 * (project.files, ProjectOpenDTO.files) and structural responses
 * (file.move, file.archive, file.unarchive).
 */
export interface FileMetaDTO {
  id: string;
  projectId: string;
  path: string;
  type: string;
  versionId: string;
  status: "active" | "archived";
}
