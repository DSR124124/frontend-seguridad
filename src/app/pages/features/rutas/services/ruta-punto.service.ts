import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environment/environment';

export interface RutaPunto {
  idPunto?: number;
  idRuta: number;
  orden: number;
  latitud: number;
  longitud: number;
  nombreParadero?: string;
  esParaderoOficial?: boolean;
}

export interface RutaPuntoRequest {
  idRuta: number;
  orden: number;
  latitud: number;
  longitud: number;
  nombreParadero?: string;
  esParaderoOficial?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RutaPuntoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.urlServicios}api/admin/ruta-puntos`;

  /**
   * Obtener todos los puntos de una ruta
   */
  listarPuntosPorRuta(idRuta: number): Observable<RutaPunto[]> {
    return this.http.get<RutaPunto[]>(`${this.apiUrl}/ruta/${idRuta}`);
  }

  /**
   * Obtener un punto por ID
   */
  obtenerPuntoPorId(id: number): Observable<RutaPunto> {
    return this.http.get<RutaPunto>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crear un nuevo punto de ruta
   */
  crearPunto(punto: RutaPuntoRequest): Observable<RutaPunto> {
    return this.http.post<RutaPunto>(this.apiUrl, punto);
  }

  /**
   * Actualizar un punto existente
   */
  actualizarPunto(id: number, punto: RutaPuntoRequest): Observable<RutaPunto> {
    return this.http.put<RutaPunto>(`${this.apiUrl}/${id}`, punto);
  }

  /**
   * Eliminar un punto
   */
  eliminarPunto(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}

