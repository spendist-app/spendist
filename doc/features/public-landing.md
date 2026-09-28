# Public landing page

The public `/` route introduces Spendist as a free, open-source personal-finance application for recording household income and expenses. Signed-in visitors are redirected to the product home by the existing authentication guard.

Polish and English copy explains the audience, monthly spending summaries, supported imports, recurring transaction records, and data portability. Registration and login links lead to `/signup` and `/login`. A “See how it works” anchor leads to three steps: create an account and confirm email, record an expense, then review the dashboard. The page states that Spendist does not connect to a bank or pay bills.

The decorative financial summary uses fixed sample values and is visibly labelled as an illustration. It does not show a live account, a customer record, or an interactive demo.

Source-code links point to the public GitHub repository. The page also links to the localized blog, legal pages, and the related Tickist project. It owns no financial data and adds no tracking events.

Implementation: `apps/web/src/app/pages/landing/`, with matching keys in both Transloco translation files. The route remains indexable at its existing canonical root URL; this copy update adds no routes or sitemap entries.
