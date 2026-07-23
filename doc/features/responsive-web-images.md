# Responsive web images

## Purpose

Spendist has one repository pipeline for static raster graphics used by the
public blog and other web pages. It produces appropriately sized modern files,
keeps original assets out of the deployment tree, and makes file ownership
obvious.

## Source ownership

- Blog originals: `apps/web/image-sources/blog/{pl|en}/{article-slug}/`.
  Every file in this directory belongs to exactly one article. `cover` is
  reserved for its cover image.
- Other public-page originals:
  `apps/web/image-sources/site/{feature}/{asset-name}.{ext}`.
- Supported raster sources are AVIF, JPEG, PNG, TIFF, and WebP.
- Paths and filenames use lowercase kebab-case.
- SVG logos and icons remain directly in `apps/web/public/`; they must not be
  converted to raster variants.
- User uploads and generated PWA/social brand assets have separate lifecycles
  and are not inputs to this pipeline.

## Generated output

`npm run images:generate` uses Sharp to auto-orient each source and creates
candidate widths from 320, 480, 768, 1024, 1200, and 1600 pixels without
upscaling. Each width has AVIF and WebP output. A maximum-size JPEG fallback is
created for opaque images and PNG for transparent images.

Generated files mirror the logical source ID under
`apps/web/public/media/`. `apps/web/public/media-manifest.json` is the
build-time contract for blog generation, and
`image-manifest.generated.ts` exposes the same data to Angular pages.
Generated output must not be edited manually.

`npm run images:check` compares source hashes, manifest entries, output files,
and the Angular manifest. The Nx production build depends on this check.

## Rendering contract

`ResponsiveImage` renders `<picture>` with AVIF and WebP sources, width-based
`srcset`, a layout-specific `sizes` value, intrinsic width and height, and a
fallback `<img>`. It lazy-loads non-critical images and applies eager loading
plus high fetch priority to an explicitly marked LCP image.

Published blog front matter stores a stable logical `coverImageId`, not output
filenames or hand-entered dimensions. Markdown body images use
`![alt](image:asset-name "Optional caption")`; the blog generator resolves the
asset in that article's source directory and emits sanitized responsive HTML.
External or direct file URLs are rejected for published Markdown images.

## Limits

- The pipeline does not crop or art-direct images. Editors are responsible for
  the composition and meaningful alternative text.
- A published blog cover must be at least 1200 pixels wide and use the 1200:630
  social-sharing ratio.
- The pipeline does not generate or invent images.
