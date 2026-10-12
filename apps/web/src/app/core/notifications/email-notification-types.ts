// Notification types a user can mute for email. Invitations have their own email; transfer failures are not created.
export const EMAIL_NOTIFICATION_TYPES = [
  'recurring_transaction_created',
  'recurring_transaction_ended',
  'allowance_invitation_accepted',
  'allowance_invitation_declined',
  'allowance_received',
  'allowance_expense_added',
  'exchange_rates_sync_failed',
] as const;

export type EmailNotificationType = (typeof EMAIL_NOTIFICATION_TYPES)[number];

// Sent only to administrators, so other users never see a preference for it.
export const ADMIN_EMAIL_NOTIFICATION_TYPES: readonly EmailNotificationType[] =
  ['exchange_rates_sync_failed'];
