import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Ruta, RutaRequest } from '../interfaces/ruta.interface';
import { environment } from '../../../../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class RutaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.urlServicios}api/rutas`;

  /**
   * Obtener todas las rutas
   */
  listarRutas(): Observable<Ruta[]> {
    return this.http.get<Ruta[]>(this.apiUrl);
  }

  /**
   * Obtener una ruta por ID
   */
  obtenerRutaPorId(id: number): Observable<Ruta> {
    return this.http.get<Ruta>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crear una nueva ruta
   */
  crearRuta(ruta: RutaRequest): Observable<Ruta> {
    return this.http.post<Ruta>(this.apiUrl, ruta);
  }

  /**
   * Actualizar una ruta existente
   */
  actualizarRuta(id: number, ruta: RutaRequest): Observable<Ruta> {
    return this.http.put<Ruta>(`${this.apiUrl}/${id}`, ruta);
  }

  /**
   * Eliminar una ruta
   */
  eliminarRuta(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}

