import { createTwoFilesPatch } from "diff";
import type { DiffDTO, OperationResponse } from "../../dto/index.js";
import { toDiffDTO } from "../../mappers/index.js";
import { findFileVersionById, findProjectFileById } from "../../storage/index.js";
import {
  requireFileVersion,
  requireNonEmptyString,
  requireSameFile,
} from "../../validation/index.js";
import { fail, ok } from "../results.js";

/**
 * file.version.diff — Section 8, File Version Operations.
 *
 * `diff` = plain unified-diff text, zero interpretation (ADR-001).
 * Headers (review decision 2026-07-03): the file's CURRENT path as
 * the name on both sides, `v{versionNumber}` as the version labels —
 * cosmetic only, DiffDTO carries all IDs separately. The extra
 * ProjectFile read just for the path is accepted.
 *
 * Read-only: works regardless of the file's archived status, and
 * diffing a version against itself is legal (empty diff).
 */
export async function fileVersionDiff(
  root: string,
  req: { fromVersionId?: unknown; toVersionId?: unknown },
): Promise<OperationResponse<DiffDTO>> {
  // GVO 1 — request
  const bad =
    requireNonEmptyString(req.fromVersionId, "fromVersionId") ??
    requireNonEmptyString(req.toVersionId, "toVersionId");
  if (bad !== null) return fail(bad);
  const fromVersionId = req.fromVersionId as string;
  const toVersionId = req.toVersionId as string;

  // GVO 2 — existence (both versions)
  const from = await findFileVersionById(root, fromVersionId);
  const fromMissing = requireFileVersion(from, fromVersionId);
  if (from === null) return fail(fromMissing!);

  const to = await findFileVersionById(root, toVersionId);
  const toMissing = requireFileVersion(to, toVersionId);
  if (to === null) return fail(toMissing!);

  // GVO 5 — business: both versions must belong to the same file
  const mismatch = requireSameFile(from, to);
  if (mismatch !== null) return fail(mismatch);

  const file = await findProjectFileById(root, from.fileId);
  if (file === null) {
    // file.delete removes the file and its versions together, so a
    // version whose file is gone means corrupted storage.
    throw new Error(
      `Corrupted storage: file ${from.fileId} missing for version ${from.id}`,
    );
  }

  const diff = createTwoFilesPatch(
    file.path,
    file.path,
    from.content,
    to.content,
    `v${from.versionNumber}`,
    `v${to.versionNumber}`,
  );
  return ok(toDiffDTO(from, to, diff));
}
