/**
 * DTOs: FileVersionDTO, FileVersionMetaDTO
 *
 * Per ARCHITECTURE.md Sections 2 & 7.
 *
 * Mirrors the FileDTO / FileMetaDTO split (file.ts): the Meta variant
 * drops `content` for listing use cases (file.versions), while the
 * full DTO is returned only when a single, specific version is
 * fetched (file.version.get) or produced (file.version.restore
 * returns FileDTO, not this type, since restore reports the file's
 * new current state).
 *
 * `id` is the globally unique FileVersion identifier — the same
 * value surfaced as HistoryEntryDTO.versionId. It is NOT the same
 * thing as ProjectFile.versionId (the ETag used by FileDTO /
 * FileMetaDTO / SearchResultDTO). See history.ts / search.ts.
 */
export interface FileVersionDTO {
  id: string;
  fileId: string;
  versionNumber: number;
  content: string;
  createdAt: string;
}

export interface FileVersionMetaDTO {
  id: string;
  fileId: string;
  versionNumber: number;
  createdAt: string;
}
