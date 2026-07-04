import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  fileArchive,
  fileDelete,
  fileMove,
  fileUnarchive,
  fileUpdate,
} from "../src/operations/index.js";
import { readProject } from "../src/storage/index.js";
import {
  cleanupRoot,
  corruptDefaultFileId,
  expectSuccess,
  makeRoot,
  seedFile,
  seedProject,
  setDefaultFile,
} from "./helpers.js";

/**
 * Priority 4 — defaultFileId lifecycle around archive/unarchive/
 * delete, and Project.versionId as an ETag of the whole Project
 * object (Sections 2, 3, 8).
 */
describe("defaultFileId and Project.versionId", () => {
  let root: string;
  beforeEach(async () => {
    root = await makeRoot();
  });
  afterEach(async () => {
    await cleanupRoot(root);
  });

  it("archiving the default file clears defaultFileId and bumps Project.versionId", async () => {
    const project = await seedProject(root);
    const file = await seedFile(root, project.id, "a.md", "x");
    await setDefaultFile(root, project.id, file.id);
    const before = (await readProject(root, project.id))!;

    expectSuccess(
      await fileArchive(root, { fileId: file.id, versionId: file.versionId }),
    );

    const after = (await readProject(root, project.id))!;
    expect(after.defaultFileId).toBeNull();
    expect(after.versionId).not.toBe(before.versionId);
  });

  it("archiving a non-default file leaves the Project object untouched", async () => {
    const project = await seedProject(root);
    const fileA = await seedFile(root, project.id, "a.md", "x");
    const fileB = await seedFile(root, project.id, "b.md", "y");
    await setDefaultFile(root, project.id, fileA.id);
    const before = (await readProject(root, project.id))!;

    expectSuccess(
      await fileArchive(root, { fileId: fileB.id, versionId: fileB.versionId }),
    );

    const after = (await readProject(root, project.id))!;
    expect(after.defaultFileId).toBe(fileA.id);
    expect(after.versionId).toBe(before.versionId);
  });

  it("unarchive does NOT restore defaultFileId", async () => {
    const project = await seedProject(root);
    const file = await seedFile(root, project.id, "a.md", "x");
    await setDefaultFile(root, project.id, file.id);

    const archived = expectSuccess(
      await fileArchive(root, { fileId: file.id, versionId: file.versionId }),
    );
    expectSuccess(
      await fileUnarchive(root, { fileId: file.id, versionId: archived.versionId }),
    );

    const after = (await readProject(root, project.id))!;
    expect(after.defaultFileId).toBeNull();
  });

  it("file.delete defensively clears a defaultFileId pointing at the deleted file", async () => {
    const project = await seedProject(root);
    const file = await seedFile(root, project.id, "a.md", "x");
    const archived = expectSuccess(
      await fileArchive(root, { fileId: file.id, versionId: file.versionId }),
    );
    // Simulate corruption: default pointing at an ARCHIVED file
    // (normal flow can't produce this — archive clears it, and
    // project.setDefaultFile refuses archived files).
    await corruptDefaultFileId(root, project.id, file.id);
    const before = (await readProject(root, project.id))!;

    expectSuccess(
      await fileDelete(root, { fileId: file.id, versionId: archived.versionId }),
    );

    const after = (await readProject(root, project.id))!;
    expect(after.defaultFileId).toBeNull();
    expect(after.versionId).not.toBe(before.versionId);
  });

  it("create/update/move never touch Project.versionId", async () => {
    const project = await seedProject(root);
    const before = (await readProject(root, project.id))!;

    const file = await seedFile(root, project.id, "a.md", "x");
    const updated = expectSuccess(
      await fileUpdate(root, {
        fileId: file.id,
        versionId: file.versionId,
        content: "y",
      }),
    );
    expectSuccess(
      await fileMove(root, {
        fileId: file.id,
        versionId: updated.versionId,
        newPath: "b.md",
      }),
    );

    const after = (await readProject(root, project.id))!;
    expect(after.versionId).toBe(before.versionId);
  });
});
