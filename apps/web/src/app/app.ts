import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppUpdateNotification } from './core/app-update-notification';
import { NavbarComponent } from './core/navbar/navbar.component';

@Component({
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, AppUpdateNotification],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
