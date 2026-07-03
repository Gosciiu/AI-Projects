import type { FileVersion, ProjectFile } from "../domain/index.js";
import type {
  DiffDTO,
  FileVersionDTO,
  FileVersionMetaDTO,
  HistoryEntryDTO,
} from "../dto/index.js";

/**
 * Mappers: FileVersion → FileVersionDTO / FileVersionMetaDTO /
 * HistoryEntryDTO / DiffDTO.
 */

export function toFileVersionDTO(version: FileVersion): FileVersionDTO {
  return {
    id: version.id,
    fileId: version.fileId,
    versionNumber: version.versionNumber,
    content: version.content,
    createdAt: version.createdAt,
  };
}

export function toFileVersionMetaDTO(version: FileVersion): FileVersionMetaDTO {
  return {
    id: version.id,
    fileId: version.fileId,
    versionNumber: version.versionNumber,
    createdAt: version.createdAt,
  };
}

/**
 * HistoryEntryDTO.versionId = FileVersion.id: history identifies a
 * SPECIFIC point in time (Section 7). Deliberately different from
 * toSearchResultDTO (fileMappers.ts), which puts the ProjectFile
 * ETag under the same field name. `filePath` is the file's CURRENT
 * path — FileVersion records content only, never paths.
 */
export function toHistoryEntryDTO(
  file: ProjectFile,
  version: FileVersion,
): HistoryEntryDTO {
  return {
    fileId: file.id,
    filePath: file.path,
    versionId: version.id,
    versionNumber: version.versionNumber,
    createdAt: version.createdAt,
  };
}

/** `diff` is plain unified-diff text produced by the operation. */
export function toDiffDTO(
  from: FileVersion,
  to: FileVersion,
  diff: string,
): DiffDTO {
  return {
    fileId: from.fileId,
    fromVersionId: from.id,
    fromVersionNumber: from.versionNumber,
    toVersionId: to.id,
    toVersionNumber: to.versionNumber,
    diff,
  };
}
