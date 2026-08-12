# Mortgages

## What it does

The authenticated `/modules/mortgages` module guides a user through a PLN
mortgage definition and generates an ACT/365 repayment projection. A mortgage
stores its disbursement and first-installment dates, principal, term, equal or
decreasing installment type, bank margin, WIBOR tenor, initial cost, wallet,
and expense category.

Interest periods are explicit and sequential. A fixed period stores the full
nominal rate. A variable period uses the mortgage margin plus WIBOR 1M, 3M,
6M, or 1Y. Overpayments store their date, amount, and either a shorten-term or
reduce-payment strategy. Full payment holidays produce no principal or
interest payment and extend the schedule.

## Simulation and reference rates

Each generated revision stores every installment, its principal and interest
parts, opening and remaining principal, applied annual rate, and reference-rate
status. Fixed and already observed WIBOR resets are confirmed. A future reset
uses the last rate known at generation time and is visibly marked as a
projection. Missing reference data is never invented.

`wibor_rates` is a read-only application contract. This feature does not fetch,
scrape, seed, or redistribute WIBOR data. A separately approved data process
must populate it before variable-rate schedules can be confirmed.

## Transactions and recalculation

After reviewing the simulation, the user can synchronize it with the selected
wallet. The initial cost, overpayments, and installments are linked to both the
mortgage and its schedule revision. Future entries are planned and do not
appear in the completed transaction list. Due entries become completed only
when their rate is fixed or confirmed.

Recalculation creates a new schedule revision. Synchronization then replaces
all linked entries, including historical ones, only after an explicit warning.
The user can also detach every linked entry with one action without deleting
the mortgage, or delete the mortgage and its simulation without manually
removing hundreds of installments. RLS and database mutation guards keep all
mortgage records owner-scoped and prevent editing synchronized entries outside
the mortgage API.

## Deliberate limits

The module supports PLN only. Results are personal planning estimates, not a
bank's contractual schedule or financial advice. Spendist records ledger
projections and never initiates a loan payment. No demo mortgage or WIBOR data
is installed.
