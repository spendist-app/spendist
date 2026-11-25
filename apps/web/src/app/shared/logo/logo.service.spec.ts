import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth.service';
import { SUPABASE_CLIENT } from '../../core/supabase';
import { LogoImageCodec } from './logo-image-codec';
import { LogoService } from './logo.service';

const OWNER_ID = '41000000-0000-0000-0000-000000000001';

const OLD_FILE = 'file:6b1d3c0e-1f2a-4b3c-8d4e-5f6a7b8c9d0e.png';

class AuthServiceStub {
  readonly session = signal({ user: { id: OWNER_ID } });
}

function setup(normalised = new Blob(['x'], { type: 'image/webp' })) {
  const upload = vi.fn(async () => ({ data: {}, error: null }));
  const remove = vi.fn(async () => ({ data: [], error: null }));

  const getPublicUrl = vi.fn((path: string) => ({
    data: { publicUrl: `https://storage.example/logos/${path}` },
  }));

  const from = vi.fn(() => ({ upload, remove, getPublicUrl }));
  const normalise = vi.fn(async () => normalised);

  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useClass: AuthServiceStub },
      { provide: SUPABASE_CLIENT, useValue: { storage: { from } } },
      { provide: LogoImageCodec, useValue: { normalise } },
    ],
  });

  return {
    service: TestBed.inject(LogoService),
    from,
    upload,
    remove,
    normalise,
  };
}

describe('LogoService', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  it('resolves bundled icons and files in the owner folder', () => {
    const { service } = setup();

    expect(service.imageUrl('simple-icons:netflix:e50914')).toBe(
      '/logos/simple-icons/netflix.svg'
    );
    expect(service.imageUrl(OLD_FILE)).toBe(
      `https://storage.example/logos/${OWNER_ID}/6b1d3c0e-1f2a-4b3c-8d4e-5f6a7b8c9d0e.png`
    );
    expect(service.imageUrl('https://example.test/logo.png')).toBeNull();
  });

  it('rejects unsupported and oversized images before decoding them', async () => {
    const { service, normalise } = setup();

    await expect(
      service.prepareFile(new Blob(['<svg/>'], { type: 'image/svg+xml' }))
    ).rejects.toThrow('logos.errors.unsupportedType');

    await expect(
      service.prepareFile(
        new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/png' })
      )
    ).rejects.toThrow('logos.errors.tooLarge');

    expect(normalise).not.toHaveBeenCalled();
  });

  it('downscales a picked image and gives it a preview', async () => {
    const { service, normalise } = setup();
    const source = new Blob(['jpeg'], { type: 'image/jpeg' });

    const pending = await service.prepareFile(source);

    expect(normalise).toHaveBeenCalledWith(source);
    expect(pending.blob.type).toBe('image/webp');
    expect(pending.previewUrl).toBe('blob:preview');
  });

  it('uploads a pending image, stores its name and removes the replaced file', async () => {
    const { service, upload, remove } = setup();
    const blob = new Blob(['webp'], { type: 'image/webp' });
    const write = vi.fn(async (logo: string | null) => logo);

    const stored = await service.save(
      { value: null, pending: { blob, previewUrl: 'blob:preview' } },
      OLD_FILE,
      write
    );

    expect(stored).toMatch(/^file:[0-9a-f-]{36}\.webp$/);
    expect(upload).toHaveBeenCalledWith(
      `${OWNER_ID}/${stored?.slice('file:'.length)}`,
      blob,
      expect.objectContaining({ contentType: 'image/webp', upsert: false })
    );
    expect(write).toHaveBeenCalledWith(stored);
    expect(remove).toHaveBeenCalledWith([
      `${OWNER_ID}/6b1d3c0e-1f2a-4b3c-8d4e-5f6a7b8c9d0e.png`,
    ]);
  });

  it('removes a fresh upload when saving the record fails', async () => {
    const { service, remove } = setup();
    const blob = new Blob(['png'], { type: 'image/png' });

    await expect(
      service.save(
        { value: null, pending: { blob, previewUrl: 'blob:preview' } },
        OLD_FILE,
        async () => {
          throw new Error('places.errors.duplicate');
        }
      )
    ).rejects.toThrow('places.errors.duplicate');

    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith([
      expect.stringMatching(new RegExp(`^${OWNER_ID}/[0-9a-f-]{36}\\.png$`)),
    ]);
  });

  it('keeps the file when the logo does not change and uploads nothing for icons', async () => {
    const { service, upload, remove } = setup();

    await service.save(
      { value: OLD_FILE, pending: null },
      OLD_FILE,
      async () => null
    );
    await service.save(
      { value: 'simple-icons:lidl:0050aa', pending: null },
      'simple-icons:netflix:e50914',
      async () => null
    );

    expect(upload).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
});
