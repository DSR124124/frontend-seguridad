import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environment/environment';

export interface UsuarioGestion {
  idUsuario: number;
  username: string;
  email: string;
  nombreCompleto?: string;
  idRol: number;
  nombreRol: string;
  activo: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UsuarioGestionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.urlAuth}api/usuarios`;

  /**
   * Obtener usuarios por nombre de rol (ej: "Conductor")
   */
  obtenerUsuariosPorRol(nombreRol: string): Observable<UsuarioGestion[]> {
    const params = new HttpParams().set('nombreRol', nombreRol);
    return this.http.get<UsuarioGestion[]>(`${this.apiUrl}/por-nombre-rol`, { params });
  }
}

