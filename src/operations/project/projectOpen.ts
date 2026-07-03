import type { OperationResponse, ProjectOpenDTO } from "../../dto/index.js";
import { toFileDTO, toFileMetaDTO } from "../../mappers/index.js";
import { listProjectFiles, readProject, readProjectFile } from "../../storage/index.js";
import { requireNonEmptyString, requireProject } from "../../validation/index.js";
import { loadCurrentVersion } from "../currentVersion.js";
import { fail, ok } from "../results.js";
import { compareAsc } from "../sort.js";

/**
 * project.open — Section 8, Project Operations.
 *
 * Exactly one branch of ProjectOpenDTO is non-null:
 *   - defaultFileId set → `defaultFile` (full FileDTO with content),
 *     `files: null`.
 *   - otherwise → `defaultFile: null`, `files` = ACTIVE files only,
 *     `path ASC`, as ONE full page (review decision 2026-07-03:
 *     page 1, pageSize = total = item count, nothing truncated — no
 *     hidden limit; pagination is project.files' job, project.open
 *     takes no page params).
 */
export async function projectOpen(
  root: string,
  req: { projectId?: unknown },
): Promise<OperationResponse<ProjectOpenDTO>> {
  // GVO 1 — request
  const bad = requireNonEmptyString(req.projectId, "projectId");
  if (bad !== null) return fail(bad);
  const projectId = req.projectId as string;

  // GVO 2 — existence
  const project = await readProject(root, projectId);
  const notFound = requireProject(project, projectId);
  if (project === null) return fail(notFound!);

  if (project.defaultFileId !== null) {
    const file = await readProjectFile(root, project.id, project.defaultFileId);
    if (file === null) {
      // Section 2 invariant: defaultFileId only ever points at an
      // existing active file (file.archive/delete clear it).
      throw new Error(
        `Corrupted storage: defaultFileId ${project.defaultFileId} of project ${project.id} does not exist`,
      );
    }
    const current = await loadCurrentVersion(root, file);
    return ok({ defaultFile: toFileDTO(file, current.content), files: null });
  }

  const active = (await listProjectFiles(root, project.id)).filter(
    (f) => f.status === "active",
  );
  active.sort((a, b) => compareAsc(a.path, b.path));
  const items = active.map(toFileMetaDTO);
  return ok({
    defaultFile: null,
    files: { items, page: 1, pageSize: items.length, total: items.length },
  });
}
