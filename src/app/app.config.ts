import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';

import { routes } from './app.routes';
import { NettalcoPreset } from '../theme/nettalco-preset';



export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([
        jwtInterceptor
      ])
    ),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: NettalcoPreset,
        options: {
          darkModeSelector: '.app-dark', // Selector para modo oscuro
          prefix: 'p' // Prefijo de variables CSS (por defecto 'p')
        }
      }
    }),
    MessageService,
    ConfirmationService
  ]
};
