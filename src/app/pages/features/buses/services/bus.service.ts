import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Bus, BusRequest } from '../interfaces/bus.interface';
import { environment } from '../../../../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class BusService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.urlServicios}api/admin/buses`;

  /**
   * Obtener todos los buses
   * @param estado Opcional: filtrar por estado
   */
  listarBuses(estado?: string): Observable<Bus[]> {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }
    return this.http.get<Bus[]>(this.apiUrl, { params });
  }

  /**
   * Obtener un bus por ID
   */
  obtenerBusPorId(id: number): Observable<Bus> {
    return this.http.get<Bus>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crear un nuevo bus
   */
  crearBus(bus: BusRequest): Observable<Bus> {
    return this.http.post<Bus>(this.apiUrl, bus);
  }

  /**
   * Actualizar un bus existente
   */
  actualizarBus(id: number, bus: BusRequest): Observable<Bus> {
    return this.http.put<Bus>(`${this.apiUrl}/${id}`, bus);
  }

  /**
   * Eliminar un bus
   */
  eliminarBus(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}

