import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { onViewTransitionCreated, routePath } from './view-transitions';

@Component({ template: '' })
class BlankComponent {}

async function snapshotOf(url: string) {
  const router = TestBed.inject(Router);

  await router.navigateByUrl(url);

  return router.routerState.snapshot.root;
}

function transitionStub() {
  return { skipTransition: vi.fn() };
}

describe('view transitions', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'transactions', component: BlankComponent },
          {
            path: 'modules',
            children: [{ path: 'places', component: BlankComponent }],
          },
        ]),
      ],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the matched path without query parameters', async () => {
    expect(routePath(await snapshotOf('/modules/places?tab=map'))).toBe(
      '/modules/places'
    );
  });

  it('cross-fades between pages and skips query-only changes', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));

    const transactions = await snapshotOf('/transactions');
    const filtered = await snapshotOf('/transactions?month=2026-11');
    const places = await snapshotOf('/modules/places');

    const pageChange = transitionStub();
    const filterChange = transitionStub();

    onViewTransitionCreated({
      transition: pageChange,
      from: transactions,
      to: places,
    });
    onViewTransitionCreated({
      transition: filterChange,
      from: transactions,
      to: filtered,
    });

    expect(pageChange.skipTransition).not.toHaveBeenCalled();
    expect(filterChange.skipTransition).toHaveBeenCalled();
  });

  it('skips the transition for users who prefer reduced motion', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));

    const transition = transitionStub();

    onViewTransitionCreated({
      transition,
      from: await snapshotOf('/transactions'),
      to: await snapshotOf('/modules/places'),
    });

    expect(transition.skipTransition).toHaveBeenCalled();
  });
});
