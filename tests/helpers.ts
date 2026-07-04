import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect } from "vitest";
import type {
  ConflictData,
  ErrorData,
  FileDTO,
  OperationResponse,
  ProjectMetaDTO,
} from "../src/dto/index.js";
import {
  fileCreate,
  projectCreate,
  projectSetDefaultFile,
} from "../src/operations/index.js";
import { readProject, writeProject } from "../src/storage/index.js";

/**
 * End-to-end test helpers: every test gets a real, isolated data
 * root on disk (mkdtemp) and exercises the full
 * Operations → Storage stack — no mocks. Seeding goes through the
 * operations themselves wherever an operation exists for it.
 */

export async function makeRoot(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "ai-workspace-test-"));
}

export async function cleanupRoot(root: string): Promise<void> {
  await rm(root, { recursive: true, force: true });
}

export function expectSuccess<T>(res: OperationResponse<T>): T {
  if (res.status !== "success") {
    throw new Error(
      `Expected success, got ${res.status}: ${JSON.stringify(res.data)}`,
    );
  }
  return res.data;
}

export function expectError<T>(res: OperationResponse<T>, code: string): ErrorData {
  if (res.status !== "error") {
    throw new Error(
      `Expected error ${code}, got ${res.status}: ${JSON.stringify(res.data)}`,
    );
  }
  expect(res.data.code).toBe(code);
  return res.data;
}

export function expectConflict<T>(res: OperationResponse<T>): ConflictData {
  if (res.status !== "conflict") {
    throw new Error(
      `Expected conflict, got ${res.status}: ${JSON.stringify(res.data)}`,
    );
  }
  return res.data;
}

export async function seedProject(
  root: string,
  name = "Test Project",
): Promise<ProjectMetaDTO> {
  return expectSuccess(await projectCreate(root, { name }));
}

export async function seedFile(
  root: string,
  projectId: string,
  filePath: string,
  content = "",
): Promise<FileDTO> {
  return expectSuccess(
    await fileCreate(root, { projectId, path: filePath, content }),
  );
}

/**
 * Seeds the default file through the PUBLIC project.setDefaultFile
 * operation (the gap the 18th operation closed — previously this
 * had to write storage directly). The storage read exists only to
 * fetch the current Project ETag for the optimistic lock.
 */
export async function setDefaultFile(
  root: string,
  projectId: string,
  fileId: string,
): Promise<void> {
  const project = await readProject(root, projectId);
  if (project === null) throw new Error(`seed: project ${projectId} missing`);
  expectSuccess(
    await projectSetDefaultFile(root, {
      projectId,
      fileId,
      projectVersionId: project.versionId,
    }),
  );
}

/**
 * Writes an ILLEGAL defaultFileId directly through storage, bypassing
 * validation — simulates corruption (e.g. a default pointing at an
 * archived file, which project.setDefaultFile rightly refuses) to
 * exercise defensive branches. Never use it to arrange legal states.
 */
export async function corruptDefaultFileId(
  root: string,
  projectId: string,
  fileId: string,
): Promise<void> {
  const project = await readProject(root, projectId);
  if (project === null) throw new Error(`seed: project ${projectId} missing`);
  await writeProject(root, {
    ...project,
    defaultFileId: fileId,
    versionId: randomUUID(),
  });
}
