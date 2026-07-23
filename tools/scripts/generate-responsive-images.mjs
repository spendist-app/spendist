import { createHash } from 'node:crypto';
import {
  access,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const ROOT = process.cwd();
const SOURCE_ROOT = path.join(ROOT, 'apps/web/image-sources');
const PUBLIC_MEDIA_ROOT = path.join(ROOT, 'apps/web/public/media');
const PUBLIC_MANIFEST = path.join(ROOT, 'apps/web/public/media-manifest.json');
const GENERATED_TS = path.join(
  ROOT,
  'apps/web/src/app/shared/responsive-image/image-manifest.generated.ts'
);
const SUPPORTED_EXTENSIONS = new Set([
  '.avif',
  '.jpeg',
  '.jpg',
  '.png',
  '.tif',
  '.tiff',
  '.webp',
]);
const TARGET_WIDTHS = [320, 480, 768, 1024, 1200, 1600];
const GENERATOR_VERSION = 1;

function posixPath(value) {
  return value.split(path.sep).join('/');
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(
    (error) => {
      if (error?.code === 'ENOENT') return [];
      throw error;
    }
  );
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    if (
      entry.isFile() &&
      SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
    ) {
      files.push(absolute);
    }
  }
  return files;
}

function sourceId(file) {
  const relative = path.relative(SOURCE_ROOT, file);
  const extension = path.extname(relative);
  const id = posixPath(relative.slice(0, -extension.length));
  if (
    !/^(?:blog\/(?:pl|en)\/[a-z0-9]+(?:-[a-z0-9]+)*|site\/[a-z0-9]+(?:-[a-z0-9]+)*)(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)+$/.test(
      id
    )
  ) {
    throw new Error(
      `${relative}: image paths must use lowercase kebab-case under ` +
        '`blog/{pl|en}/{slug}/` or `site/{feature}/`.'
    );
  }
  return id;
}

function widthsFor(sourceWidth) {
  const maximum = Math.min(sourceWidth, TARGET_WIDTHS.at(-1));
  return [
    ...new Set([...TARGET_WIDTHS.filter((width) => width < maximum), maximum]),
  ];
}

function publicPath(...parts) {
  return `/${posixPath(path.join(...parts))}`;
}

async function fingerprint(file) {
  const content = await readFile(file);
  return createHash('sha256').update(content).digest('hex');
}

async function createEntry(file, id) {
  const metadata = await sharp(file).metadata();
  const oriented = metadata.autoOrient ?? metadata;
  const sourceWidth = oriented.width;
  const sourceHeight = oriented.height;
  if (!sourceWidth || !sourceHeight) {
    throw new Error(`${path.relative(ROOT, file)}: cannot read image size.`);
  }
  const widths = widthsFor(sourceWidth);
  const fileName = path.basename(id);
  const outputDirectory = path.join(PUBLIC_MEDIA_ROOT, id);
  await mkdir(outputDirectory, { recursive: true });

  const variants = [];
  for (const width of widths) {
    const height = Math.round((sourceHeight * width) / sourceWidth);
    for (const format of ['avif', 'webp']) {
      const output = path.join(
        outputDirectory,
        `${fileName}-${width}.${format}`
      );
      let pipeline = sharp(file).autoOrient().resize({
        width,
        withoutEnlargement: true,
      });
      pipeline =
        format === 'avif'
          ? pipeline.avif({ quality: 52, effort: 6 })
          : pipeline.webp({ quality: 76, effort: 6 });
      await pipeline.toFile(output);
      variants.push({
        format,
        src: publicPath('media', id, path.basename(output)),
        width,
        height,
      });
    }
  }

  const fallbackWidth = widths.at(-1);
  const fallbackHeight = Math.round(
    (sourceHeight * fallbackWidth) / sourceWidth
  );
  const fallbackFormat = metadata.hasAlpha ? 'png' : 'jpg';
  const fallbackFile = path.join(
    outputDirectory,
    `${fileName}-fallback.${fallbackFormat}`
  );
  let fallbackPipeline = sharp(file).autoOrient().resize({
    width: fallbackWidth,
    withoutEnlargement: true,
  });
  fallbackPipeline = metadata.hasAlpha
    ? fallbackPipeline.png({ compressionLevel: 9, effort: 10 })
    : fallbackPipeline.jpeg({ quality: 82, mozjpeg: true });
  await fallbackPipeline.toFile(fallbackFile);

  return {
    id,
    source: posixPath(path.relative(ROOT, file)),
    sourceHash: await fingerprint(file),
    width: fallbackWidth,
    height: fallbackHeight,
    fallback: {
      src: publicPath('media', id, path.basename(fallbackFile)),
      width: fallbackWidth,
      height: fallbackHeight,
    },
    avifSrcset: variants
      .filter((variant) => variant.format === 'avif')
      .map((variant) => `${variant.src} ${variant.width}w`)
      .join(', '),
    webpSrcset: variants
      .filter((variant) => variant.format === 'webp')
      .map((variant) => `${variant.src} ${variant.width}w`)
      .join(', '),
    files: [
      ...variants.map((variant) => variant.src),
      publicPath('media', id, path.basename(fallbackFile)),
    ],
  };
}

