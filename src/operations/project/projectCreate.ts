import type { Project } from "../../domain/index.js";
import type { OperationResponse, ProjectMetaDTO } from "../../dto/index.js";
import { toProjectMetaDTO } from "../../mappers/index.js";
import { writeProject } from "../../storage/index.js";
import { requireNonEmptyString } from "../../validation/index.js";
import { newId } from "../ids.js";
import { fail, ok } from "../results.js";

/**
 * project.create — Section 8, Project Operations.
 *
 * A full-fledged MCP tool (low risk, Section 9) — unlike project
 * deletion, which has no operation here at all.
 */
export async function projectCreate(
  root: string,
  req: { name?: unknown },
): Promise<OperationResponse<ProjectMetaDTO>> {
  // GVO 1 — request
  const bad = requireNonEmptyString(req.name, "name");
  if (bad !== null) return fail(bad);
  const name = req.name as string;

  // GVO 2–5 — not applicable. Duplicate project names are allowed:
  // Section 6 lists no name-conflict code and PATH_CONFLICT concerns
  // file paths only; `id` is the sole identity of a project.

  // Effects
  const project: Project = {
    id: newId(),
    name,
    defaultFileId: null,
    versionId: newId(),
  };
  await writeProject(root, project);
  return ok(toProjectMetaDTO(project));
}
