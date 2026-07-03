import type { ProjectFile } from "../domain/index.js";
import type { FileDTO, FileMetaDTO, SearchResultDTO } from "../dto/index.js";
import { fileTypeFromPath } from "../validation/index.js";

/**
 * Mappers: ProjectFile → FileDTO / FileMetaDTO / SearchResultDTO.
 *
 * `type` is always computed here from `path` via fileTypeFromPath()
 * — the single implementation of the Section 4 rule, shared with
 * validation. Never read `type` from anywhere else.
 *
 * `content` is not a ProjectFile field (it lives in FileVersion), so
 * toFileDTO takes it as a parameter — the operation supplies the
 * current version's content.
 */

function computedType(file: ProjectFile): string {
  const type = fileTypeFromPath(file.path);
  if (type === null) {
    // file.create / file.move validate the path before persisting, so
    // an unsupported extension on a STORED file means corrupted storage
    // — an invariant violation, not a client error.
    throw new Error(
      `Corrupted storage: file ${file.id} has unsupported path "${file.path}"`,
    );
  }
  return type;
}

export function toFileDTO(file: ProjectFile, content: string): FileDTO {
  return {
    id: file.id,
    projectId: file.projectId,
    path: file.path,
    type: computedType(file),
    versionId: file.versionId,
    status: file.status,
    content,
  };
}

export function toFileMetaDTO(file: ProjectFile): FileMetaDTO {
  return {
    id: file.id,
    projectId: file.projectId,
    path: file.path,
    type: computedType(file),
    versionId: file.versionId,
    status: file.status,
  };
}

/**
 * SearchResultDTO.versionId = ProjectFile.versionId (ETag): search
 * shows the file's CURRENT state (Section 7). Deliberately different
 * from toHistoryEntryDTO (versionMappers.ts), which puts a
 * FileVersion.id under the same field name.
 */
export function toSearchResultDTO(
  file: ProjectFile,
  excerpt: string,
): SearchResultDTO {
  return {
    fileId: file.id,
    filePath: file.path,
    versionId: file.versionId,
    excerpt,
  };
}
