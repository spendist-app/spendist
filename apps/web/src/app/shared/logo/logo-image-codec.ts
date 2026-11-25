import { DOCUMENT, Injectable, inject } from '@angular/core';
import { LOGO_MAX_EDGE, fitWithin } from './logo';

/**
 * Turns a picked image into a small logo file in the browser: decodes it,
 * scales it down to LOGO_MAX_EDGE and encodes WebP, or PNG where the browser
 * cannot encode WebP. Re-encoding also drops embedded metadata.
 *
 * Runs only from user actions, never during server rendering. Tests replace
 * it, because jsdom has neither canvas nor createImageBitmap.
 */
@Injectable({ providedIn: 'root' })
export class LogoImageCodec {
  private readonly document = inject(DOCUMENT);

  async normalise(source: Blob): Promise<Blob> {
    const bitmap = await createImageBitmap(source).catch(() => {
      throw new Error('logos.errors.decode');
    });

    try {
      const size = fitWithin(bitmap.width, bitmap.height, LOGO_MAX_EDGE);
      const canvas = this.document.createElement('canvas');
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('logos.errors.decode');
      }

      context.imageSmoothingQuality = 'high';
      context.drawImage(bitmap, 0, 0, size.width, size.height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/webp', 0.9);
      });

      if (!blob) {
        throw new Error('logos.errors.decode');
      }

      return blob;
    } finally {
      bitmap.close();
    }
  }
}
