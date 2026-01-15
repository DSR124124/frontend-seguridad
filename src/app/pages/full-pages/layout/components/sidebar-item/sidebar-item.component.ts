import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { SidebarItem } from '../../interfaces/sidebar-item.interface';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar-item',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './sidebar-item.component.html',
  styleUrl: './sidebar-item.component.css'
})
export class SidebarItemComponent implements OnInit, OnDestroy {
  @Input() item!: SidebarItem;
  @Input() depth: number = 0;
  @Input() index: number = 0;
  @Input() expanded: boolean = false;
  @Input() currentExpandedItemIndex: number[] = [];
  @Input() sidebarCollapsed: boolean = false;
  @Output() itemClick = new EventEmitter<void>();
  @Output() expandChange = new EventEmitter<{ index: number, depth: number, expanded: boolean }>();

  private routerSubscription?: Subscription;

  constructor(private router: Router) {}

  ngOnInit() {
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.item.items && this.item.items.length > 0 && this.hasActiveChild()) {
          this.expandChange.emit({ index: this.index, depth: this.depth, expanded: true });
        }
      });
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  toggleExpansion(index: number, event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.item.items && this.item.items.length > 0) {
      this.expandChange.emit({ index: this.index, depth: this.depth, expanded: !this.expanded });
    } else if (this.item.routerLink) {
      this.router.navigate(Array.isArray(this.item.routerLink) ? this.item.routerLink : [this.item.routerLink]);
      this.onLinkClick();
    } else if (this.item.command) {
      this.item.command();
      this.onLinkClick();
    }
  }

  isActive(): boolean {
    if (!this.item.routerLink) return false;

    const currentUrl = this.router.url.replace(/^\/+/, '').replace(/\/+$/, '');
    const itemRoute = (Array.isArray(this.item.routerLink)
      ? this.item.routerLink.join('/')
      : this.item.routerLink).replace(/^\/+/, '').replace(/\/+$/, '');

    if (currentUrl === itemRoute || currentUrl.startsWith(itemRoute + '/')) {
      return true;
    }

    return !!(this.item.items && this.item.items.length > 0 && this.hasActiveChild());
  }

  hasActiveChild(): boolean {
    if (!this.item.items?.length) return false;

    const currentUrl = this.router.url.replace(/^\/+/, '').replace(/\/+$/, '');

    return this.item.items.some(subItem => {
      if (subItem.routerLink) {
        const subRoute = (Array.isArray(subItem.routerLink)
          ? subItem.routerLink.join('/')
          : subItem.routerLink).replace(/^\/+/, '').replace(/\/+$/, '');

        if (currentUrl === subRoute || currentUrl.startsWith(subRoute + '/')) {
          return true;
        }
      }

      return !!(subItem.items && subItem.items.length > 0 && subItem.items.some(grandChild => {
        if (!grandChild.routerLink) return false;
        const grandRoute = (Array.isArray(grandChild.routerLink)
          ? grandChild.routerLink.join('/')
          : grandChild.routerLink).replace(/^\/+/, '').replace(/\/+$/, '');
        return currentUrl === grandRoute || currentUrl.startsWith(grandRoute + '/');
      }));
    });
  }

  onLinkClick() {
    // Cerrar sidebar en móvil al hacer clic
    if (window.innerWidth <= 768) {
      this.itemClick.emit();
    }
  }

  getTooltipText(): string {
    return this.sidebarCollapsed && this.item.label ? this.item.label : '';
  }


  trackBySubItem(index: number, subItem: SidebarItem): any {
    return subItem.id || index;
  }
}

