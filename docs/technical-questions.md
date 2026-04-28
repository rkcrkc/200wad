# Technical Questions — Revisit Before Launch

Open architectural questions deferred during build-out. Each item lists the
current decision, the alternatives, and the trigger for revisiting it.

---

## 1. Image delivery: skip Vercel's optimizer vs. upgrade to Pro

### Background

The app uses `next/image` for word memory-trigger images, flashcard images,
example-sentence thumbnails, and related-word thumbnails. All sources are
Supabase Storage URLs from the public `word-images` bucket.

On 27 Apr 2026 the production project (`etymology` team on Vercel) hit 100% of
the free-tier 5,000 monthly Image Optimization transformations. Once exhausted,
every `/_next/image?url=...` request errors and the browser renders broken
images for all users.

Recent feature work (`130cdfb` — global word preview sidebar, dictionary tab,
multi-lesson word view) increased the per-page image count, accelerating the
quota burn.

### Current decision (interim)

1. Set `images.unoptimized: true` globally in `next.config.ts`. Every
   `<Image>` now serves the source file directly from Supabase, bypassing
   `/_next/image` and Vercel's transformation quota entirely.
2. In `uploadFileClient`, when the bucket is `word-images` and the file is an
   image, automatically downscale to a max width of 1000 px and re-encode to
   WebP at quality 0.85 before uploading. New admin uploads land as small
   WebP files. Existing PNGs in the bucket are untouched.

### Why this is good enough for now

- Unblocks Kevin and every other user immediately.
- Trigger images are rendered at most ~730 px wide (study card) and ~500 px
  wide (sidebar); a 1000 px source is plenty.
- WebP at 0.85 typically gives a 40–60% size reduction vs. the equivalent PNG
  with no perceptible quality loss for these illustrations.
- Supabase serves storage URLs through its CDN, so repeat views don't rehit
  egress.

### What we lose

- **No automatic format conversion or resizing per device.** Every device
  downloads the same WebP. For mobile users on slow connections this is
  marginally worse than the optimizer's per-device variants.
- **No automatic AVIF.** WebP is good; AVIF is ~20% smaller but we'd only get
  it via the optimizer.
- **No automatic `srcSet`.** Native lazy-loading still works.

### Cost considerations to revisit before launch

Supabase egress, current pricing:

| Plan       | Included egress | Overage     |
|------------|----------------:|-------------|
| Free       |          5 GB/mo | hard cap   |
| Pro ($25)  |        250 GB/mo | ~$0.09/GB  |

Rough estimate: average WebP trigger image ~50–80 KB after compression; a
study session views ~10–20 images; 1,000 sessions/day ≈ 0.5–1.5 GB/day ≈
15–45 GB/month. Comfortably inside Pro. Audio egress will dominate this
number anyway.

Vercel Image Optimization plans:

| Plan      | Source images / mo |
|-----------|--------------------:|
| Hobby     |              1,000  |
| Pro ($20) |              5,000  |
| Enterprise| custom              |

### Decision points to make before launch

- [ ] **Do we re-enable the optimizer?** Only worth it if (a) a meaningful
  share of users are on bandwidth-constrained devices and benefit from
  per-device variants, *and* (b) we expect to stay under the Pro
  transformation cap. If the answer is "no" to either, leave it off.
- [ ] **Do we batch-convert the existing 1,800 PNGs in `word-images` to
  WebP?** One-off node script. Would shrink the bucket meaningfully and
  reduce egress for repeat views. Low priority but cheap to do.
- [ ] **Do we add an upload-time max file size for admin uploads?** Currently
  unbounded; downscaling caps the *output* but a 50 MB source PNG still has
  to be decoded in the browser.

### Related but separate concern

Of the 11,918 `words.memory_trigger_image_url` values in the DB, only ~5,400
resolve to files that actually exist in `word-images` (the bucket has 1,809
distinct objects). The other ~6,500 word rows point at filenames that are
not in the bucket — those will show broken images regardless of optimizer
state. Needs a separate audit pass before launch.

---
