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
        if (this.depth === 0) {
          this.expandChange.emit({ index: this.index, depth: this.depth, expanded: false });
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
      const newExpandedState = !this.expanded;
      this.expandChange.emit({ index: this.index, depth: this.depth, expanded: newExpandedState });
    } else if (this.item.routerLink) {
      this.router.navigate(Array.isArray(this.item.routerLink) ? this.item.routerLink : [this.item.routerLink]);
      this.onLinkClick();
    } else if (this.item.command) {
      this.executeCommand();
    }
  }

  isExpanded(): boolean {
    return this.expanded;
  }

  executeCommand() {
    if (this.item.command) {
      this.item.command();
      this.onLinkClick();
    }
  }

  isActive(): boolean {
    if (!this.item.routerLink) return false;

    const currentUrl = this.router.url;
    const itemRoute = Array.isArray(this.item.routerLink)
      ? this.item.routerLink.join('/')
      : this.item.routerLink;

    const normalizedCurrent = currentUrl.replace(/^\/+/, '');
    const normalizedRoute = itemRoute.replace(/^\/+/, '');

    return normalizedCurrent === normalizedRoute || normalizedCurrent.startsWith(normalizedRoute + '/');
  }

  onLinkClick() {
    if (window.innerWidth <= 768) {
      this.itemClick.emit();
    }
  }

  getTooltipText(): string {
    if (this.sidebarCollapsed && this.item.label) {
      return this.item.label;
    }
    return '';
  }

  handleExpandChange(event: { index: number, depth: number, expanded: boolean }) {
    this.expandChange.emit(event);
  }

  trackBySubItem(index: number, subItem: SidebarItem): any {
    return subItem.id || index;
  }
}

