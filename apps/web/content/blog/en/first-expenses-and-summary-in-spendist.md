---
title: 'First expenses in Spendist: From sign-up to summary in 15 minutes'
slug: first-expenses-and-summary-in-spendist
description: 'Create a Spendist account, set up your first wallet, record a few expenses, and review your first monthly summary without importing your history.'
publishedAt: 2026-11-13
category: household-budget
tags:
  - spendist
  - household-budget
  - expense-tracking
  - getting-started
coverImageId: blog/en/first-expenses-and-summary-in-spendist/cover
coverImageAlt: 'First expenses in Spendist, illustrated with three example expenses totaling $45.00'
draft: false
---

You can start budgeting with one account, one wallet, and a few recent expenses. This guide takes you through those first entries and shows you where to review the totals. Use fictional purchases if you want to explore the app before entering your own financial data.

Spendist is free and open source. You enter expenses manually or import supported files. Spendist works without a bank connection, and you can export your data as CSV at any time.

The wallet, transaction, and dashboard screenshots use sample data from the demo account. The demo has more entries than a new account will have on its first day.

## Step 1 — Create an account and confirm your email

Go to [spendist.app](https://spendist.app/) and choose **Sign up**. Fill in **Name**, **Email**, **Password**, and **Confirm password**, then choose your **First wallet currency**. Use at least eight characters in your password, including an uppercase letter, a lowercase letter, and a number.

After submitting the form, check your inbox and spam folder for the confirmation email. While you wait, Spendist shows the address you entered and gives you the option to resend the email. The confirmation link verifies your address, signs you in, and opens the **Dashboard**.

To sign up, confirm that you are 18 or older, accept the **Terms of Service**, and acknowledge that you have read the **Privacy Policy**. Complete the human verification if prompted.

![Spendist sign-up form with name, email, password, and wallet currency fields](image:signup 'USD is selected as the first wallet currency in this example')

## Step 2 — Start with one wallet

A wallet represents where you pay from, such as a checking account, a card, or cash. Start with one wallet in the currency you use most often. You can add a wallet in another currency later in **Settings** under **Wallets**. Spendist uses stored exchange rates to convert amounts.

Spendist sets up a default set of categories when you first sign in. Use them for your first week, then adjust them based on the expenses you actually record.

![Three wallets in Spendist settings, with Checking marked as the default](image:wallets 'The demo account uses Checking in USD as its default wallet')

## Step 3 — Record a few expenses from this week

Open **Transactions**, click **+**, and choose **Add transaction**. Enter the amount, set the date, and choose a category. Spendist preselects your default wallet. To use another wallet, click **Show advanced fields**. Description, tags, and place are optional. Start with a few recent purchases or bills. Three to five entries are enough to see how the dashboard groups your spending.

**Save and add another** keeps the form open for your next entry. If you have several receipts, choose **Add in bulk** from the **+** menu. You can paste rows from a spreadsheet. Spendist can split the columns on tabs, commas, or semicolons.

You can add a new place directly from the transaction form.

![Add transaction form showing a $24.00 expense in the Groceries category](image:expense-form 'Grocery shopping for $24.00')

## Step 4 — Review your first summary

Open **Dashboard** to see income, expenses, and the balance for recent months, plus a breakdown of spending by place. In **Monthly category structure**, choose the wallet and month that contain the expenses you just added. That section shows totals and breaks them down by category and tag.

On **Transactions**, you can filter by category, tag, place, amount, and date range. Filters are stored in the page URL, so you can bookmark the view or send the link to your phone.

![Monthly category structure on the Spendist dashboard with income and expense totals](image:dashboard 'The demo Checking wallet in July 2026, with totals by category and tag')

## Step 5 — Find the CSV export

In **Settings**, open **Export/import Spendist** and look for **Export CSV**. The file includes dates, descriptions, transaction types, amounts, currencies, category paths, wallets, tags, and places. You can import the same format into Spendist again, including into a new account.

## What to do next

- Moving from Kontomierz? Use **Kontomierz import** in **Settings** to import an XLSX export into the wallet you choose.
- Have a Biedronka e-receipt? Open **Transactions** and choose **Add from file** from the **+** menu to import the JSON file.
- Pay for the same things every month? Read how to set up [recurring payments](/en/blog/recurring-payments-household-budget).

If something is unclear or fails, [open an issue on GitHub](https://github.com/spendist-app/spendist/issues). Describe what happened without including amounts or personal details.
