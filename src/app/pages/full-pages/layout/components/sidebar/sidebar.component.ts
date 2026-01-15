import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { SidebarItemComponent } from '../sidebar-item/sidebar-item.component';
import { SidebarService } from '../../services/sidebar.service';
import { SidebarItem } from '../../interfaces/sidebar-item.interface';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { PrimeNGModules } from '../../../../../prime-ng/prime-ng';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    ...PrimeNGModules,
    CommonModule,
    RouterModule,
    SidebarItemComponent,
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit, OnDestroy, OnChanges {
  @Input() visible: boolean = true;
  @Input() collapsed: boolean = false;
  @Output() toggle = new EventEmitter<void>();

  menuItems: SidebarItem[] = [];
  private itemsSubscription?: Subscription;
  private routerSubscription?: Subscription;

  open: boolean = true;
  sidebarVisible: boolean = true;
  currentExpandedItemIndex: number[] = [];

  constructor(
    private sidebarService: SidebarService,
    private router: Router
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']) {
      this.sidebarVisible = this.visible;
    }
    if (changes['collapsed']) {
      this.open = !this.collapsed;
    }
  }

  ngOnInit() {
    this.menuItems = this.sidebarService.getItems();

    this.itemsSubscription = this.sidebarService.items$.subscribe(items => {
      this.menuItems = items.filter(item => item.visible !== false);
    });

    this.sidebarVisible = this.visible;
    this.open = !this.collapsed;

    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.expandActiveItems();
      });

    this.expandActiveItems();
  }

  ngOnDestroy() {
    if (this.itemsSubscription) {
      this.itemsSubscription.unsubscribe();
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  onToggle() {
    this.toggle.emit();
  }

  handleExpandChange(event: { index: number, depth: number, expanded: boolean }) {
    if (event.expanded) {
      while (this.currentExpandedItemIndex.length <= event.depth) {
        this.currentExpandedItemIndex.push(-1);
      }
      this.currentExpandedItemIndex[event.depth] = event.index;
    } else if (this.currentExpandedItemIndex.length > event.depth) {
      this.currentExpandedItemIndex = this.currentExpandedItemIndex.slice(0, event.depth);
    }
  }

  private expandActiveItems() {
    const currentUrl = this.router.url.replace(/^\/+/, '').replace(/\/+$/, '');

    this.menuItems.forEach((item, index) => {
      if (this.hasActiveChild(item, currentUrl)) {
        if (this.currentExpandedItemIndex.length === 0) {
          this.currentExpandedItemIndex.push(-1);
        }
        this.currentExpandedItemIndex[0] = index;
      }
    });
  }

  private hasActiveChild(item: SidebarItem, currentUrl: string): boolean {
    if (!item.items?.length) return false;

    return item.items.some(subItem => {
      if (subItem.routerLink) {
        const subRoute = (Array.isArray(subItem.routerLink)
          ? subItem.routerLink.join('/')
          : subItem.routerLink).replace(/^\/+/, '').replace(/\/+$/, '');

        if (currentUrl === subRoute || currentUrl.startsWith(subRoute + '/')) {
          return true;
        }
      }

      return !!(subItem.items && subItem.items.length > 0 && this.hasActiveChild(subItem, currentUrl));
    });
  }
}

