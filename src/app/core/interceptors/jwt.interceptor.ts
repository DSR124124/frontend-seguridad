import { HttpInterceptorFn } from '@angular/common/http';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  // Excluir el endpoint de login del interceptor
  if (req.url.includes('/api/auth/login')) {
    req = req.clone({
      withCredentials: true
    });
    return next(req);
  }

  // Obtener token del localStorage
  const token = localStorage.getItem('auth_token');

  if (token && token.trim() !== '') {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token.trim()}`
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

