import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppUpdateNotification } from './core/app-update-notification';
import { GlobalNotice } from './core/global-notice';
import { NavbarComponent } from './core/navbar/navbar.component';

@Component({
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, AppUpdateNotification, GlobalNotice],
  selector: 'app-root',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.css',
})
export class App {}
