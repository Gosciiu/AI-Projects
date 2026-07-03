/**
 * DTO: SearchResultDTO
 *
 * Per ARCHITECTURE.md Section 7 (project.search.fulltext).
 *
 * CRITICAL — do not confuse with HistoryEntryDTO.versionId (history.ts):
 *   SearchResultDTO.versionId  = ProjectFile.versionId (ETag)
 *   HistoryEntryDTO.versionId  = FileVersion.id
 *
 * project.search.fulltext only ever matches against the CURRENT
 * content of `active` files, so there is exactly one relevant
 * version per result: the file's present state, identified by its
 * ProjectFile ETag — the same field used by FileDTO/FileMetaDTO.
 * There is no ranking/scoring field; results sort `path ASC`.
 */
export interface SearchResultDTO {
  fileId: string;
  filePath: string;
  versionId: string;
  excerpt: string;
}
