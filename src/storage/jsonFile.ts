import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Internal JSON I/O primitives shared by the storage modules.
 * Not exported from the storage barrel — the public storage API is
 * entity-shaped (Project / ProjectFile / FileVersion), never raw
 * paths.
 *
 * "Not found" is expressed as `null` / `[]`, never as a thrown
 * error: mapping absence to PROJECT_NOT_FOUND / FILE_NOT_FOUND /
 * FILE_VERSION_NOT_FOUND is the job of the validation layer (Global
 * Validation Order step 2), not of storage.
 */

export async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

/** Names of subdirectories of `dirPath`; `[]` if it doesn't exist. */
export async function listSubdirs(dirPath: string): Promise<string[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

/** Full paths of `*.json` files in `dirPath`; `[]` if it doesn't exist. */
export async function listJsonFiles(dirPath: string): Promise<string[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(".json"))
      .map((e) => path.join(dirPath, e.name));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}
