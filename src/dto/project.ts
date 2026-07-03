import type { FileDTO, FileMetaDTO } from "./file.js";
import type { PageDTO } from "./page.js";

/**
 * DTOs: ProjectMetaDTO, ProjectOpenDTO
 *
 * Per ARCHITECTURE.md Section 7.
 *
 * ProjectMetaDTO was added when specifying project.create /
 * project.list (2026-06-30), which is why the DTO count grew from
 * 12 to 13 relative to the original MCP Contract — it is not a new
 * decision made while writing ARCHITECTURE.md itself, just a later
 * addition to it.
 */
export interface ProjectMetaDTO {
  id: string;
  name: string;
  versionId: string;
}

/**
 * Invariant: exactly ONE of `defaultFile` / `files` is non-null,
 * mirroring project.open's branching (Section 8):
 *   - `Project.defaultFileId != null` → `defaultFile` set, `files: null`.
 *   - otherwise                       → `defaultFile: null`, `files` set
 *     to a page of active-only FileMetaDTOs, sorted `path ASC`.
 *
 * `defaultFile` is a full FileDTO (content included) since opening a
 * project with a default file is meant to hand the caller its
 * content directly; the fallback `files` listing intentionally uses
 * the content-less FileMetaDTO instead.
 */
export interface ProjectOpenDTO {
  defaultFile: FileDTO | null;
  files: PageDTO<FileMetaDTO> | null;
}
