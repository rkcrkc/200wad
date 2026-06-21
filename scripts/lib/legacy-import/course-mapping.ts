/**
 * Course-code mapping: the `ProductFlag` indirection (FRENCH_IMPORT_PLAN §7).
 *
 * Legacy `General.Course` / `Sections.Course` and lesson IDs encode an
 * **internal course code (ICC)**, which is not always the Product `Ref`:
 *
 *   icc = ProductFlag  (when ProductFlag ≠ 0)
 *   icc = Ref          (otherwise)
 *
 * French Products.csv → { Ref 1 (flag 0) ⇒ icc 1, Ref 6 (flag 21) ⇒ icc 21 }.
 * Italian Products.csv has no ProductFlag column, so icc === Ref for every
 * product — the importer's original behaviour falls out as the flag-0 case.
 */

import type { Product } from "./types";

export interface CourseMapping {
  /** All valid internal course codes. */
  validIccs: Set<number>;
  /** ICC → Product Ref (the value stored in NL `legacy_ref`). */
  iccToRef(icc: number): number | undefined;
  /** Derive the ICC encoded by a legacy lesson id, or null. */
  deriveIcc(lessonId: number): number | null;
  /** Convenience: derive the Product Ref for a lesson id (deriveIcc → iccToRef). */
  deriveRef(lessonId: number): number | null;
}

export function buildCourseMapping(products: Product[]): CourseMapping {
  const iccToRefMap = new Map<number, number>();
  const validIccs = new Set<number>();

  for (const p of products) {
    const ref = parseInt(p.Ref, 10);
    if (isNaN(ref)) continue;
    const flag = p.ProductFlag != null ? parseInt(p.ProductFlag, 10) : NaN;
    const icc = !isNaN(flag) && flag !== 0 ? flag : ref;
    iccToRefMap.set(icc, ref);
    validIccs.add(icc);
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
  };
}