function manifestJson(entries) {
  return `${JSON.stringify(
    {
      generatorVersion: GENERATOR_VERSION,
      widths: TARGET_WIDTHS,
      images: Object.fromEntries(entries.map((entry) => [entry.id, entry])),
    },
    null,
    2
  )}\n`;
}

function manifestTypescript(entries) {
  const images = Object.fromEntries(
    entries.map(({ sourceHash: _sourceHash, files: _files, ...entry }) => [
      entry.id,
      entry,
    ])
  );
  return `import type { WebImage } from './responsive-image.types';\n\n// Generated by tools/scripts/generate-responsive-images.mjs. Do not edit manually.\nexport const WEB_IMAGES: Readonly<Record<string, WebImage>> = ${JSON.stringify(
    images,
    null,
    2
  )};\n`;
}

async function verifyCurrent() {
  const files = await walk(SOURCE_ROOT);
  const manifest = JSON.parse(
    await readFile(PUBLIC_MANIFEST, 'utf8').catch(() => '{}')
  );
  if (manifest.generatorVersion !== GENERATOR_VERSION) {
    throw new Error('Responsive image manifest uses an old generator version.');
  }
  const expectedIds = files.map(sourceId);
  const currentIds = Object.keys(manifest.images ?? {}).sort();
  if (JSON.stringify(expectedIds) !== JSON.stringify(currentIds)) {
    throw new Error('Responsive image manifest does not match image sources.');
  }
  for (const file of files) {
    const id = sourceId(file);
    const entry = manifest.images[id];
    if (entry.sourceHash !== (await fingerprint(file))) {
      throw new Error(`${entry.source}: generated variants are stale.`);
    }
    for (const asset of entry.files) {
      await access(path.join(ROOT, 'apps/web/public', asset.slice(1)));
    }
  }
  const entries = currentIds.map((id) => manifest.images[id]);
  const expectedTs = manifestTypescript(entries);
  const currentTs = await readFile(GENERATED_TS, 'utf8').catch(() => '');
  if (currentTs !== expectedTs) {
    throw new Error('Generated TypeScript image manifest is stale.');
  }
}

async function generate() {
  const files = await walk(SOURCE_ROOT);
  const ids = files.map(sourceId);
  if (new Set(ids).size !== ids.length) {
    throw new Error('Two source images resolve to the same logical image ID.');
  }
  await rm(PUBLIC_MEDIA_ROOT, { recursive: true, force: true });
  const entries = [];
  for (let index = 0; index < files.length; index += 1) {
    entries.push(await createEntry(files[index], ids[index]));
  }
  await mkdir(path.dirname(PUBLIC_MANIFEST), { recursive: true });
  await mkdir(path.dirname(GENERATED_TS), { recursive: true });
  await writeFile(PUBLIC_MANIFEST, manifestJson(entries));
  await writeFile(GENERATED_TS, manifestTypescript(entries));
}

async function main() {
  if (process.argv.includes('--check')) {
    await verifyCurrent();
    console.log('Responsive image artifacts are current.');
    return;
  }
  await generate();
  console.log('Responsive image artifacts generated.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
