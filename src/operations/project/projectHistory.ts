import type { HistoryEntryDTO, OperationResponse, PageDTO } from "../../dto/index.js";
import { toHistoryEntryDTO } from "../../mappers/index.js";
import { listFileVersions, listProjectFiles, readProject } from "../../storage/index.js";
import {
  requireNonEmptyString,
  requireProject,
  validatePagination,
} from "../../validation/index.js";
import { paginate } from "../pagination.js";
import { fail, ok } from "../results.js";
import { compareAsc } from "../sort.js";

/**
 * project.history — Section 8, Project Operations.
 *
 * Aggregates the FileVersions of ALL the project's files — archived
 * included (their versions exist until file.delete physically
 * removes them, which is when history loses those entries;
 * deliberate, not a bug). Only file.create / file.update /
 * file.version.restore ever mint FileVersions, so move/archive/
 * unarchive are absent by construction — there is no operationType
 * field to distinguish the rest.
 *
 * Sorted `createdAt DESC` (chronology — one of the two exceptions to
 * path ASC), ties broken by versionNumber DESC for a stable order.
 * Iterates file-by-file with no index — acceptable for the MVP
 * (Section 10, YAGNI).
 */
export async function projectHistory(
  root: string,
  req: { projectId?: unknown; page?: unknown; pageSize?: unknown },
): Promise<OperationResponse<PageDTO<HistoryEntryDTO>>> {
  // GVO 1 — request
  const bad =
    requireNonEmptyString(req.projectId, "projectId") ??
    validatePagination(req.page, req.pageSize);
  if (bad !== null) return fail(bad);
  const projectId = req.projectId as string;
  const page = req.page as number;
  const pageSize = req.pageSize as number;

  // GVO 2 — existence
  const project = await readProject(root, projectId);
  const notFound = requireProject(project, projectId);
  if (project === null) return fail(notFound!);

  const files = await listProjectFiles(root, projectId);
  const entries: HistoryEntryDTO[] = [];
  for (const file of files) {
    const versions = await listFileVersions(root, projectId, file.id);
    for (const version of versions) {
      entries.push(toHistoryEntryDTO(file, version));
    }
  }
  entries.sort(
    (a, b) =>
      compareAsc(b.createdAt, a.createdAt) || b.versionNumber - a.versionNumber,
  );
  return ok(paginate(entries, page, pageSize));
}
