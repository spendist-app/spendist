import { TestBed } from '@angular/core/testing';
import { CategorySelectComponent } from './category-select.component';

describe('CategorySelectComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategorySelectComponent],
    }).compileComponents();
  });

  it('renders the options panel as an overlay', () => {
    const fixture = TestBed.createComponent(CategorySelectComponent);
    fixture.componentRef.setInput('groups', [
      {
        groupName: 'Home',
        options: [{ id: 'category-1', label: 'Rent' }],
      },
    ]);
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector(
      'button'
    ) as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('[role="listbox"]')
      ?.parentElement as HTMLElement;
    expect(panel.classList.contains('absolute')).toBe(true);
    expect(panel.classList.contains('z-50')).toBe(true);
  });
});
