# Spendist brand system

## Logo

- `spendist-mark.svg` is the primary app icon. It combines an **S-shaped money flow** with an amber coin.
- `spendist-logo.svg` is the horizontal lockup for light backgrounds.
- Keep clear space around the logo equal to at least 25% of the mark's width.
- Minimum sizes: 24 px for the mark and 120 px for the horizontal lockup.
- Do not recolor, stretch, rotate, add shadows, or place the logo on a low-contrast background.
- In theme-aware UI, use the mark next to a live-text `Spendist` wordmark. This keeps the text sharp and lets it inherit the current theme color.

### Raster exports

Files in `brand/social/` are ready to upload:

| File                                     |        Size | Target                         |
| ---------------------------------------- | ----------: | ------------------------------ |
| `facebook-profile-320x320.png`           |   320 × 320 | Facebook Page profile          |
| `instagram-profile-320x320.png`          |   320 × 320 | Instagram profile              |
| `linkedin-company-logo-400x400.png`      |   400 × 400 | LinkedIn Page logo             |
| `x-profile-400x400.png`                  |   400 × 400 | X profile                      |
| `github-organization-avatar-500x500.png` |   500 × 500 | GitHub organization avatar     |
| `social-profile-master-1080x1080.png`    | 1080 × 1080 | High-resolution square master  |
| `social-share-1200x630.png`              |  1200 × 630 | Open Graph/social link preview |

The square exports keep the mark inside the central safe area for circular crops. PWA exports use `spendist-` filenames so browsers do not reuse obsolete scaffold icons cached under generic names. Regenerate all favicon, PWA, and social PNG files with `node tools/scripts/generate-brand-assets.mjs`.

## Core palette

The teal primary expresses control and clarity. Amber highlights value and attention. Orange is reserved for energetic accents. Semantic colors must not be used as decorative substitutes.

| Role             | Light     | Dark      | Usage                                |
| ---------------- | --------- | --------- | ------------------------------------ |
| Background       | `#FFFDFB` | `#111315` | Page canvas                          |
| Surface          | `#FFFFFF` | `#161A1D` | Cards, navigation, dialogs           |
| Elevated/divider | `#F3F4F6` | `#0B0D0F` | Subtle borders and nested surfaces   |
| Text             | `#111827` | `#E5E7EB` | Primary text and icons               |
| Primary          | `#0EA5A5` | `#2DD4BF` | Main actions, active state, links    |
| Secondary        | `#F59E0B` | `#FBBF24` | Highlights and secondary emphasis    |
| Accent           | `#EA580C` | `#FB923C` | Small promotional accents only       |
| Neutral          | `#1F2933` | `#2B3036` | Neutral controls and strong dividers |

## Semantic palette

| Role    | Light     | Dark      | Usage                               |
| ------- | --------- | --------- | ----------------------------------- |
| Info    | `#0EA5A5` | `#2DD4BF` | Informational feedback              |
| Success | `#16A34A` | `#16A34A` | Confirmed saves, positive status    |
| Warning | `#D97706` | `#FBBF24` | Risk that still allows continuation |
| Danger  | `#DC2626` | `#DC2626` | Errors and destructive actions      |

## Content colors and accessibility

Use the paired content color whenever text or an icon sits directly on a solid token.

| Fill                      | Content   | Contrast |
| ------------------------- | --------- | -------: |
| Light primary `#0EA5A5`   | `#062824` |   5.19:1 |
| Light secondary `#F59E0B` | `#422100` |   6.75:1 |
| Light accent `#EA580C`    | `#2A0A00` |   5.17:1 |
| Light success `#16A34A`   | `#052E17` |   4.52:1 |
| Light warning `#D97706`   | `#3D1C00` |   4.83:1 |
| Danger `#DC2626`          | `#FFFFFF` |   4.83:1 |
| Dark primary `#2DD4BF`    | `#062824` |   8.44:1 |
| Dark secondary `#FBBF24`  | `#3F2A06` |   8.14:1 |
| Dark accent `#FB923C`     | `#3C1400` |   7.18:1 |

- Target WCAG AA: at least 4.5:1 for normal text and 3:1 for large text or UI boundaries.
- Color never carries meaning alone; pair status colors with an icon, label, or message.
- Use opacity only for decoration. Interactive text and controls use explicit token pairs.
- The approved brand gradient runs from dark-theme primary `#2DD4BF` to light-theme primary `#0EA5A5`. The amber coin remains `#FBBF24`.

## Source of truth

Runtime DaisyUI values live in `apps/web/tailwind.config.js`. Matching CSS custom properties in `apps/web/src/styles.css` provide stable SSR and theme fallbacks. Update both files together when the palette changes.
