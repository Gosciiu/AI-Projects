import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ConflictData } from "../src/dto/index.js";
import {
  fileArchive,
  fileDelete,
  fileMove,
  fileUnarchive,
  fileUpdate,
  fileVersionRestore,
  fileVersions,
} from "../src/operations/index.js";
import {
  cleanupRoot,
  expectConflict,
  expectSuccess,
  makeRoot,
  seedFile,
  seedProject,
} from "./helpers.js";

/**
 * Priority 2 — every mutating operation with a wrong versionId must
 * answer status "conflict" with ConflictData carrying the CURRENT
 * ETag and the NEWEST version's content. Never an error code.
 */
describe("version conflict is a response branch, never an error", () => {
  let root: string;
  let fileId: string;
  let etag: string; // current ETag after the seed update

  function assertConflict(data: ConflictData, expectedEtag: string): void {
    expect(data.fileId).toBe(fileId);
    expect(data.versionId).toBe(expectedEtag);
    expect(data.content).toBe("two"); // newest version's content
  }

  beforeEach(async () => {
    root = await makeRoot();
    const project = await seedProject(root);
    const created = await seedFile(root, project.id, "doc.md", "one");
    fileId = created.id;
    const updated = expectSuccess(
      await fileUpdate(root, {
        fileId,
        versionId: created.versionId,
        content: "two",
      }),
    );
    etag = updated.versionId;
  });
  afterEach(async () => {
    await cleanupRoot(root);
  });

  it("file.update", async () => {
    const res = await fileUpdate(root, {
      fileId,
      versionId: "wrong-etag",
      content: "three",
    });
    assertConflict(expectConflict(res), etag);
  });

  it("file.move", async () => {
    const res = await fileMove(root, {
      fileId,
      versionId: "wrong-etag",
      newPath: "moved.md",
    });
    assertConflict(expectConflict(res), etag);
  });

  it("file.archive", async () => {
    const res = await fileArchive(root, { fileId, versionId: "wrong-etag" });
    assertConflict(expectConflict(res), etag);
  });

  it("file.unarchive (archived file, stale ETag)", async () => {
    const archived = expectSuccess(
      await fileArchive(root, { fileId, versionId: etag }),
    );
    const res = await fileUnarchive(root, { fileId, versionId: etag });
    assertConflict(expectConflict(res), archived.versionId);
  });

  it("file.delete (archived file, stale ETag)", async () => {
    const archived = expectSuccess(
      await fileArchive(root, { fileId, versionId: etag }),
    );
    const res = await fileDelete(root, { fileId, versionId: etag });
    assertConflict(expectConflict(res), archived.versionId);
  });

  it("file.version.restore (stale currentVersionId)", async () => {
    const versions = expectSuccess(
      await fileVersions(root, { fileId, page: 1, pageSize: 10 }),
    );
    const v1 = versions.items.find((v) => v.versionNumber === 1)!;
    const res = await fileVersionRestore(root, {
      targetVersionId: v1.id,
      currentVersionId: "wrong-etag",
    });
    assertConflict(expectConflict(res), etag);
  });
});
