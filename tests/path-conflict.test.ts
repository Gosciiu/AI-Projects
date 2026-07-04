import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  fileArchive,
  fileCreate,
  fileMove,
  fileUnarchive,
} from "../src/operations/index.js";
import {
  cleanupRoot,
  expectError,
  expectSuccess,
  makeRoot,
  seedFile,
  seedProject,
} from "./helpers.js";

/**
 * Priority 5 — PATH_CONFLICT: only ACTIVE files reserve a path.
 */
describe("PATH_CONFLICT semantics", () => {
  let root: string;
  let projectId: string;
  beforeEach(async () => {
    root = await makeRoot();
    projectId = (await seedProject(root)).id;
  });
  afterEach(async () => {
    await cleanupRoot(root);
  });

  it("create on a path held by an active file → PATH_CONFLICT", async () => {
    await seedFile(root, projectId, "docs/a.md", "x");
    const res = await fileCreate(root, {
      projectId,
      path: "docs/a.md",
      content: "y",
    });
    expectError(res, "PATH_CONFLICT");
  });

  it("move onto a path held by an active file → PATH_CONFLICT", async () => {
    await seedFile(root, projectId, "docs/a.md", "x");
    const b = await seedFile(root, projectId, "docs/b.md", "y");
    const res = await fileMove(root, {
      fileId: b.id,
      versionId: b.versionId,
      newPath: "docs/a.md",
    });
    expectError(res, "PATH_CONFLICT");
  });

  it("an archived file does NOT block its path; unarchive onto the taken path → PATH_CONFLICT", async () => {
    const a = await seedFile(root, projectId, "docs/a.md", "x");
    const archived = expectSuccess(
      await fileArchive(root, { fileId: a.id, versionId: a.versionId }),
    );

    // Archived A no longer reserves docs/a.md.
    const c = await seedFile(root, projectId, "docs/a.md", "newcomer");

    // Now A cannot come back while C holds the path...
    const blocked = await fileUnarchive(root, {
      fileId: a.id,
      versionId: archived.versionId,
    });
    expectError(blocked, "PATH_CONFLICT");

    // ...but can once the path is free again.
    expectSuccess(
      await fileMove(root, {
        fileId: c.id,
        versionId: c.versionId,
        newPath: "docs/c.md",
      }),
    );
    expectSuccess(
      await fileUnarchive(root, { fileId: a.id, versionId: archived.versionId }),
    );
  });

  it("move onto one's own path → success with a fresh ETag (no NO_CHANGES for move)", async () => {
    const b = await seedFile(root, projectId, "docs/b.md", "y");
    const moved = expectSuccess(
      await fileMove(root, {
        fileId: b.id,
        versionId: b.versionId,
        newPath: "docs/b.md",
      }),
    );
    expect(moved.path).toBe("docs/b.md");
    expect(moved.versionId).not.toBe(b.versionId);
  });
});
