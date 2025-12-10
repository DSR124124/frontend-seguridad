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
        id: 'buses',
        label: 'Buses',
        icon: 'pi pi-car',
        items: [
          {
            id: 'lista-buses',
            label: 'Lista de Buses',
            icon: 'pi pi-list',
            routerLink: ['/buses/lista-buses'],
            visible: true,
          },
          {
            id: 'lista-conductores',
            label: 'Lista de Conductores',
            icon: 'pi pi-list',
            routerLink: ['/buses/lista-conductores'],
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

