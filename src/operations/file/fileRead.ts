import type { FileDTO, OperationResponse } from "../../dto/index.js";
import { toFileDTO } from "../../mappers/index.js";
import { findProjectFileById } from "../../storage/index.js";
import { requireNonEmptyString, requireProjectFile } from "../../validation/index.js";
import { loadCurrentVersion } from "../currentVersion.js";
import { fail, ok } from "../results.js";

/**
 * file.read — Section 8, File Operations.
 *
 * Read-only: only GVO steps 1–2 apply. Works on archived files too
 * (no FILE_ARCHIVED in its error list — archiving hides a file from
 * project.open/search, it does not make it unreadable).
 */
export async function fileRead(
  root: string,
  req: { fileId?: unknown },
): Promise<OperationResponse<FileDTO>> {
  // GVO 1 — request
  const bad = requireNonEmptyString(req.fileId, "fileId");
  if (bad !== null) return fail(bad);
  const fileId = req.fileId as string;

  // GVO 2 — existence (fileId alone: storage scans, no index)
  const file = await findProjectFileById(root, fileId);
  const notFound = requireProjectFile(file, fileId);
  if (file === null) return fail(notFound!);

  const current = await loadCurrentVersion(root, file);
  return ok(toFileDTO(file, current.content));
}
