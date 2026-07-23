import { TestBed } from '@angular/core/testing';
import { ResponsiveImage } from './responsive-image';
import type { WebImage } from './responsive-image.types';

describe('ResponsiveImage', () => {
  const image: WebImage = {
    id: 'site/landing/example',
    source: 'apps/web/image-sources/site/landing/example.jpg',
    width: 1200,
    height: 630,
    fallback: {
      src: '/media/site/landing/example/example-fallback.jpg',
      width: 1200,
      height: 630,
    },
    avifSrcset: '/example-480.avif 480w, /example-1200.avif 1200w',
    webpSrcset: '/example-480.webp 480w, /example-1200.webp 1200w',
  };

  it('renders responsive formats and prioritizes an LCP image', async () => {
    await TestBed.configureTestingModule({
      imports: [ResponsiveImage],
    }).compileComponents();
    const fixture = TestBed.createComponent(ResponsiveImage);
    fixture.componentRef.setInput('image', image);
    fixture.componentRef.setInput('alt', 'Example');
    fixture.componentRef.setInput('sizes', '50vw');
    fixture.componentRef.setInput('priority', true);
    fixture.detectChanges();

    const sources = fixture.nativeElement.querySelectorAll('source');
    const img = fixture.nativeElement.querySelector('img');
    expect(sources[0].getAttribute('srcset')).toContain('480.avif 480w');
    expect(sources[0].getAttribute('sizes')).toBe('50vw');
    expect(img.getAttribute('width')).toBe('1200');
    expect(img.getAttribute('height')).toBe('630');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('fetchpriority')).toBe('high');
  });
});
