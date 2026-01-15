import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject, fromEvent } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FullscreenService implements OnDestroy {
  private isFullscreenSubject = new BehaviorSubject<boolean>(this.getFullscreenState());
  public isFullscreen$ = this.isFullscreenSubject.asObservable();

  private resizeHandler: () => void;

  constructor(private ngZone: NgZone) {
    document.onfullscreenchange = () => {
      setTimeout(() => {
        const state = this.getFullscreenState();
        this.ngZone.run(() => {
          this.isFullscreenSubject.next(state);
        });
      }, 50);
    };

    (document as any).onwebkitfullscreenchange = () => {
      setTimeout(() => {
        const state = this.getFullscreenState();
        this.ngZone.run(() => {
          this.isFullscreenSubject.next(state);
        });
      }, 50);
    };

    this.resizeHandler = () => {
      setTimeout(() => {
        const state = this.getFullscreenState();
        this.ngZone.run(() => {
          this.isFullscreenSubject.next(state);
        });
      }, 50);
    };
    window.addEventListener('resize', this.resizeHandler, true);
  }

  private getFullscreenState(): boolean {
    return !!(document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler, true);
  }
}
