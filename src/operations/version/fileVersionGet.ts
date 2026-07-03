import type { FileVersionDTO, OperationResponse } from "../../dto/index.js";
import { toFileVersionDTO } from "../../mappers/index.js";
import { findFileVersionById } from "../../storage/index.js";
import { requireFileVersion, requireNonEmptyString } from "../../validation/index.js";
import { fail, ok } from "../results.js";

/**
 * file.version.get — Section 8, File Version Operations.
 *
 * Identified by bare `versionId` (globally unique UUID, no fileId in
 * the request) — storage locates it by scanning, as the
 * versionId → fileId index is explicitly banned (Section 12).
 */
export async function fileVersionGet(
  root: string,
  req: { versionId?: unknown },
): Promise<OperationResponse<FileVersionDTO>> {
  // GVO 1 — request
  const bad = requireNonEmptyString(req.versionId, "versionId");
  if (bad !== null) return fail(bad);
  const versionId = req.versionId as string;

  // GVO 2 — existence
  const version = await findFileVersionById(root, versionId);
  const notFound = requireFileVersion(version, versionId);
  if (version === null) return fail(notFound!);

  return ok(toFileVersionDTO(version));
}
