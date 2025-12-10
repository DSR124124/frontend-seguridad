import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { LayoutConfig } from '../interfaces/layout-config.interface';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private configSubject = new BehaviorSubject<LayoutConfig>({
    sidebarVisible: true,
    sidebarCollapsed: false,
    headerVisible: true,
    footerVisible: true,
    breadcrumbVisible: true,
  });

  public config$: Observable<LayoutConfig> = this.configSubject.asObservable();

  getConfig(): LayoutConfig {
    return this.configSubject.value;
  }

  updateConfig(config: Partial<LayoutConfig>): void {
    const currentConfig = this.configSubject.value;
    this.configSubject.next({ ...currentConfig, ...config });
  }

  toggleSidebar(): void {
    const currentConfig = this.configSubject.value;
    this.updateConfig({ sidebarVisible: !currentConfig.sidebarVisible });
  }

  toggleSidebarCollapse(): void {
    const currentConfig = this.configSubject.value;
    this.updateConfig({ sidebarCollapsed: !currentConfig.sidebarCollapsed });
  }

  showSidebar(): void {
    this.updateConfig({ sidebarVisible: true });
  }

  hideSidebar(): void {
    this.updateConfig({ sidebarVisible: false });
  }
}

