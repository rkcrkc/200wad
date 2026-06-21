/**
 * Course-code mapping: the `ProductFlag` indirection (FRENCH_IMPORT_PLAN §7).
 *
 * Legacy `General.Course` / `Sections.Course` and lesson IDs encode an
 * **internal course code (ICC)**, which is not always the Product `Ref`:
 *
 *   icc = ProductFlag  (when ProductFlag ≠ 0)
 *   icc = Ref          (otherwise)
 *
 * French 1 Products.csv → { Ref 1 (flag 0) ⇒ icc 1, Ref 6 (flag 21) ⇒ icc 21 }.
 * Italian Products.csv has no ProductFlag column, so icc === Ref for every
 * product — the importer's original behaviour falls out as the flag-0 case.
 *
 * **Explicit mode (French 2).** When the language config supplies `courses`
 * with an `icc`, the Products flags are unreliable (French 2's flags encode
 * {1,21,12} while the real content ICCs are {2,22,12}) and the lesson-id prefix
 * scheme breaks (vocab lessons 39–104 decode to ICC 1, sentence lessons 21xxxx
 * to "21" ≠ 22). The mapping is then built straight from the config's explicit
 * ICC→ref list, `validIccs` is exactly that ICC set, and callers resolve a
 * course from each row's own `Course` (ICC) column via `iccToRef` rather than
 * from the lesson id. `explicit` flags this so the importer takes that path.
 */

import type { CourseDef, Product } from "./types";

export interface CourseMapping {
  /** All valid internal course codes. */
  validIccs: Set<number>;
  /** ICC → Product Ref (the value stored in NL `legacy_ref`). */
  iccToRef(icc: number): number | undefined;
  /** Derive the ICC encoded by a legacy lesson id, or null. */
  deriveIcc(lessonId: number): number | null;
  /** Convenience: derive the Product Ref for a lesson id (deriveIcc → iccToRef). */
  deriveRef(lessonId: number): number | null;
  /**
   * True when built from an explicit config ICC→ref list (French 2). The
   * importer then assigns courses from the row's `Course` column, not the
   * lesson-id prefix.
   */
  explicit: boolean;
}

export function buildCourseMapping(
  products: Product[],
  courses?: CourseDef[]
): CourseMapping {
  const iccToRefMap = new Map<number, number>();
  const validIccs = new Set<number>();

  // Explicit ICC→ref config (French 2): trust the config, ignore Products flags
  // and the lesson-id prefix scheme entirely.
  const explicitCourses = (courses || []).filter((c) => c.icc != null);
  const explicit = explicitCourses.length > 0;

  if (explicit) {
    for (const c of explicitCourses) {
      iccToRefMap.set(c.icc as number, c.ref);
      validIccs.add(c.icc as number);
    }
  } else {
    for (const p of products) {
      const ref = parseInt(p.Ref, 10);
      if (isNaN(ref)) continue;
      const flag = p.ProductFlag != null ? parseInt(p.ProductFlag, 10) : NaN;
      const icc = !isNaN(flag) && flag !== 0 ? flag : ref;
      iccToRefMap.set(icc, ref);
      validIccs.add(icc);
    }
  }

  function deriveIcc(lessonId: number): number | null {
    if (lessonId <= 0) return null;
    if (lessonId < 1000) return 1; // Lessons 1-999 belong to ICC 1

    const str = lessonId.toString();
    if (str.length >= 2) {
      const prefix2 = parseInt(str.substring(0, 2), 10);
      if (validIccs.has(prefix2)) return prefix2;
    }
    if (str.length >= 1) {
      const prefix1 = parseInt(str.substring(0, 1), 10);
      if (validIccs.has(prefix1)) return prefix1;
    }
    return null;
  }

  function deriveRef(lessonId: number): number | null {
    const icc = deriveIcc(lessonId);
    if (icc === null) return null;
    return iccToRefMap.get(icc) ?? null;
  }

  return {
    validIccs,
    iccToRef: (icc: number) => iccToRefMap.get(icc),
    deriveIcc,
    deriveRef,
    explicit,
  };
}
