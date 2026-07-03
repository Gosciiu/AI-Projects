import { v4 as uuidv4 } from "uuid";

/**
 * ID / ETag / timestamp generation — happens exclusively in the
 * operations layer (storage is pure I/O, validators are pure
 * functions).
 *
 * All IDs are UUID v4 (Section 10): entity ids AND versionId ETags
 * alike — an ETag is just a fresh opaque UUID minted on every
 * object mutation, carrying no ordering or content hash semantics.
 */

export function newId(): string {
  return uuidv4();
}

export function nowIso(): string {
  return new Date().toISOString();
}
