import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthUserService {

  /**
   * Obtiene el ID del usuario desde el token JWT almacenado
   */
  obtenerIdUsuario(): number | null {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        return null;
      }

      // Decodificar el token JWT (solo la parte del payload)
      const payload = JSON.parse(atob(token.split('.')[1]));

      // El ID del usuario puede estar en diferentes campos según el backend
      return payload.idUsuario || payload.userId || payload.sub || payload.id || null;
    } catch (error) {
      console.error('Error al obtener ID de usuario:', error);
      return null;
    }
  }

  /**
   * Obtiene el nombre de usuario desde el token
   */
  obtenerUsername(): string | null {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        return null;
      }

      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.username || payload.user || payload.sub || null;
    } catch (error) {
      console.error('Error al obtener username:', error);
      return null;
    }
  }
}

