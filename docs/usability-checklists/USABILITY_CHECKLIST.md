# Usability Testing Checklist

A checklist to run **by hand** when reviewing a new or changed feature, before you call it done.
Goal: catch UX/usability issues yourself in one pass instead of across several revision rounds.

How to use it: walk each section as a real user would, on a real screen. Tick what passes,
note what doesn't. Anything unchecked is a revision item.

---

## 1. First impression (the happy path)
- [ ] I can tell what this screen/feature is for within a few seconds.
- [ ] The primary action is obvious and visually distinct.
- [ ] I can complete the main task without instructions.
- [ ] Wording is clear and consistent with the rest of the app (labels, buttons, headings).
- [ ] Nothing looks visually off — spacing, alignment, sizing match the rest of the app.

## 2. All the states
Deliberately force each one and look at it:
- [ ] **Empty / first-time** — no data yet. Is there a helpful prompt, not a blank void?
- [ ] **Loading** — is there a spinner/skeleton? No layout jump when content arrives?
- [ ] **Error** — kill the network or trigger a failure. Is the message clear and recoverable?
- [ ] **Success** — is confirmation obvious (toast, state change, redirect)?
- [ ] **Partial / in-progress** — half-filled forms, pending writes, optimistic UI.

## 3. Edge content
- [ ] Very long text (names, titles, descriptions) — does it truncate/wrap cleanly, no overflow?
- [ ] Lots of items (long lists, many rows) — does it scroll/paginate sensibly?
- [ ] Zero / one / many — singular vs plural copy is correct ("1 word" vs "2 words").
- [ ] Numbers/dates display in a sensible format and timezone.

## 4. Responsive & devices
- [ ] Mobile width (≈375px) — usable, nothing cut off, tap targets big enough.
- [ ] Tablet / mid width — layout reflows reasonably.
- [ ] Desktop — doesn't stretch awkwardly on wide screens.
- [ ] Works in both portrait and landscape if relevant.

## 5. Interaction & feedback
- [ ] Every clickable thing gives feedback (hover, active, disabled states).
- [ ] Destructive actions ask for confirmation and can be undone or cancelled.
- [ ] Buttons disable / show progress while an action is in flight (no double-submit).
- [ ] Forms validate clearly: which field, what's wrong, how to fix it.
- [ ] Back button / navigation away mid-task behaves sensibly (warns if work would be lost).

## 6. Keyboard & accessibility
- [ ] I can tab through all interactive elements in a logical order.
- [ ] Focus is visible (focus ring) at all times.
- [ ] Enter submits, Esc closes dialogs/menus.
- [ ] Text has enough contrast against its background.
- [ ] Icons/controls have accessible labels (not icon-only with no meaning).

## 7. Data correctness & permissions
- [ ] The data shown is actually mine and up to date after an action.
- [ ] **Guest mode** — does the feature degrade gracefully or prompt sign-in?
- [ ] **Admin-only** paths are not reachable as a normal user.
- [ ] Refreshing the page keeps me in a consistent state.

## 8. Consistency & polish
- [ ] Matches the design system: colours, typography utilities, component variants.
- [ ] Matches sibling features (a new card looks like existing cards, etc.).
- [ ] No placeholder/lorem text, TODOs, or console errors left behind.
- [ ] Copy tone matches the rest of the app.

---

## Quick smoke test (when short on time)
1. Do the main task end to end.
2. Force the empty + error states.
3. Shrink to mobile width.
4. Paste in something very long.
5. Tab through with the keyboard.

If those five pass, most of the painful revisions are already caught.
