# Gluedle brand spec

## Status and scope

`GLUE` is the primary identity of the album-site experience. `Gluedle` is its independent, non-audio song-guessing interaction, built around publicly verifiable metadata for songs performed by 希林娜依高 (Curley G / Curley Gao). `Green to Blue` is a secondary concept chapter inside the `GLUE` story, not the site wordmark or the name repeated across every page.

The runtime images listed below are original AI-generated replacements created for this repository. They are not official artist, label, album, or campaign assets, and their presence does not imply endorsement by any artist, label, or platform.

## Approved visual direction — CONTACT LAKE / 湖面内页

The August 2026 redesign treats the site as an unfolded album booklet rather than a conventional portfolio or card-based product page. The user-supplied campaign images are visual references only; their pixels, watermarks, and social-media marks are not shipped.

### Positioning

- Narrative role: the album story leads; Gluedle is a functional extension of the same visual world.
- Viewing distance: the desktop composition uses oversized crops and negative space, while mobile keeps body copy and controls readable at close range.
- Visual temperature: cold, quiet, damp, and experimental rather than glossy or futuristic.
- Capacity: each editorial viewport carries one primary visual idea; the game may remain information-dense where comparison requires it.

### Confirmed system rules

- Black and cool white occupy roughly 90% of each composition; lake blue is reserved for droplets, orbits, indices, focus, and active states.
- Sharp cuts and flat image planes replace generic rounded cards, glass surfaces, and decorative elevation.
- Micro typography behaves like registration marks or dot-matrix metadata. Long Chinese copy remains in a highly legible sans-serif stack.
- Motion is slow and surface-like: exposure, drift, reveal, and ripple. Reduced-motion users receive the same hierarchy without continuous movement.
- Existing anonymous, watermark-free runtime artwork remains the only imagery used by the application.

The user approved the v0 direction for full-site implementation. The system applies to the home page, Concept, Visuals, Glue, Catalog, every Gluedle interaction state, and the exported share card; semantic game colors remain confined to feedback marks and result cells.

## Asset provenance and manifest

- Source status: newly generated project artwork; no pixels copied from the untracked reference material.
- Generation path: Codex built-in `image_gen`, `stylized-concept` prompts, 2026-08-01.
- Untracked references: `visual-previews-v2/` remains untouched and is not consumed at runtime.
- Runtime directory: `public/assets/glue/`
- Output constraints: anonymous subjects; no celebrity likeness; no text, letters, numbers, logos, watermark, signature, social-media mark, brand mark, or readable symbols.
- File format: WebP, resized to the existing runtime dimensions so layout contracts remain stable.

| Runtime asset | Dimensions | Intended prototype role |
| --- | --- | --- |
| `public/assets/glue/blue-noise-texture.webp` | 2362 × 2362 | lake-blue grain / atmosphere |
| `public/assets/glue/body-detail-editorial.webp` | 2160 × 2160 | clothed hand-and-sleeve detail |
| `public/assets/glue/editorial-collage.webp` | 2160 × 2160 | layered anonymous portrait collage |
| `public/assets/glue/introduction-spread.webp` | 1256 × 2760 | vertical figure and water spread |
| `public/assets/glue/motion-blur-portrait.webp` | 2362 × 2362 | anonymous motion / transition image |
| `public/assets/glue/orbit-graphic.webp` | 2160 × 2160 | figure-and-orbit motif |
| `public/assets/glue/portrait-editorial.webp` | 2362 × 2362 | anonymous overexposed editorial portrait |
| `public/assets/glue/water-ripple.webp` | 2362 × 2362 | fingertip-and-ripple motif |
| `public/assets/glue/top-view-portrait.webp` | 2362 × 2362 | anonymous top-view composition |

These role labels are internal design guidance only; they do not identify the creator, subject, publication, or original campaign.

## Design tokens

### Color

| Token | Value | Use |
| --- | --- | --- |
| `--black` | `#050505` | near-black ground, primary type |
| `--black-soft` | `#111211` | raised dark surface |
| `--white` | `#F4F3ED` | exposed white, high-contrast type |
| `--white-cool` | `#E8EBEB` | quiet editorial surface |
| `--lake` | `#87A8BE` | primary lake blue |
| `--lake-dark` | `#537B98` | depth, focus, active state |
| `--green` | `#9CB59A` | secondary accent used only inside the Green to Blue concept chapter |
| `--correct` | `#49E99B` | exact metadata match, aligned with Preview 5 |
| `--near` | `#FFD75B` | near or partial metadata match, aligned with Preview 5 |
| `--wrong` | `#FF5964` | metadata mismatch, aligned with Preview 5 |
| `--grey` | `#A7AAA8` | secondary metadata |
| `--grey-dark` | `#4D504E` | quiet rules and inactive state |

### Typography

- Display stack: `Archivo, "Arial Narrow", sans-serif`
- Editorial/body stack: `Archivo, "Noto Sans SC", "PingFang SC", sans-serif`
- Metadata stack: `"IBM Plex Mono", "Courier New", monospace`
- Display tracking: `-0.04em`
- Metadata tracking: `0.08em`

Font names are direction tokens, not bundled font licenses. Any production build must confirm availability and webfont licensing or use system fallbacks.

### Layout, surface, and motion

- Base spacing: `8px`
- Structural radius: `0px`; panels, controls, images, and sheets use sharp cuts
- Circular geometry is reserved for orbit lines, ripple marks, registration dots, and status seals
- Reading measure: `62ch`
- Grain opacity: `0.08–0.16`
- Image treatment: hard crops, overexposed whites, dark negative space, and restrained editorial overlap
- Motifs: ripples, orbits, soft liquid boundaries, and one deliberate collage layer per major section
- Transition duration: `180–320ms`
- Transition curve: `cubic-bezier(0.22, 1, 0.36, 1)`
- Reduced motion: remove parallax and continuous drift when `prefers-reduced-motion` is active

## Rights and authorization checklist

Before any public or commercial release, confirm and document:

1. the applicable image-generation service terms and intended commercial-use scope;
2. that generated subjects remain anonymous and do not create a misleading real-person likeness;
3. permission for any artist name, album name, wordmark, or trade-dress usage;
4. webfont and other third-party asset licenses; and
5. the accuracy and publication status of all 2026 album or campaign claims.

Do not label the generated artwork “official,” use it to imply endorsement, recreate an official logo from it, or infer credits and release facts from visual style alone.
