import { TestBed } from '@angular/core/testing';
import { provideAppTransloco } from '../../i18n/transloco.providers';
import { fixtureElement, requiredValue } from '../../../testing/dom';
import { TagPickerComponent, type TagPickerSelection } from './tag-picker.component';

function setUp() {
  const fixture = TestBed.createComponent(TagPickerComponent);
  const emitted: (readonly TagPickerSelection[])[] = [];

  fixture.componentInstance.valueChange.subscribe((value) => emitted.push(value));
  fixture.detectChanges();

  const input = requiredValue(
    fixtureElement(fixture).querySelector<HTMLInputElement>('input[type="text"]')
  );

  input.value = 'kawa';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  fixture.detectChanges();

  return { input, emitted };
}

describe('TagPickerComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TagPickerComponent],
      providers: [...provideAppTransloco()],
    }).compileComponents();
  });

  it('adds the typed tag on Enter', () => {
    const { input, emitted } = setUp();

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      cancelable: true,
    });

    input.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(emitted).toEqual([[{ id: null, name: 'kawa' }]]);
  });

  it('leaves Enter to the IME while text is being composed', () => {
    const { input, emitted } = setUp();

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      isComposing: true,
      cancelable: true,
    });

    input.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(emitted).toEqual([]);
  });

  it('ignores the IME-confirming Enter Safari sends after compositionend', () => {
    const { input, emitted } = setUp();

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      keyCode: 229,
      cancelable: true,
    });

    input.dispatchEvent(event);

    expect(emitted).toEqual([]);
  });
});
