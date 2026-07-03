/**
 * Mappers layer — Domain Model → DTO (ARCHITECTURE.md Section 11).
 * Pure functions; `type` computation is delegated to
 * validation/request/fileType.ts (single implementation, Section 4).
 */
export { toFileDTO, toFileMetaDTO, toSearchResultDTO } from "./fileMappers.js";
export { toProjectMetaDTO } from "./projectMappers.js";
export {
  toFileVersionDTO,
  toFileVersionMetaDTO,
  toHistoryEntryDTO,
  toDiffDTO,
} from "./versionMappers.js";
