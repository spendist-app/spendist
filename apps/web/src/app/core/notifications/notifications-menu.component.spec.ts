import { TestBed } from '@angular/core/testing';
import type { NotificationRow } from '@spendist/data-access/supabase-types';
import { NotificationsMenuComponent } from './notifications-menu.component';
import { NotificationsStore } from './notifications.store';

class NotificationsStoreStub {
  readonly respondToAllowanceInvitation = vi.fn(async () => true);
  readonly refresh = vi.fn(async () => undefined);
}

function notification(
  type: string,
  payload: NotificationRow['payload']
): NotificationRow {
  return {
    id: 'notification-1',
    owner_id: 'owner-1',
    type,
    payload,
    created_at: '2026-10-05T18:13:00.000Z',
    creation_date: '2026-10-05T18:13:00.000Z',
    updated_at: '2026-10-05T18:13:00.000Z',
    read_at: null,
  };
}

describe('NotificationsMenuComponent', () => {
  function setup() {
    TestBed.configureTestingModule({
      providers: [
        NotificationsStoreStub,
        { provide: NotificationsStore, useExisting: NotificationsStoreStub },
      ],
    });

    return {
      component: TestBed.runInInjectionContext(
        () => new NotificationsMenuComponent()
      ),
      store: TestBed.inject(NotificationsStoreStub),
    };
  }

  it('reads recurring transaction details from a type-specific payload', () => {
    const { component } = setup();

    const item = notification('recurring_transaction_created', {
      transaction_id: 'transaction-1',
      description: 'School meals',
      amount: 1,
      currency: 'PLN',
    });

    expect(component.notificationParams(item)).toMatchObject({
      description: 'School meals',
      amount: '1',
      currency: 'PLN',
    });
  });

  it('reads invitation details and keeps its accept action usable', async () => {
    const { component, store } = setup();

    const item = notification('allowance_invitation_received', {
      invitation_id: 'invitation-1',
      inviter_name: 'Parent',
    });

    expect(component.notificationParams(item).inviterName).toBe('Parent');

    await component.respondToInvitation(item, true);

    expect(store.respondToAllowanceInvitation).toHaveBeenCalledWith(
      'invitation-1',
      true
    );
    expect(store.refresh).toHaveBeenCalledOnce();
  });
});
