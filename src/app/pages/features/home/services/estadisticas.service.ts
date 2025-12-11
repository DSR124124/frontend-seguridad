import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EstadisticasRegistros } from '../interfaces/estadisticas-registros.interface';
import { environment } from '../../../../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class EstadisticasService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.urlServicios}api/registro-ruta/admin/estadisticas`;

  obtenerEstadisticas(): Observable<EstadisticasRegistros> {
    return this.http.get<EstadisticasRegistros>(this.apiUrl);
  }
}

