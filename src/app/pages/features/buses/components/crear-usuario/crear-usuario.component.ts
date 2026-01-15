import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UsuarioService } from '../../services/usuario.service';
import { RolService } from '../../../roles/services/rol.service';
import { MessageService } from 'primeng/api';
import { LoadingService } from '../../../../../shared/services/loading.service';
import { PrimeNGModules } from '../../../../../prime-ng/prime-ng';
import { Usuario, UsuarioDTO } from '../../interfaces/usuario.interface';
import { Rol } from '../../../roles/interfaces/rol.interface';
import { AuthService } from '../../../../full-pages/auth/services/auth.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-crear-usuario',
  standalone: true,
  imports: [
    ...PrimeNGModules,
    ReactiveFormsModule
  ],
  templateUrl: './crear-usuario.component.html',
  styleUrl: './crear-usuario.component.css',
  providers: [MessageService]
})
export class CrearUsuarioComponent implements OnInit, OnDestroy {
  @Output() usuarioCreado = new EventEmitter<void>();
  @Output() usuarioActualizado = new EventEmitter<void>();

  usuarioForm!: FormGroup;
  roles: Rol[] = [];
  visible: boolean = false;
  submitted: boolean = false;
  modoEdicion: boolean = false;
  usuarioId: number | null = null;
  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private usuarioService: UsuarioService,
    private rolService: RolService,
    private messageService: MessageService,
    private loadingService: LoadingService,
    private authService: AuthService,
    private router: Router
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.cargarRoles();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  initForm(): void {
    this.usuarioForm = this.fb.group({
      username: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      password: ['', [Validators.minLength(6)]],
      nombreCompleto: ['', [Validators.maxLength(255)]],
      idRol: [null, [Validators.required]],
      activo: [true]
    });
  }

  updatePasswordValidators(isEditMode: boolean): void {
    const passwordControl = this.usuarioForm.get('password');
    if (isEditMode) {
      // En modo edición, la contraseña es opcional
      passwordControl?.clearValidators();
      passwordControl?.setValidators([Validators.minLength(6)]);
    } else {
      // En modo creación, la contraseña es requerida
      passwordControl?.setValidators([Validators.required, Validators.minLength(6)]);
    }
    passwordControl?.updateValueAndValidity();
  }

  cargarRoles(): void {
    this.loadingService.show();
    const sub = this.rolService.listar().subscribe({
      next: (roles) => {
        this.roles = roles.filter(rol => rol.activo);
        this.loadingService.hide();
      },
      error: (error) => {
        this.loadingService.hide();
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error?.message || 'Error al cargar los roles',
          life: 5000
        });
      }
    });
    this.subscriptions.push(sub);
  }

  showDialog(usuario?: Usuario): void {
    this.modoEdicion = !!usuario;
    this.usuarioId = usuario?.idUsuario || null;
    this.visible = true;
    this.submitted = false;
    
    this.updatePasswordValidators(this.modoEdicion);
    
    if (usuario) {
      // Cargar datos del usuario para editar
      this.usuarioForm.patchValue({
        username: usuario.username,
        email: usuario.email,
        password: '', // No cargar contraseña
        nombreCompleto: usuario.nombreCompleto || '',
        idRol: usuario.idRol,
        activo: usuario.activo
      });
    } else {
      // Resetear formulario para crear
      this.usuarioForm.reset({
        activo: true
      });
    }
  }

  hideDialog(): void {
    this.visible = false;
    this.submitted = false;
    this.modoEdicion = false;
    this.usuarioId = null;
    this.usuarioForm.reset({
      activo: true
    });
    this.updatePasswordValidators(false);
  }

  guardar(): void {
    this.submitted = true;

    if (this.usuarioForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validación',
        detail: 'Por favor, complete todos los campos requeridos correctamente',
        life: 5000
      });
      return;
    }

    const usuarioDTO: UsuarioDTO = {
      username: this.usuarioForm.value.username,
      email: this.usuarioForm.value.email,
      nombreCompleto: this.usuarioForm.value.nombreCompleto || undefined,
      idRol: this.usuarioForm.value.idRol,
      activo: this.usuarioForm.value.activo ?? true
    };

    // Solo incluir password si se proporcionó (modo edición) o si es creación
    if (!this.modoEdicion || this.usuarioForm.value.password) {
      usuarioDTO.password = this.usuarioForm.value.password;
    }

    // Verificar que el token existe antes de hacer la petición
    const token = this.authService.getToken();
    if (!token || token.trim() === '') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sesión Expirada',
        detail: 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.',
        life: 5000
      });
      this.authService.logout();
      return;
    }
    
    this.loadingService.show();
    
    if (this.modoEdicion && this.usuarioId) {
      // Actualizar usuario existente
      const sub = this.usuarioService.actualizar(this.usuarioId, usuarioDTO).subscribe({
        next: () => {
          this.loadingService.hide();
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Usuario actualizado correctamente',
            life: 5000
          });
          this.hideDialog();
          this.usuarioActualizado.emit();
        },
        error: (error) => {
          this.loadingService.hide();
          
          // Manejo específico para errores 403 (Forbidden)
          if (error?.status === 403) {
            const errorMessage = error?.error?.mensaje || error?.error?.message || 
              'Acceso denegado. Su sesión puede haber expirado. Por favor, inicie sesión nuevamente.';
            this.messageService.add({
              severity: 'error',
              summary: 'Acceso Denegado (403)',
              detail: errorMessage,
              life: 7000
            });
          } else {
            const errorMessage = error?.error?.mensaje || error?.error?.message || 
              error?.message || 'Error al actualizar el usuario';
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: errorMessage,
              life: 5000
            });
          }
        }
      });
      this.subscriptions.push(sub);
    } else {
      // Crear nuevo usuario
      const sub = this.usuarioService.crear(usuarioDTO).subscribe({
        next: () => {
          this.loadingService.hide();
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Usuario creado correctamente',
            life: 5000
          });
          this.hideDialog();
          this.usuarioCreado.emit();
        },
        error: (error) => {
          this.loadingService.hide();
          const errorMessage = error?.message || error?.error?.message || 'Error al crear el usuario';
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
    return this.usuarioForm.controls;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.usuarioForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }
}

