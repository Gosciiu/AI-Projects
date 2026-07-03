import type { OperationResponse, PageDTO, ProjectMetaDTO } from "../../dto/index.js";
import { toProjectMetaDTO } from "../../mappers/index.js";
import { listProjects } from "../../storage/index.js";
import { validatePagination } from "../../validation/index.js";
import { paginate } from "../pagination.js";
import { fail, ok } from "../results.js";
import { compareAsc } from "../sort.js";

/**
 * project.list — Section 8, Project Operations.
 *
 * Sorted `name ASC` (review decision 2026-07-03: projects have no
 * `path`; name is the analogue, as already specified in
 * docs/Architecture_FINAL.md).
 */
export async function projectList(
  root: string,
  req: { page?: unknown; pageSize?: unknown },
): Promise<OperationResponse<PageDTO<ProjectMetaDTO>>> {
  // GVO 1 — request
  const bad = validatePagination(req.page, req.pageSize);
  if (bad !== null) return fail(bad);
  const page = req.page as number;
  const pageSize = req.pageSize as number;

  const projects = await listProjects(root);
  projects.sort((a, b) => compareAsc(a.name, b.name));
  return ok(paginate(projects.map(toProjectMetaDTO), page, pageSize));
}
