# Cross-Volume Image Collision (flat storage key)

A small set of words display the **wrong illustration** because two different
source images were forced to share one storage object. This affects the
multi-volume languages — **French, German, Spanish** — where Volume 1 and
Volume 2 are imported as separate passes but write images under the **same
storage slug**.

> Status: **documented, not yet remediated.** German is disc-verified below.
> French/Spanish candidate words are listed; their source discs were not mounted
> at write-up time, so which of their shared stems are genuinely different art
> vs. benign reuse is marked *unverified*.

## 1. Mechanism

The media importer (`scripts/import-legacy-media.ts`) keys uploads like this:

- **Audio** → `word-audio/<slug>/<prefix>/<type>/<stem>.mp3` — *namespaced by the
  volume's `audioPrefixByCourseRef` folder* (`1…`, `2…`, `21…`, `22…`). No clash.
- **Image** → `word-images/<slug>/<stem>.<ext>` — **flat. The volume/prefix is
  not part of the key** (`processImage`, key = `` `${media.slug}/${stem}.${outExt}` ``).

Both volumes of a language share one `slug` (`french`, `german`, `spanish`), so a
stem that exists in **both** volumes resolves to **one** object. The two volumes'
source folders differ (`1Pictures` for vol-1, `2Pictures`/`22Pictures` for vol-2),
and those files are often **different drawings for the different sense of the
word**. Uploads use `upsert: false` (first-writer-wins), and the **vol-1 pass runs
first**, so the object holds the **vol-1 image** and every vol-2 word with that
stem silently reuses it.

Verified on German: the live `…/german/Patient.gif` is byte-identical to
`1Pictures/Patient.gif` (vol-1) and differs from `2Pictures/Patient.gif` (vol-2).

## 2. Scope

Forced-shared image stems (a stem referenced by both a vol-1 and a vol-2 course):

| Language | Shared stems | Disc-verified different art? |
|---|---|---|
| German | 5 | **Yes — all 5** (`Pflaster` only trivially, ~2 bytes) |
| French | 5 | Unverified (disc not mounted) |
| Spanish | 3 | Unverified (disc not mounted) |

Italian is a **single-disc** import (one pass, refs 1/21/41/42/81) so it has no
vol-1/vol-2 split; the same flat-key mechanism could in theory bite across its
internal decks, but that was not investigated here.

## 3. Affected words

The **vol-2** rows below are the ones currently showing the **vol-1** picture.
"Same word" = both volumes teach the same headword, so the reused drawing is
conceptually fine; "different sense" = the vol-2 word means something else and the
shared image is likely wrong.

### German (disc-verified: every stem's source art differs)

| Stem | Vol-1 (winning image) | Vol-2 (shows vol-1 art) | Risk |
|---|---|---|---|
| `kehren` | Vocab #1 *kehren*; Sentences *„Ich kehre rechts in die Straße.“* | Vocab #2 *kehren*; Sentences 2 *„Sie wollen das unter dem Teppich kehren.“* | different sense (turn vs. sweep) |
| `Patient` | Vocab #1 *der Patient*; *„Wie geht es dem Patienten heute?“* | Vocab #2 *der Patient*; *„Der Patient beklagt sich über Ohrenschmerzen.“* | same word |
| `Pflaster` | Vocab #1 *das Pflaster*; *„Ich brauche ein Pflaster für meine Wunde.“* | Vocab #2 *das Pflaster*; *„Das Pflaster ist zu heiß um barfuß zu laufen.“* | different sense (plaster vs. pavement) — but art ~identical, cosmetic |
| `probieren` | Vocab #1 *probieren*; *„Probieren Sie mal!“* | Vocab #2 *probieren*; *„Ich möchte gerne das Haifisch-Steak probieren.“* | same word |
| `Vergnügen` | Vocab #1 *das Vergnügen*; *„Es war mir ein Vergnügen.“* | Vocab #2 *das Vergnügen*; *„Das Vergnügen ist ganz meinerseits.“* | same word |

### French (unverified — discs not mounted)

| Stem | Vol-1 | Vol-2 (shows vol-1 art) | Likely risk |
|---|---|---|---|
| `age` | Vocab #1 *l'âge (m)*; *„Ils ont tous le même âge dans ma classe.“* | Vocab #2 *âgé* | different sense (age vs. aged) |
| `cest combien` | Vocab #1 *c'est combien?*; *„…C'est combien?“* | Vocab #2 *combien?* | related |
| `attendre` | Vocab #1 *attendre* | Vocab #2 *attendre* | same word |
| `raconter` | Vocab #1 *raconter*; *„Raconte-moi ta journée!“* | Vocab #2 *raconter* | same word |
| `sport` | Vocab #1 *le sport* | Vocab #2 *le sport* | same word |

### Spanish (unverified — discs not mounted)

| Stem | Vol-1 | Vol-2 (shows vol-1 art) | Likely risk |
|---|---|---|---|
| `rosa` | Vocab #1 *rosa*; *„Me he comprado un coche rosa.“* | Vocab #2 *la rosa*; Sentences 2 *„Me gustan las rosas rojas.“* | different sense (pink vs. rose) |
| `afueras` | Vocab #1 *fuera*; *„Te espero fuera.“* | Vocab #2 *las afueras* | different sense (outside vs. outskirts) |
| `fiel` | Vocab #1 *el fiel*; *„Yo siempre soy fiel a mis principios.“* | Vocab #2 *fiel* | same/related |

## 4. Remediation options (not yet applied)

1. **Surgical (recommended for the few "different sense" rows).** Re-upload the
   vol-2 source under a volume-distinct key (e.g. `…/german/2/<stem>.png`) and
   point only the affected vol-2 words at it. Smallest blast radius; leaves the
   benign same-word reuses alone.
2. **Namespace all image keys by volume/prefix** (mirror the audio scheme:
   `word-images/<slug>/<prefix>/<stem>.<ext>`) and re-run the media passes.
   Cleanest long-term, prevents the whole class, but re-uploads every image and
   rewrites every `memory_trigger_image_url`.
3. **Accept** the same-word and trivially-identical cases (e.g. German
   `Pflaster`, `Patient`, `probieren`, `Vergnügen`) as harmless reuse and only
   fix the genuine mismatches (German `kehren`; pending verification: French
   `age`/`cest combien`, Spanish `rosa`/`afueras`).

Before fixing French/Spanish, mount their discs and byte-compare
`1Pictures/<stem>` vs `2Pictures/<stem>` (as done for German in §1) to confirm
which shared stems are genuinely different art.
