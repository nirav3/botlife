import type { ExerciseCatalog } from '@prisma/client';
import { prisma } from '../lib/prisma';

/**
 * In-memory lookup over the ExerciseCatalog table, keyed by normalized name
 * and every normalized alias. Loaded once at boot (see loadExerciseCatalogCache,
 * called from server.ts after seeding) and read synchronously everywhere
 * else — progression.service.ts's classification helpers (isLowerBody,
 * getProgressionType, ...) are plain sync functions used inside per-request
 * hot paths, so this avoids a DB round trip per exercise per request for
 * what is effectively static reference data.
 *
 * Deliberately a plain module-level Map, not a TTL/refreshing cache — the
 * catalog only changes via a code deploy + restart (see exerciseCatalogSeed.service.ts),
 * never at runtime, so there's nothing to invalidate.
 */
let cache: Map<string, ExerciseCatalog> | null = null;

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

export async function loadExerciseCatalogCache(): Promise<void> {
  const rows = await prisma.exerciseCatalog.findMany();
  const map = new Map<string, ExerciseCatalog>();
  for (const row of rows) {
    map.set(normalize(row.name), row);
    for (const alias of row.aliases) {
      // First entry wins on a collision — shouldn't happen with curated
      // data, but silently overwriting a real name with an alias of a
      // different exercise would be a confusing bug to chase.
      const key = normalize(alias);
      if (!map.has(key)) map.set(key, row);
    }
  }
  cache = map;
}

/**
 * Exact-match (case/whitespace-insensitive) lookup by name or alias.
 * Returns null both when the exercise isn't in the catalog AND when the
 * cache hasn't been loaded yet (e.g. in a test that never called
 * loadExerciseCatalogCache) — either way, callers are expected to fall back
 * to their existing keyword heuristics rather than treat this as an error.
 */
export function getExerciseCatalogEntry(exerciseName: string): ExerciseCatalog | null {
  if (!cache) return null;
  return cache.get(normalize(exerciseName)) ?? null;
}

/** Test-only escape hatch to seed the cache without hitting a real DB. */
export function __setExerciseCatalogCacheForTests(rows: ExerciseCatalog[]): void {
  const map = new Map<string, ExerciseCatalog>();
  for (const row of rows) {
    map.set(normalize(row.name), row);
    for (const alias of row.aliases) {
      const key = normalize(alias);
      if (!map.has(key)) map.set(key, row);
    }
  }
  cache = map;
}

/** Test-only escape hatch to reset to the "not loaded" state. */
export function __clearExerciseCatalogCacheForTests(): void {
  cache = null;
}
