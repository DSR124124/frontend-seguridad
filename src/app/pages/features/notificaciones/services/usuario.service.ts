import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';
import { environment } from '../../../../../environment/environment';
import { HttpUtilsService } from '../../../../shared/services/http-utils.service';

export interface Usuario {
  idUsuario: number;
  username: string;
  email: string;
  nombreCompleto?: string;
  activo: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private http = inject(HttpClient);
  private httpUtils = inject(HttpUtilsService);
  private readonly API_URL = `${environment.urlAuth}api/usuarios`;

  /**
   * Obtiene todos los usuarios activos
   */
  listar(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.API_URL).pipe(
      catchError(error => this.httpUtils.handleError(error))
    );
  }

  /**
   * Obtiene un usuario por ID
   */
  obtenerPorId(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.API_URL}/${id}`).pipe(
      catchError(error => this.httpUtils.handleError(error))
    );
  }
}

