import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';
import { environment } from '../../../../../environment/environment';
import { HttpUtilsService } from '../../../../shared/services/http-utils.service';

export interface Aplicacion {
  idAplicacion: number;
  nombreAplicacion: string;
  codigoProducto: string;
  descripcion?: string;
  activo: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AplicacionService {
  private http = inject(HttpClient);
  private httpUtils = inject(HttpUtilsService);
  private readonly API_URL = `${environment.urlAuth}api/aplicaciones`;

  /**
   * Obtiene todas las aplicaciones
   */
  listar(): Observable<Aplicacion[]> {
    return this.http.get<Aplicacion[]>(this.API_URL).pipe(
      catchError(error => this.httpUtils.handleError(error))
    );
  }

  /**
   * Obtiene una aplicación por su código
   */
  obtenerPorCodigo(codigo: string): Observable<Aplicacion> {
    return this.http.get<Aplicacion>(`${this.API_URL}/por-codigo/${codigo}`).pipe(
      catchError(error => this.httpUtils.handleError(error))
    );
  }
}

