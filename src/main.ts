import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Polyfill para librerías que esperan "global" (entorno Node) en el navegador
(window as any).global = window;

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
