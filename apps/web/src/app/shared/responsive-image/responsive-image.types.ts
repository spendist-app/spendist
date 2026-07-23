export interface WebImageFallback {
  readonly src: string;
  readonly width: number;
  readonly height: number;
}

export interface WebImage {
  readonly id: string;
  readonly source: string;
  readonly width: number;
  readonly height: number;
  readonly fallback: WebImageFallback;
  readonly avifSrcset: string;
  readonly webpSrcset: string;
}
