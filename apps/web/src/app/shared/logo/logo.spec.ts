import {
  catalogKey,
  fileLogo,
  fitWithin,
  logoGlyphTone,
  parseLogo,
  searchCatalog,
  simpleIconLogo,
} from './logo';

const FILE_NAME = '6b1d3c0e-1f2a-4b3c-8d4e-5f6a7b8c9d0e.webp';

describe('logo values', () => {
  it('parses both stored shapes', () => {
    expect(parseLogo('simple-icons:netflix:e50914')).toEqual({
      kind: 'simple-icons',
      slug: 'netflix',
      hex: 'e50914',
    });

    expect(parseLogo(`file:${FILE_NAME}`)).toEqual({
      kind: 'file',
      fileName: FILE_NAME,
    });
  });

  it.each([
    null,
    '',
    'https://example.test/logo.png',
    'simple-icons:Netflix:E50914',
    'simple-icons:../x:e50914',
    'file:../other/logo.png',
    `file:${FILE_NAME.replace('.webp', '.svg')}`,
  ])('rejects %s', (value) => {
    expect(parseLogo(value)).toBeNull();
  });

  it('builds stored values and lower-cases the brand colour', () => {
    expect(simpleIconLogo('lidl', '0050AA')).toBe('simple-icons:lidl:0050aa');
    expect(simpleIconLogo('Lidl', '0050AA')).toBeNull();
    expect(fileLogo(FILE_NAME)).toBe(`file:${FILE_NAME}`);
    expect(fileLogo('logo.png')).toBeNull();
  });
});

describe('logoGlyphTone', () => {
  it.each([
    ['000000', 'light'],
    ['e50914', 'light'],
    ['0050aa', 'light'],
    ['ffffff', 'dark'],
    ['fbc817', 'dark'],
    ['1ed760', 'dark'],
  ] as const)('draws on #%s with a %s glyph', (hex, tone) => {
    expect(logoGlyphTone(hex)).toBe(tone);
  });
});

describe('fitWithin', () => {
  it('scales the longest edge down and keeps the ratio', () => {
    expect(fitWithin(512, 256, 192)).toEqual({ width: 192, height: 96 });
    expect(fitWithin(300, 600, 192)).toEqual({ width: 96, height: 192 });
  });

  it('never scales up', () => {
    expect(fitWithin(64, 32, 192)).toEqual({ width: 64, height: 32 });
  });
});

describe('searchCatalog', () => {
  const entry = (title: string, ...aliases: string[]) => ({
    title,
    keys: [title, ...aliases].map(catalogKey),
  });

  const entries = [
    entry('Disney+', 'disney plus'),
    entry('Walt Disney World'),
    entry('Disney'),
    entry('Żabka'),
    entry('Netflix'),
  ];

  it('ranks exact matches before prefixes and substrings', () => {
    expect(
      searchCatalog(entries, 'disney', 10).map((match) => match.title)
    ).toEqual(['Disney', 'Disney+', 'Walt Disney World']);
  });

  it('ignores case, spacing, punctuation and Polish diacritics', () => {
    expect(searchCatalog(entries, ' ZABKA ', 10)).toEqual([entries[3]]);
    expect(searchCatalog(entries, 'disney plus', 10)).toEqual([entries[0]]);
  });

  it('returns nothing for an empty query and respects the limit', () => {
    expect(searchCatalog(entries, '  ', 10)).toEqual([]);
    expect(searchCatalog(entries, 'n', 2)).toHaveLength(2);
  });
});
