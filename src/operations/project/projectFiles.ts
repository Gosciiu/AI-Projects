import type { FileMetaDTO, OperationResponse, PageDTO } from "../../dto/index.js";
import { toFileMetaDTO } from "../../mappers/index.js";
import { listProjectFiles, readProject } from "../../storage/index.js";
import {
  requireNonEmptyString,
  requireOptionalStatusFilter,
  requireProject,
  validatePagination,
} from "../../validation/index.js";
import { paginate } from "../pagination.js";
import { fail, ok } from "../results.js";
import { compareAsc } from "../sort.js";

/**
 * project.files — Section 8, Project Operations.
 *
 * No `status` filter → ALL files, active AND archived (this is the
 * one listing where archived files surface by default; project.open
 * and search are active-only). Sorted `path ASC`.
 */
export async function projectFiles(
  root: string,
  req: {
    projectId?: unknown;
    status?: unknown;
    page?: unknown;
    pageSize?: unknown;
  },
): Promise<OperationResponse<PageDTO<FileMetaDTO>>> {
  // GVO 1 — request
  const bad =
    requireNonEmptyString(req.projectId, "projectId") ??
    requireOptionalStatusFilter(req.status) ??
    validatePagination(req.page, req.pageSize);
  if (bad !== null) return fail(bad);
  const projectId = req.projectId as string;
  const status = req.status as "active" | "archived" | undefined;
  const page = req.page as number;
  const pageSize = req.pageSize as number;

  // GVO 2 — existence
  const project = await readProject(root, projectId);
  const notFound = requireProject(project, projectId);
  if (project === null) return fail(notFound!);

  const all = await listProjectFiles(root, projectId);
  const filtered =
    status === undefined ? all : all.filter((f) => f.status === status);
  filtered.sort((a, b) => compareAsc(a.path, b.path));
  return ok(paginate(filtered.map(toFileMetaDTO), page, pageSize));
}
