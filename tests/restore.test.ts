import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  fileArchive,
  fileUpdate,
  fileVersionGet,
  fileVersionRestore,
  fileVersions,
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
 * Priority 3 — file.version.restore never rewinds history (ADR-005).
 */
describe("file.version.restore", () => {
  let root: string;
  beforeEach(async () => {
    root = await makeRoot();
  });
  afterEach(async () => {
    await cleanupRoot(root);
  });

  it("restoring v2 at v4 creates v5 with v2's content — numbering never rewound", async () => {
    const project = await seedProject(root);
    const file = await seedFile(root, project.id, "doc.md", "one");
    let etag = file.versionId;
    for (const content of ["two", "three", "four"]) {
      const updated = expectSuccess(
        await fileUpdate(root, { fileId: file.id, versionId: etag, content }),
      );
      etag = updated.versionId;
    }

    const before = expectSuccess(
      await fileVersions(root, { fileId: file.id, page: 1, pageSize: 10 }),
    );
    expect(before.items.map((v) => v.versionNumber)).toEqual([4, 3, 2, 1]);
    const v2 = before.items.find((v) => v.versionNumber === 2)!;

    const restored = expectSuccess(
      await fileVersionRestore(root, {
        targetVersionId: v2.id,
        currentVersionId: etag,
      }),
    );
    expect(restored.content).toBe("two");

    const after = expectSuccess(
      await fileVersions(root, { fileId: file.id, page: 1, pageSize: 10 }),
    );
    expect(after.items.map((v) => v.versionNumber)).toEqual([5, 4, 3, 2, 1]);

    // v5 is a NEW FileVersion with v2's content; v2 itself is intact.
    const v5 = expectSuccess(
      await fileVersionGet(root, { versionId: after.items[0]!.id }),
    );
    expect(v5.content).toBe("two");
    expect(v5.id).not.toBe(v2.id);
    const v2Again = expectSuccess(await fileVersionGet(root, { versionId: v2.id }));
    expect(v2Again.content).toBe("two");
  });

  it("restoring content identical to the current version → NO_CHANGES", async () => {
    const project = await seedProject(root);
    const file = await seedFile(root, project.id, "doc.md", "one");
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
    const newest = versions.items[0]!; // content "two" = current

    const res = await fileVersionRestore(root, {
      targetVersionId: newest.id,
      currentVersionId: updated.versionId,
    });
    expectError(res, "NO_CHANGES");
  });

  it("restore onto an archived file → FILE_ARCHIVED (unarchive first)", async () => {
    const project = await seedProject(root);
    const file = await seedFile(root, project.id, "doc.md", "one");
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

    // Even with the CORRECT current ETag, state (step 3) fires first.
    const res = await fileVersionRestore(root, {
      targetVersionId: v1.id,
      currentVersionId: archived.versionId,
    });
    expectError(res, "FILE_ARCHIVED");
  });
});
