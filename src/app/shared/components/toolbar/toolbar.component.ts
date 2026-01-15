import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PrimeNGModules } from '../../../prime-ng/prime-ng';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.css',
  imports: [
    ...PrimeNGModules,
    ReactiveFormsModule,
    CommonModule
  ],
})
export class ToolbarComponent {
  @Input() searchPlaceholder: string = 'Buscar...';
  @Input() filtrosVisibles: boolean = false;
  @Input() canWrite: boolean = false;
  @Input() canRead: boolean = false;
  @Input() showAddButton: boolean = true;
  @Input() showExportButton: boolean = true;
  @Input() addButtonLabel: string = 'Agregar';
  @Input() exportButtonLabel: string = 'Exportar';

  @Output() search = new EventEmitter<Event>();
  @Output() toggleFiltros = new EventEmitter<void>();
  @Output() clearFilters = new EventEmitter<void>();
  @Output() add = new EventEmitter<void>();
  @Output() export = new EventEmitter<void>();

  onSearch(event: Event): void {
    this.search.emit(event);
  }

  onToggleFiltros(): void {
    this.toggleFiltros.emit();
  }

  onClearFilters(): void {
    this.clearFilters.emit();
  }

  onAdd(): void {
    this.add.emit();
  }

  onExport(): void {
    this.export.emit();
  }
}
