# Gluedle brand spec

## Status and scope

Gluedle is an independent, non-audio song-guessing prototype built around publicly verifiable metadata for songs performed by 希林娜依高 (Curley G / Curley Gao). The `Green to Blue` and `Glue` language used by this project is concept copy unless a cited public source says otherwise.

The images listed below are **user-provided project materials**. They are not described as official artist, label, album, or campaign assets, and their presence in this repository does not imply endorsement or authorization by any artist, label, photographer, designer, or other rights holder.

## Asset provenance and manifest

- Source status: user-provided, untracked reference material supplied with this project.
- Source directory (read-only): `visual-previews-v2/assets/glue-brand/`
- Runtime directory: `public/assets/glue/`
- Transfer method: byte-for-byte copy; source files remain in place and are not committed.
- File format: the supplied JPEG format is preserved.

| User-provided source | Runtime copy | Intended prototype role |
| --- | --- | --- |
| `visual-previews-v2/assets/glue-brand/glue-blue-noise.jpg` | `public/assets/glue/blue-noise-texture.jpg` | lake-blue grain / atmosphere |
| `visual-previews-v2/assets/glue-brand/glue-body-detail.jpg` | `public/assets/glue/body-detail-editorial.jpg` | editorial detail crop |
| `visual-previews-v2/assets/glue-brand/glue-collage.jpg` | `public/assets/glue/editorial-collage.jpg` | layered collage |
| `visual-previews-v2/assets/glue-brand/glue-introduction.jpg` | `public/assets/glue/introduction-spread.jpg` | introduction spread |
| `visual-previews-v2/assets/glue-brand/glue-motion.jpg` | `public/assets/glue/motion-blur-portrait.jpg` | motion / transition image |
| `visual-previews-v2/assets/glue-brand/glue-orbit.jpg` | `public/assets/glue/orbit-graphic.jpg` | orbit motif |
| `visual-previews-v2/assets/glue-brand/glue-portrait.jpg` | `public/assets/glue/portrait-editorial.jpg` | editorial portrait |
| `visual-previews-v2/assets/glue-brand/glue-ripple.jpg` | `public/assets/glue/water-ripple.jpg` | ripple motif |
| `visual-previews-v2/assets/glue-brand/glue-top-view.jpg` | `public/assets/glue/top-view-portrait.jpg` | top-view portrait |

These role labels are internal design guidance only; they do not identify the creator, subject, publication, or original campaign.

## Design tokens

### Color

| Token | Value | Use |
| --- | --- | --- |
| `--color-ink` | `#0B1111` | near-black ground, primary type |
| `--color-exposure` | `#F4F7F4` | exposed white, high-contrast type |
| `--color-paper` | `#E9EEEA` | quiet editorial surface |
| `--color-lake` | `#79C6D3` | primary lake blue |
| `--color-lake-deep` | `#247D91` | depth, focus, active state |
| `--color-green` | `#9BCB9A` | the “green” end of the concept gradient |
| `--color-blue` | `#4A91B2` | the “blue” end of the concept gradient |
| `--color-muted` | `#788380` | secondary metadata |

### Typography

- Display stack: `Manrope, "Noto Sans SC", sans-serif`
- Editorial/body stack: `"Noto Sans SC", "PingFang SC", sans-serif`
- Metadata stack: `"DM Mono", "SFMono-Regular", monospace`
- Display tracking: `-0.04em`
- Metadata tracking: `0.08em`

Font names are direction tokens, not bundled font licenses. Any production build must confirm availability and webfont licensing or use system fallbacks.

### Layout, surface, and motion

- Base spacing: `8px`
- Compact radius: `12px`
- Panel radius: `28px`
- Reading measure: `62ch`
- Grain opacity: `0.08–0.16`
- Image treatment: hard crops, overexposed whites, dark negative space, and restrained editorial overlap
- Motifs: ripples, orbits, soft liquid boundaries, and one deliberate collage layer per major section
- Transition duration: `180–320ms`
- Transition curve: `cubic-bezier(0.22, 1, 0.36, 1)`
- Reduced motion: remove parallax and continuous drift when `prefers-reduced-motion` is active

## Rights and authorization checklist

Before any public or commercial release, confirm and document:

1. the copyright owner and reuse license for each of the nine JPEG files;
2. portrait/model releases and publicity rights for every identifiable person;
3. photographer, art director, designer, label, and campaign usage permissions where applicable;
4. territory, duration, media, derivative-work, promotional, and commercial-use scope;
5. permission for any artist name, album name, logo, wordmark, or trade-dress usage;
6. webfont and other third-party asset licenses; and
7. the accuracy and publication status of all 2026 album or campaign claims.

Until those checks are complete, use these images only as user-provided prototype references. Do not label them “official,” recreate an official logo from them, or infer credits and release facts from the artwork alone.
