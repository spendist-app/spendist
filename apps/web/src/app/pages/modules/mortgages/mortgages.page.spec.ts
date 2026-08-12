import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth.service';
import { SUPABASE_CLIENT } from '../../../core/supabase';
import { provideAppTransloco } from '../../../i18n/transloco.providers';
import { MortgagesPage } from './mortgages.page';

class AuthServiceStub {
  readonly loading = signal(true);
  readonly session = signal(null);
}

describe('MortgagesPage', () => {
  let component: MortgagesPage;
  let fixture: ComponentFixture<MortgagesPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MortgagesPage],
      providers: [
        provideAppTransloco(),
        { provide: AuthService, useClass: AuthServiceStub },
        { provide: SUPABASE_CLIENT, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MortgagesPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
