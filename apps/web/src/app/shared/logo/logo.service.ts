import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { logError } from '../../core/logger';
import { SUPABASE_CLIENT } from '../../core/supabase';
import { LogoImageCodec } from './logo-image-codec';
import {
  LOGO_BUCKET,
  LOGO_SOURCE_MAX_BYTES,
  LOGO_SOURCE_TYPES,
  LOGO_STORED_EXTENSIONS,
  LOGO_STORED_MAX_BYTES,
  type LogoDraft,
  type PendingLogoFile,
  fileLogo,
  parseLogo,
  simpleIconPath,
} from './logo';

/**
 * Prepares, uploads, resolves and removes logo files. A file logo always
 * lives in the signed-in user's folder; the stored value names only the
 * file, so it cannot reach another user's folder.
 */
@Injectable({ providedIn: 'root' })
export class LogoService {
  private readonly supabase = inject(SUPABASE_CLIENT);
  private readonly auth = inject(AuthService);
  private readonly codec = inject(LogoImageCodec);

  /** URL of a stored logo's image, or null when the value is not a logo. */
  imageUrl(value: string | null, ownerId: string | null = null): string | null {
    const logo = parseLogo(value);

    if (!logo) return null;

    if (logo.kind === 'simple-icons') return simpleIconPath(logo.slug);

    const owner = ownerId ?? this.auth.session()?.user.id;

    return owner
      ? this.supabase.storage
          .from(LOGO_BUCKET)
          .getPublicUrl(`${owner}/${logo.fileName}`).data.publicUrl
      : null;
  }

  /**
   * Checks and downscales an image the user picked. The caller owns the
   * preview URL and revokes it with `releasePending`.
   */
  async prepareFile(source: Blob): Promise<PendingLogoFile> {
    if (!LOGO_SOURCE_TYPES.includes(source.type)) {
      throw new Error('logos.errors.unsupportedType');
    }

    if (source.size > LOGO_SOURCE_MAX_BYTES) {
      throw new Error('logos.errors.tooLarge');
    }

    const blob = await this.codec.normalise(source);

    if (
      !LOGO_STORED_EXTENSIONS.has(blob.type) ||
      blob.size > LOGO_STORED_MAX_BYTES
    ) {
      throw new Error('logos.errors.decode');
    }

    return { blob, previewUrl: URL.createObjectURL(blob) };
  }

  releasePending(pending: PendingLogoFile | null): void {
    if (pending) URL.revokeObjectURL(pending.previewUrl);
  }

  /**
   * Saves a record with the drafted logo: uploads a pending image first,
   * runs `write` with the value to store, removes the fresh upload if the
   * write fails and removes the replaced file once it succeeds.
   */
  async save<T>(
    draft: LogoDraft,
    previous: string | null,
    write: (logo: string | null) => Promise<T>
  ): Promise<T> {
    const uploaded = draft.pending
      ? await this.upload(draft.pending.blob)
      : null;

    const next = uploaded ?? draft.value;
    let result: T;

    try {
      result = await write(next);
    } catch (error) {
      if (uploaded) await this.removeFile(uploaded);

      throw error;
    }

    if (previous !== next) await this.removeFile(previous);

    return result;
  }

  /** Deletes the file behind a file logo. Failures are logged, not thrown. */
  async removeFile(value: string | null): Promise<void> {
    const logo = parseLogo(value);
    const userId = this.auth.session()?.user.id;

    if (logo?.kind !== 'file' || !userId) return;

    const { error } = await this.supabase.storage
      .from(LOGO_BUCKET)
      .remove([`${userId}/${logo.fileName}`]);

    if (error) logError('LogoService', 'Failed to remove a logo file', error);
  }

  private async upload(blob: Blob): Promise<string> {
    const userId = this.auth.session()?.user.id;
    const extension = LOGO_STORED_EXTENSIONS.get(blob.type);

    const value = extension
      ? fileLogo(`${crypto.randomUUID()}.${extension}`)
      : null;

    const logo = parseLogo(value);

    if (!userId || !value || logo?.kind !== 'file') {
      throw new Error('logos.errors.upload');
    }

    const { error } = await this.supabase.storage
      .from(LOGO_BUCKET)
      .upload(`${userId}/${logo.fileName}`, blob, {
        cacheControl: '31536000',
        contentType: blob.type,
        upsert: false,
      });

    if (error) {
      logError('LogoService', 'Failed to upload a logo file', error);
      throw new Error('logos.errors.upload');
    }

    return value;
  }
}
