# Spendist feature knowledge base

This directory is the English, LLM-oriented source of truth for current user-visible behavior. It complements the concise `llm.txt` and the broader `llm-full.txt` in the repository root.

## Feature index

- [Authentication and account security](features/authentication-and-account-security.md)
- [Transactions](features/transactions.md)
- [Financial organization and data portability](features/financial-organization-and-data-portability.md)
- [Recurring payments](features/recurring-payments.md)
- [Places and dashboard insights](features/places-and-dashboard-insights.md)
- [Preferences, notifications, and platform behavior](features/preferences-notifications-and-platform.md)
- [Public multilingual blog](features/public-blog.md)

## Maintenance

When a user-visible feature changes, update its page in this directory in the same change. Describe shipped behavior, important inputs/outputs, data boundaries, and limits. Mark future work as **Planned**.

For an indexable public route, also update `llm.txt` and `llm-full.txt`. Blog routes use the content generator, which must update `apps/web/public/sitemap.xml`, `apps/web/public/robots.txt`, and both RSS feeds in the same change.
