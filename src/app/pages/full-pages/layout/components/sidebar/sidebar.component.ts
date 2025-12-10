import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarItemComponent } from '../sidebar-item/sidebar-item.component';
import { SidebarService } from '../../services/sidebar.service';
import { SidebarItem } from '../../interfaces/sidebar-item.interface';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SidebarItemComponent
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

  open: boolean = true;
  sidebarVisible: boolean = true;
  titulo: string = 'MENÚ';
  currentExpandedItemIndex: number[] = [];

  constructor(private sidebarService: SidebarService) {}

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
  }

  ngOnDestroy() {
    if (this.itemsSubscription) {
      this.itemsSubscription.unsubscribe();
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
    } else {
      if (this.currentExpandedItemIndex.length > event.depth) {
        this.currentExpandedItemIndex = this.currentExpandedItemIndex.slice(0, event.depth);
      }
    }
  }
}

