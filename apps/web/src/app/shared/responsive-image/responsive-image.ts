import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { WebImage } from './responsive-image.types';

@Component({
  selector: 'app-responsive-image',
  templateUrl: './responsive-image.html',
  styleUrl: './responsive-image.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResponsiveImage {
  readonly image = input.required<WebImage>();
  readonly alt = input.required<string>();
  readonly sizes = input('100vw');
  readonly priority = input(false);
}
