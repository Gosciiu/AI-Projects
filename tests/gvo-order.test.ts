import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fileArchive, fileUpdate } from "../src/operations/index.js";
import {
  cleanupRoot,
  expectConflict,
  expectError,
  expectSuccess,
  makeRoot,
  seedFile,
  seedProject,
} from "./helpers.js";

/**
 * Priority 1 — Global Validation Order: each step must win over all
 * later steps, per ARCHITECTURE.md Section 5.
 */
describe("Global Validation Order", () => {
  let root: string;
  beforeEach(async () => {
    root = await makeRoot();
  });
  afterEach(async () => {
    await cleanupRoot(root);
  });

  it("step 3 before 4: archived file + stale ETag → FILE_ARCHIVED, not conflict", async () => {
    const project = await seedProject(root);
    const file = await seedFile(root, project.id, "a.md", "v1");
    const staleEtag = file.versionId;
    expectSuccess(
      await fileArchive(root, { fileId: file.id, versionId: file.versionId }),
    );

    // The pre-archive ETag is now stale, but state (step 3) is
    // checked before the version match (step 4).
    const res = await fileUpdate(root, {
      fileId: file.id,
      versionId: staleEtag,
      content: "new content",
    });
    expectError(res, "FILE_ARCHIVED");
  });

  it("step 4 before 5: stale ETag + identical content → conflict, not NO_CHANGES", async () => {
    const project = await seedProject(root);
    const file = await seedFile(root, project.id, "a.md", "hello");
    const staleEtag = file.versionId;
    const updated = expectSuccess(
      await fileUpdate(root, {
        fileId: file.id,
        versionId: file.versionId,
        content: "world",
      }),
    );

    // Content identical to the CURRENT version, but the client's
    // ETag is stale — the version match fires first.
    const res = await fileUpdate(root, {
      fileId: file.id,
      versionId: staleEtag,
      content: "world",
    });
    const conflict = expectConflict(res);
    expect(conflict.fileId).toBe(file.id);
    expect(conflict.versionId).toBe(updated.versionId);
    expect(conflict.content).toBe("world");
  });

  it("step 1 before 2: malformed request → VALIDATION_ERROR even for a nonexistent file", async () => {
    const res = await fileUpdate(root, {
      fileId: "",
      versionId: "whatever",
      content: "x",
    });
    expectError(res, "VALIDATION_ERROR");
  });

  it("step 2 before 3-5: unknown fileId → FILE_NOT_FOUND regardless of other fields", async () => {
    const res = await fileUpdate(root, {
      fileId: "no-such-file",
      versionId: "no-such-etag",
      content: "x",
    });
    expectError(res, "FILE_NOT_FOUND");
  });
});
