# Recurring Payments Module UI Plan

## Goal
Replace the placeholder recurring payments page with an interactive view that:
- shows aggregated spending metrics for the signed-in user,
- lists active recurring transactions (name, schedule, amounts, tags),
- provides a form to create new recurring transactions with tag + category selection.

## Key Tasks
1. **State management**
   - Build `RecurringPaymentsStore` that loads:
     - categories, tags, default currency (from existing tables),
     - recurring transactions overview via the `recurring_transactions_overview` view.
   - Expose signals for loading/errors, stats, list data, and mutation status.
   - Support create/delete (delete optional? scope now create only) recurring transactions.

2. **Form UX**
   - Standalone form component with typed Angular reactive form (signals-based).
   - Fields: name, category, amount, currency (default), direction (expense/income), start date, optional end date, cron schedule, tags, optional exchange rate.
   - Validate: required fields, amount > 0, uppercase 3-letter currency, cron string non-empty.
   - Submit via store -> insert into `recurring_transactions` + link tags.

3. **List & Stats**
   - Header cards for yearly/monthly expense.
   - Filter active recurring entries from store, display in table-like list with tags badges.
   - Provide actions (initially only delete/cancel?). For now < scope > simple display; add delete button calling store.

4. **Wire to Page**
   - Update `recurring-payments.page.ts` to use new store, include stats, list, and form.
   - Add translations for new labels/actions/errors.

5. **Data Integration**
   - Ensure Supabase RPC/queries use existing schema (view + table).
   - Format amounts/currency/time for display.
   - Handle schedule string display.

6. **Testing & Cleanup**
   - Manual verification instructions.
- Remove placeholder copy.

## Editing Support (Phase 2)
- Track selected recurring entry in the store with `startEditing`/`cancelEditing`.
- Implement `updateRecurringTransaction` to rewrite schedule, core fields, and tag relations.
- Reuse the form for edit mode (prefill values, toggle button labels, allow cancelling).
- Surface an "Edit" action in the list and highlight the record being edited.

## Open Questions
- Should recurring entries support income direction? (Assume yes per schema; default to expense.)
- Tag selection UX: can reuse chips UI from transaction form? Might need simplified multi-select.
- Delete support? If time permits add `Delete` button -> `delete from recurring_transactions` (triggers unschedule).

## Deliverables
- New store/service file.
- Form + list components (likely colocated under recurring module dir).
- Updated translations.
- Updated page template hooking everything together.
