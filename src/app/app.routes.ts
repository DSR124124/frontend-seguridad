import { Routes } from '@angular/router';
import { layoutRoutes } from './pages/full-pages/layout/layout.routes';

export const routes: Routes = [
  ...layoutRoutes,
  {
    path: 'error',
    loadComponent: () => import('./pages/full-pages/error/components/error/error.component').then(m => m.ErrorComponent)
  },
  {
    path: '**',
    redirectTo: 'error'
  }
];
