import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SidebarItem } from '../interfaces/sidebar-item.interface';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private itemsSubject = new BehaviorSubject<SidebarItem[]>([]);
  public items$: Observable<SidebarItem[]> = this.itemsSubject.asObservable();

  constructor() {
    this.initializeDefaultItems();
  }

  private initializeDefaultItems(): void {
    const defaultItems: SidebarItem[] = [
      {
        id: 'home',
        label: 'Inicio',
        icon: 'pi pi-home',
        routerLink: ['/home'],
        visible: true,
      },
      {
        id: 'transporte',
        label: 'Transporte',
        icon: 'pi pi-car',
        items: [
          {
            id: 'transporte-rutas',
            label: 'Rutas',
            icon: 'pi pi-map',
            routerLink: ['/transporte/rutas'],
            visible: true,
          },
          {
            id: 'transporte-buses',
            label: 'Buses',
            icon: 'pi pi-truck',
            routerLink: ['/transporte/buses'],
            visible: true,
          },
          {
            id: 'transporte-conductores',
            label: 'Conductores',
            icon: 'pi pi-user',
            routerLink: ['/transporte/conductores'],
            visible: true,
          },
        ],
        visible: true,
      }
    ];

    this.setItems(defaultItems);
  }

  getItems(): SidebarItem[] {
    return this.itemsSubject.value;
  }

  setItems(items: SidebarItem[]): void {
    this.itemsSubject.next(items);
  }

  addItem(item: SidebarItem): void {
    const currentItems = this.itemsSubject.value;
    this.itemsSubject.next([...currentItems, item]);
  }

  updateItem(itemId: string, updates: Partial<SidebarItem>): void {
    const currentItems = this.itemsSubject.value;
    const updatedItems = currentItems.map(item => {
      if (item.id === itemId) {
        return { ...item, ...updates };
      }
      if (item.items) {
        return {
          ...item,
          items: item.items.map(subItem =>
            subItem.id === itemId ? { ...subItem, ...updates } : subItem
          ),
        };
      }
      return item;
    });
    this.itemsSubject.next(updatedItems);
  }

  removeItem(itemId: string): void {
    const currentItems = this.itemsSubject.value;
    const filteredItems = currentItems
      .filter(item => item.id !== itemId)
      .map(item => {
        if (item.items) {
          return {
            ...item,
            items: item.items.filter(subItem => subItem.id !== itemId),
          };
        }
        return item;
      });
    this.itemsSubject.next(filteredItems);
  }
}

