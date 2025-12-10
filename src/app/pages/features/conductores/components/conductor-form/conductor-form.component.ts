import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ConductorRequest, Conductor } from '../../interfaces/conductor.interface';
import { ConductorService } from '../../services/conductor.service';
import { UsuarioGestionService, UsuarioGestion } from '../../services/usuario-gestion.service';
import { MessageService } from 'primeng/api';
import { LoadingService } from '../../../../../shared/services/loading.service';
import { PrimeNGModules } from '../../../../../prime-ng/prime-ng';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-conductor-form',
  standalone: true,
  imports: [
    ...PrimeNGModules,
    ReactiveFormsModule
  ],
  providers: [MessageService],
  templateUrl: './conductor-form.component.html',
  styleUrl: './conductor-form.component.css'
})
export class ConductorFormComponent implements OnInit, OnDestroy {
  @Output() conductorCreado = new EventEmitter<void>();
  @Output() conductorActualizado = new EventEmitter<void>();

  conductorForm!: FormGroup;
  visible: boolean = false;
  submitted: boolean = false;
  modoEdicion: boolean = false;
  conductorId: number | null = null;
  usuariosDisponibles: UsuarioGestion[] = [];
  private subscriptions: Subscription[] = [];

  estados = [
    { label: 'Activo', value: 'activo' },
    { label: 'Inactivo', value: 'inactivo' },
    { label: 'Suspendido', value: 'suspendido' }
  ];

  categorias = [
    { label: 'A', value: 'A' },
    { label: 'B', value: 'B' },
    { label: 'C', value: 'C' },
    { label: 'D', value: 'D' }
  ];

  constructor(
    private fb: FormBuilder,
    private conductorService: ConductorService,
    private usuarioGestionService: UsuarioGestionService,
    private messageService: MessageService,
    private loadingService: LoadingService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.cargarUsuariosConductores();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  initForm(): void {
    this.conductorForm = this.fb.group({
      idUsuarioGestion: [null, [Validators.required]],
      licenciaNumero: ['', [Validators.required, Validators.maxLength(20)]],
      categoria: ['', [Validators.maxLength(10)]],
      telefonoContacto: ['', [Validators.maxLength(20)]],
      estado: ['activo', [Validators.maxLength(20)]]
    });
  }

  cargarUsuariosConductores(): void {
    this.loadingService.show();
    const sub = this.usuarioGestionService.obtenerUsuariosPorRol('Conductor').subscribe({
      next: (usuarios) => {
        this.usuariosDisponibles = usuarios || [];
        this.loadingService.hide();
        if (!usuarios || usuarios.length === 0) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Sin usuarios disponibles',
            detail: 'No se encontraron usuarios con rol "Conductor" activos. Verifique que existan usuarios con este rol en el sistema de gestión.',
            life: 6000
          });
        }
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error?.error?.mensaje || error?.error?.message || error?.message || 'Error desconocido';
        const statusCode = error?.status || '';
        const url = error?.url || '';
        
        let detailMessage = `No se pudieron cargar los usuarios conductores.`;
        if (statusCode === 403) {
          detailMessage += ' Acceso denegado. Verifique su sesión.';
        } else if (statusCode === 404) {
          detailMessage += ' El endpoint no fue encontrado.';
        } else if (statusCode === 401) {
          detailMessage += ' No autorizado. Por favor, inicie sesión nuevamente.';
        } else {
          detailMessage += ` ${errorMessage}`;
        }
        
        this.messageService.add({
          severity: 'error',
          summary: `Error ${statusCode ? `(${statusCode})` : ''} al cargar usuarios`,
          detail: detailMessage,
          life: 8000
        });
      }
    });
    this.subscriptions.push(sub);
  }

  showDialog(conductor?: Conductor): void {
    this.modoEdicion = !!conductor;
    this.conductorId = conductor?.idUsuarioGestion || null;
    this.visible = true;
    this.submitted = false;

    if (conductor) {
      // Cargar datos del conductor para editar
      this.conductorForm.patchValue({
        idUsuarioGestion: conductor.idUsuarioGestion,
        licenciaNumero: conductor.licenciaNumero,
        categoria: conductor.categoria || '',
        telefonoContacto: conductor.telefonoContacto || '',
        estado: conductor.estado
      });
      
      // Deshabilitar el campo de usuario en modo edición
      this.conductorForm.get('idUsuarioGestion')?.disable();
    } else {
      // Resetear formulario para crear
      this.conductorForm.reset({
        estado: 'activo'
      });
      this.conductorForm.get('idUsuarioGestion')?.enable();
    }
  }

  hideDialog(): void {
    this.visible = false;
    this.submitted = false;
    this.modoEdicion = false;
    this.conductorId = null;
    this.conductorForm.reset({
      estado: 'activo'
    });
    this.conductorForm.get('idUsuarioGestion')?.enable();
  }

  guardar(): void {
    this.submitted = true;

    if (this.conductorForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validación',
        detail: 'Por favor, complete todos los campos requeridos correctamente',
        life: 5000
      });
      return;
    }

    const conductorData: ConductorRequest = {
      idUsuarioGestion: this.conductorForm.value.idUsuarioGestion,
      licenciaNumero: this.conductorForm.value.licenciaNumero,
      categoria: this.conductorForm.value.categoria || undefined,
      telefonoContacto: this.conductorForm.value.telefonoContacto || undefined,
      estado: this.conductorForm.value.estado
    };

    this.loadingService.show();

    if (this.modoEdicion && this.conductorId) {
      // Actualizar conductor existente
      const sub = this.conductorService.actualizarConductor(this.conductorId, conductorData).subscribe({
        next: () => {
          this.loadingService.hide();
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Conductor actualizado correctamente',
            life: 5000
          });
          this.hideDialog();
          this.conductorActualizado.emit();
        },
        error: (error) => {
          this.loadingService.hide();
          const errorMessage = error?.message || error?.error?.message || 'Error al actualizar el conductor';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage,
            life: 5000
          });
        }
      });
      this.subscriptions.push(sub);
    } else {
      // Crear nuevo conductor
      const sub = this.conductorService.crearConductor(conductorData).subscribe({
        next: () => {
          this.loadingService.hide();
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Conductor creado correctamente',
            life: 5000
          });
          this.hideDialog();
          this.conductorCreado.emit();
        },
        error: (error) => {
          this.loadingService.hide();
          const errorMessage = error?.message || error?.error?.message || 'Error al crear el conductor';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage,
            life: 5000
          });
        }
      });
      this.subscriptions.push(sub);
    }
  }

  get f() {
    return this.conductorForm.controls;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.conductorForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  getUsuarioLabel(usuario: UsuarioGestion): string {
    return usuario.nombreCompleto || usuario.username || usuario.email || '';
  }
}

