# Responsive image sources

This directory contains original raster files. They are build inputs, not
public assets.

- Blog: `blog/{pl|en}/{article-slug}/{asset-name}.{jpg|png|webp|avif|tif}`
- Other public pages: `site/{feature}/{asset-name}.{jpg|png|webp|avif|tif}`

Use lowercase kebab-case. Every article owns one directory, so `cover.jpg`,
`chart.png`, and other files are unambiguously tied to that post.

Run `npm run images:generate` after adding or replacing a source. Generated
AVIF, WebP, and fallback files go to `apps/web/public/media/`; do not edit them
by hand. Run `npm run images:check` to detect missing or stale output.

Keep SVG files in `apps/web/public/` because they should not be rasterized.
Generated application icons and user-uploaded images have separate pipelines
and do not belong here.
