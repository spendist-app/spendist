import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@ngneat/transloco';
import { AuthService } from '../../core/auth.service';

@Component({
  standalone: true,
  selector: 'app-landing-page',
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './landing.page.html',
  styleUrl: './landing.page.css',
})
export class LandingPageComponent {
  readonly auth = inject(AuthService);
}
