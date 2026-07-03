/**
 * DTO: HistoryEntryDTO
 *
 * Per ARCHITECTURE.md Section 7 (project.history).
 *
 * CRITICAL — do not confuse with SearchResultDTO.versionId (search.ts):
 *   HistoryEntryDTO.versionId  = FileVersion.id
 *   SearchResultDTO.versionId  = ProjectFile.versionId (ETag)
 *
 * This is deliberate, not a naming bug: project.history shows many
 * historical points in time for a file, so each row must identify a
 * SPECIFIC FileVersion. project.search.fulltext shows only the
 * file's current state, so its `versionId` is the ETag of that
 * current state instead. Same field name, intentionally different
 * semantics per ARCHITECTURE.md Section 7.
 *
 * Only aggregates FileVersions created by file.create, file.update,
 * and file.version.restore — file.move/archive/unarchive never
 * appear here since they don't produce a FileVersion. There is no
 * `operationType` field to distinguish create/update/restore.
 */
export interface HistoryEntryDTO {
  fileId: string;
  filePath: string;
  versionId: string;
  versionNumber: number;
  createdAt: string;
}
