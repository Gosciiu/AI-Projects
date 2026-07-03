/**
 * Domain entity: FileVersion
 *
 * Per ARCHITECTURE.md Section 2.
 *
 * Represents CONTENT history only. Does NOT record path or status
 * changes (ADR-005 as corrected by ADR-006):
 *   - Creates FileVersion: file.create, file.update, file.version.restore
 *   - Does NOT create FileVersion: file.move, file.archive, file.unarchive
 *
 * `id` is the globally unique identifier used across the MCP API
 * (file.version.get, file.version.diff, file.version.restore,
 * HistoryEntryDTO.versionId). It is NOT the same thing as
 * ProjectFile.versionId (which is an ETag).
 *
 * `versionNumber` is a sequential business attribute (1, 2, 3, …)
 * scoped per file. It exists only inside the JSON content on disk —
 * never in the filename (Filesystem Layout, ARCHITECTURE.md
 * Section 10).
 *
 * Restore never rewinds history: restoring v2 on a file at v4
 * creates v5 whose content equals v2's content.
 */
export interface FileVersion {
  id: string;
  fileId: string;
  versionNumber: number;
  content: string;
  createdAt: string; // ISO 8601
}
