import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Conductor, ConductorRequest } from '../interfaces/conductor.interface';
import { UsuarioGestion } from './usuario-gestion.service';
import { environment } from '../../../../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class ConductorService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.urlServicios}api/admin/conductores`;

  /**
   * Obtener todos los conductores
   * @param estado Opcional: filtrar por estado
   */
  listarConductores(estado?: string): Observable<Conductor[]> {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }
    return this.http.get<Conductor[]>(this.apiUrl, { params });
  }

  /**
   * Obtener un conductor por ID
   */
  obtenerConductorPorId(id: number): Observable<Conductor> {
    return this.http.get<Conductor>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crear un nuevo conductor
   */
  crearConductor(conductor: ConductorRequest): Observable<Conductor> {
    return this.http.post<Conductor>(this.apiUrl, conductor);
  }

  /**
   * Actualizar un conductor existente
   */
  actualizarConductor(id: number, conductor: ConductorRequest): Observable<Conductor> {
    return this.http.put<Conductor>(`${this.apiUrl}/${id}`, conductor);
  }

  /**
   * Eliminar un conductor
   */
  eliminarConductor(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  /**
   * Obtener usuarios conductores disponibles (no registrados aún)
   */
  obtenerUsuariosConductoresDisponibles(): Observable<UsuarioGestion[]> {
    return this.http.get<UsuarioGestion[]>(`${this.apiUrl}/usuarios-disponibles`);
  }
}

