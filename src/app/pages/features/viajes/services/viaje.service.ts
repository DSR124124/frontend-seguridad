import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Viaje, ViajeRequest } from '../interfaces/viaje.interface';
import { ViajeActivoConUbicacion } from '../interfaces/viaje-activo-ubicacion.interface';
import { environment } from '../../../../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class ViajeService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.urlServicios}api/admin/viajes`;

  /**
   * Obtener todos los viajes
   * @param estado Opcional: filtrar por estado
   * @param idRuta Opcional: filtrar por ruta
   */
  listarViajes(estado?: string, idRuta?: number): Observable<Viaje[]> {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }
    if (idRuta) {
      params = params.set('idRuta', idRuta.toString());
    }
    return this.http.get<Viaje[]>(this.apiUrl, { params });
  }

  /**
   * Obtener un viaje por ID
   */
  obtenerViajePorId(id: number): Observable<Viaje> {
    return this.http.get<Viaje>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crear un nuevo viaje
   */
  crearViaje(viaje: ViajeRequest): Observable<Viaje> {
    return this.http.post<Viaje>(this.apiUrl, viaje);
  }

  /**
   * Actualizar un viaje existente
   */
  actualizarViaje(id: number, viaje: ViajeRequest): Observable<Viaje> {
    return this.http.put<Viaje>(`${this.apiUrl}/${id}`, viaje);
  }

  /**
   * Eliminar un viaje
   */
  eliminarViaje(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  /**
   * Obtener todos los viajes activos con sus ubicaciones en tiempo real
   */
  obtenerViajesActivosConUbicacion(): Observable<ViajeActivoConUbicacion[]> {
    return this.http.get<ViajeActivoConUbicacion[]>(`${environment.urlServicios}api/trips/activos/ubicaciones`);
  }
}

