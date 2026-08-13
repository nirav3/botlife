import type { ExerciseCatalogEntry } from '@/types';

/**
 * Builds a lookup Map from the catalog array (keyed by normalized name and
 * every normalized alias), mirroring the server's in-memory cache in
 * src/services/exerciseCatalog.service.ts. The catalog is small and
 * effectively static, so callers fetch it once (long staleTime) and reuse
 * this Map rather than scanning the array per exercise.
 */
export function buildExerciseCatalogIndex(catalog: ExerciseCatalogEntry[]): Map<string, ExerciseCatalogEntry> {
  const map = new Map<string, ExerciseCatalogEntry>();
  for (const entry of catalog) {
    map.set(normalize(entry.name), entry);
    for (const alias of entry.aliases) {
      const key = normalize(alias);
      // First entry wins on a collision, same as server-side.
      if (!map.has(key)) map.set(key, entry);
    }
  }
  return map;
}

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Exact-match (case/whitespace-insensitive) lookup by name or alias.
 * Returns null both when the exercise isn't in the catalog and when the
 * index isn't ready yet (catalog still loading) — either way, callers fall
 * back to their existing keyword heuristics.
 */
export function lookupExerciseCatalog(
  index: Map<string, ExerciseCatalogEntry> | undefined,
  exerciseName: string | null | undefined
): ExerciseCatalogEntry | null {
  if (!index || !exerciseName) return null;
  return index.get(normalize(exerciseName)) ?? null;
}
