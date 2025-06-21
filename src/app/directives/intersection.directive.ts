import { Directive, ElementRef, EventEmitter, Input, Output, inject, OnInit, OnDestroy } from '@angular/core';

@Directive({
  selector: '[appIntersection]',
  standalone: true
})
export class IntersectionDirective implements OnInit, OnDestroy {
  @Input() observeOnce: boolean = true;
  @Output() visible = new EventEmitter<void>();

  private el = inject(ElementRef);
  private observer!: IntersectionObserver;

  ngOnInit(): void {
    this.observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.visible.emit();
          if (this.observeOnce) {
            this.observer.unobserve(this.el.nativeElement);
          }
        }
      });
    }, {
      threshold: 1.0
    });

    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}
