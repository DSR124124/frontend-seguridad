// theme.service.ts
import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { updatePrimaryPalette, palette } from '@primeng/themes';
import { $dt } from '@primeng/themes';
import { ThemeColors, ThemeDefinition } from '../interfaces/theme.constants';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private renderer: Renderer2;
  private themeSubject = new BehaviorSubject<string>(this.getStoredClass());
  public theme$ = this.themeSubject.asObservable();

  private storageKey = 'custom-primary';
  private classKey = 'theme-class';

  private themes: Record<string, ThemeColors> = {
    'my-app-light': {
      colorPrimario: '#1C224D',
      textoPrimario: '#FFFFFF',
      headerColor: '#1C224D',
      textoHeader: '#FFFFFF',
      footerColor: '#151515',
      textoFooter: '#FFFFFF',
      sidebarColor: '#F5F8FC',
      textoSidebar: '#FFFFFF',
      mainContentColor: '#FFFFFF',
      textoContent: '#000000'

    },
    'my-app-dark': {
      colorPrimario: '#4A7AFF',
      textoPrimario: '#FFFFFF',
      headerColor: '#4A7AFF',
      textoHeader: '#FFFFFF',
      footerColor: '#151515',
      textoFooter: '#FFFFFF',
      sidebarColor: '#1C1C1C',
      textoSidebar: '#FFFFFF',
      mainContentColor: '#222222',
      textoContent: '#FFFFFF'
    },
    'my-app-mint': {
      colorPrimario: '#176973',
      textoPrimario: '#FFFFFF',
      headerColor: '#176973',
      textoHeader: '#FFFFFF',
      footerColor: '#151515',
      textoFooter: '#FFFFFF',
      sidebarColor: '#DFF4F2',
      textoSidebar: '#000000',
      mainContentColor: '#FFFFFF',
      textoContent: '#000000'
    }
  };

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.initThemeClass();
    this.initPrimaryColor();
    this.applyThemeColors(this.getStoredClass());
  }

  // 👇 Manejo de la clase CSS (my-app-light, dark, etc.)
  getStoredClass(): string {
    return localStorage.getItem(this.classKey) ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'my-app-dark' : 'my-app-light');
  }

  setThemeClass(className: string): void {
    localStorage.setItem(this.classKey, className);
    this.themeSubject.next(className);
    this.applyClass(className);
    this.applyThemeColors(className);
  }

  private applyClass(className: string): void {
    const html = document.documentElement;
    html.classList.remove('my-app-light', 'my-app-dark', 'my-app-mint');
    html.classList.add(className);
  }

  private initThemeClass() {
    this.applyClass(this.getStoredClass());
  }

  // 👇 Manejo del color primario dinámico (con ColorPicker)
  initPrimaryColor() {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      this.setPrimaryColor(stored);
    }
  }

  setPrimaryColor(hex: string) {
    updatePrimaryPalette(palette(hex));
    localStorage.setItem(this.storageKey, hex);
  }

  getDefaultPrimaryColor(): string {
    const color = $dt('primary.color')?.value?.light?.value;
    return typeof color === 'string' ? color : '#1C224D'; // fallback manual
  }

  setPrimaryTextColor(hex: string) {
    document.documentElement.style.setProperty('--primary-content-color', hex);
    localStorage.setItem('custom-primary-text', hex);
  }

  initPrimaryTextColor() {
    const hex = localStorage.getItem('custom-primary-text');
    if (hex) {
      this.setPrimaryTextColor(hex);
    }
  }


  getThemeColors(className: string): any {
    return this.themes[className] || this.themes['my-app-light'];  // Si no se encuentra, devuelve el tema claro
  }

  // Actualiza las variables CSS globales
  applyThemeColors(className: string) {
    const theme = this.getThemeColors(className);

    // Actualiza las variables CSS con los colores del tema
    document.documentElement.style.setProperty('--p-primary-color', theme.colorPrimario);
    document.documentElement.style.setProperty('--layout-header-bg', theme.headerColor);
    document.documentElement.style.setProperty('--layout-sidebar-bg', theme.sidebarColor);
    document.documentElement.style.setProperty('--layout-footer-bg', theme.footerColor);
    document.documentElement.style.setProperty('--layout-main-bg', theme.mainContentColor);

    // Colores de texto
    document.documentElement.style.setProperty('--primary-content-color', theme.textoPrimario);
    document.documentElement.style.setProperty('--texto-content-color', theme.textoContent);
    document.documentElement.style.setProperty('--texto-header-color', theme.textoHeader);
    document.documentElement.style.setProperty('--texto-footer-color', theme.textoFooter);
    document.documentElement.style.setProperty('--texto-sidebar-color', theme.textoSidebar);
  }


  // Guardar un tema personalizado
  saveCustomTheme(customTheme: ThemeDefinition, colors: ThemeColors) {
    this.themes[customTheme.className] = colors;
    localStorage.setItem('custom-theme', JSON.stringify(this.themes));  // Guardar en el localStorage
  }

  getCustomTheme() {
    const customTheme = localStorage.getItem('custom-theme');
    console.log(customTheme)
    return customTheme ? JSON.parse(customTheme) : this.themes;
  }


}
