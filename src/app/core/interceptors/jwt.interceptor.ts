import { HttpInterceptorFn } from '@angular/common/http';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  // Excluir el endpoint de login del interceptor
  if (req.url.includes('/api/auth/login')) {
    req = req.clone({
      withCredentials: true
    });
    return next(req);
  }

  // Obtener token del localStorage (compatible con integración desde frontend-gestion)
  const token = localStorage.getItem('auth_token');

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      },
      withCredentials: true
    });
  } else {
    req = req.clone({
      withCredentials: true
    });
  }

  return next(req);
};

