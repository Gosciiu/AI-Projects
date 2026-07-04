import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  fileArchive,
  fileDelete,
  fileRead,
  fileUpdate,
  fileVersionGet,
  fileVersions,
  projectHistory,
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
 * Priority 6 — file.delete: two-step safety catch and true HARD
 * DELETE (Section 8).
 */
describe("file.delete", () => {
  let root: string;
  beforeEach(async () => {
    root = await makeRoot();
  });
  afterEach(async () => {
    await cleanupRoot(root);
  });

  it("deleting an active file → FILE_NOT_ARCHIVED (archive first)", async () => {
    const project = await seedProject(root);
    const file = await seedFile(root, project.id, "a.md", "x");
    const res = await fileDelete(root, {
      fileId: file.id,
      versionId: file.versionId,
    });
    expectError(res, "FILE_NOT_ARCHIVED");
  });

  it("hard delete: file and ALL its versions physically gone", async () => {
    const project = await seedProject(root);
    const file = await seedFile(root, project.id, "a.md", "one");
    const updated = expectSuccess(
      await fileUpdate(root, {
        fileId: file.id,
        versionId: file.versionId,
        content: "two",
      }),
    );
    const versions = expectSuccess(
      await fileVersions(root, { fileId: file.id, page: 1, pageSize: 10 }),
    );
    const v1 = versions.items.find((v) => v.versionNumber === 1)!;

    const archived = expectSuccess(
      await fileArchive(root, { fileId: file.id, versionId: updated.versionId }),
    );
    const deleted = expectSuccess(
      await fileDelete(root, { fileId: file.id, versionId: archived.versionId }),
    );
    expect(deleted).toBeNull();

    expectError(await fileRead(root, { fileId: file.id }), "FILE_NOT_FOUND");
    expectError(
      await fileUpdate(root, { fileId: file.id, versionId: "x", content: "y" }),
      "FILE_NOT_FOUND",
    );
    expectError(
      await fileVersions(root, { fileId: file.id, page: 1, pageSize: 10 }),
      "FILE_NOT_FOUND",
    );
    expectError(
      await fileVersionGet(root, { versionId: v1.id }),
      "FILE_VERSION_NOT_FOUND",
    );
  });

  it("project.history loses the deleted file's entries (deliberate)", async () => {
    const project = await seedProject(root);
    const fileA = await seedFile(root, project.id, "a.md", "one");
    expectSuccess(
      await fileUpdate(root, {
        fileId: fileA.id,
        versionId: fileA.versionId,
        content: "two",
      }),
    );
    const fileB = await seedFile(root, project.id, "b.md", "solo");

    const before = expectSuccess(
      await projectHistory(root, { projectId: project.id, page: 1, pageSize: 10 }),
    );
    expect(before.total).toBe(3); // A: v1+v2, B: v1

    const a = expectSuccess(await fileRead(root, { fileId: fileA.id }));
    const archived = expectSuccess(
      await fileArchive(root, { fileId: fileA.id, versionId: a.versionId }),
    );
    expectSuccess(
      await fileDelete(root, { fileId: fileA.id, versionId: archived.versionId }),
    );

    const after = expectSuccess(
      await projectHistory(root, { projectId: project.id, page: 1, pageSize: 10 }),
    );
    expect(after.total).toBe(1);
    expect(after.items[0]!.fileId).toBe(fileB.id);
  });
});
