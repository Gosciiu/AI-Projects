import type { FileVersionMetaDTO, OperationResponse, PageDTO } from "../../dto/index.js";
import { toFileVersionMetaDTO } from "../../mappers/index.js";
import { findProjectFileById, listFileVersions } from "../../storage/index.js";
import {
  requireNonEmptyString,
  requireProjectFile,
  validatePagination,
} from "../../validation/index.js";
import { paginate } from "../pagination.js";
import { fail, ok } from "../results.js";

/**
 * file.versions — Section 8, File Version Operations.
 *
 * Works on active AND archived files (no FILE_ARCHIVED in its error
 * list). Sorted `versionNumber DESC` (chronology — the other
 * exception to path ASC): first element = current version, the
 * Section 3 navigation rule clients use to reach the newest content.
 */
export async function fileVersions(
  root: string,
  req: { fileId?: unknown; page?: unknown; pageSize?: unknown },
): Promise<OperationResponse<PageDTO<FileVersionMetaDTO>>> {
  // GVO 1 — request
  const bad =
    requireNonEmptyString(req.fileId, "fileId") ??
    validatePagination(req.page, req.pageSize);
  if (bad !== null) return fail(bad);
  const fileId = req.fileId as string;
  const page = req.page as number;
  const pageSize = req.pageSize as number;

  // GVO 2 — existence
  const file = await findProjectFileById(root, fileId);
  const notFound = requireProjectFile(file, fileId);
  if (file === null) return fail(notFound!);

  const versions = await listFileVersions(root, file.projectId, file.id);
  versions.sort((a, b) => b.versionNumber - a.versionNumber);
  return ok(paginate(versions.map(toFileVersionMetaDTO), page, pageSize));
}
