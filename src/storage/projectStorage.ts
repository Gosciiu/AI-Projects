import { rm } from "node:fs/promises";
import type { Project } from "../domain/index.js";
import { readJson, writeJson, listSubdirs } from "./jsonFile.js";
import { projectDir, projectJsonPath, projectsDir } from "./paths.js";

/**
 * Storage: Project (`project.json`)
 *
 * Pure I/O per ARCHITECTURE.md Sections 10 & 11. No validation, no
 * error codes, no ID generation — those belong to the validation /
 * operations layers. Absence is `null`.
 */

export async function readProject(
  root: string,
  projectId: string,
): Promise<Project | null> {
  return readJson<Project>(projectJsonPath(root, projectId));
}

/** Creates or overwrites `project.json` (directories made on demand). */
export async function writeProject(root: string, project: Project): Promise<void> {
  await writeJson(projectJsonPath(root, project.id), project);
}

/**
 * Reads every project under `data/projects/`. Unsorted — ordering
 * (and pagination) is the operations layer's concern. Directories
 * without a readable `project.json` are skipped.
 */
export async function listProjects(root: string): Promise<Project[]> {
  const ids = await listSubdirs(projectsDir(root));
  const projects: Project[] = [];
  for (const id of ids) {
    const project = await readProject(root, id);
    if (project !== null) projects.push(project);
  }
  return projects;
}

/**
 * HARD DELETE of the entire project directory: project.json, all
 * ProjectFiles and all FileVersions.
 *
 * Per ARCHITECTURE.md Section 9: this function is allowed to exist
 * in the storage layer (for the future CLI/UI used directly by the
 * user), but `project.delete` is NOT an MCP tool — server.ts must
 * never register anything that reaches this function.
 */
export async function deleteProject(root: string, projectId: string): Promise<void> {
  await rm(projectDir(root, projectId), { recursive: true, force: true });
}
