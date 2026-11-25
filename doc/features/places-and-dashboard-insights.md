# Places and dashboard insights

## Places

Places are reusable spending locations or merchants. A place can have a name, street, city, postal code, country, and note. Users can create, edit, delete, and search places, then attach them to transactions. The single-transaction form also lets users create a place with these fields while entering a transaction. Saving it selects the new place without clearing the transaction draft; a failed save keeps both forms open for correction.

### Logos

A place can have a brand logo, shown next to its name in the Places module, the merge dialog, the transaction list, the single-transaction place picker and the dashboard place widget. Native `<select>` lists (place filter, bulk entry, import review) show names only. The same logo picker serves recurring payments; see `doc/features/recurring-payments.md`.

The picker, `apps/web/src/app/shared/logo/`, offers three sources:

- **Simple Icons** (CC0): the pinned `simple-icons` package is copied to `/logos/simple-icons/` at build time, so these icons load from Spendist itself. The picker searches its title, slug and aliases as the user types, starting with the record's name. The icon is drawn in white or black, whichever contrasts more, on a tile in the brand colour.
- **Dashboard Icons** (`homarr-labs/dashboard-icons`, about 4,800 coloured logos, including brands that Simple Icons does not carry such as Microsoft, Amazon, Disney+ or Biedronka): loaded from jsDelivr only after the user chooses **Search more logos**. jsDelivr then receives the user's IP address and the previews requested. A picked image is downloaded and stored like an upload, so later upstream changes never alter a saved logo. jsDelivr refuses commit-pinned URLs for this repository (it exceeds the 50 MB package limit), so the picker reads the `main` branch.
- **Upload:** a PNG, JPEG or WebP image up to 5 MB. The browser scales it to at most 192 px and encodes WebP, or PNG where the browser cannot encode WebP; re-encoding also drops embedded metadata. SVG uploads are not accepted.

Stored values (`places.logo`, `recurring_transactions.logo`) take one of two shapes, enforced by CHECK constraints:

- `simple-icons:<slug>:<hex>` for a bundled icon and its brand colour;
- `file:<uuid>.<webp|png>` for an image in the owner's folder of the public `logos` Storage bucket (256 KiB, WebP and PNG only). The value names no folder, so it cannot point at another user's file. Storage policies limit uploads to the owner's folder and exact UUID names, and allow no updates. The bucket is public like `avatars`: anyone with the unguessable URL can load an uploaded logo, but listing is limited to the owner.

A picked image is uploaded only when the form is saved; a failed save removes it again, and replacing, removing or deleting a logo removes its file. Merging places keeps the target's logo or adopts the first merged place's logo when the target has none; the files of the other merged places are removed. Account deletion empties the user's `logos` folder. Files left by deletions made through MCP stay until the account is deleted. Spendist CSV export does not carry logos.

**Planned:** Google image results through SerpAPI as a fourth source. SerpAPI sends no CORS headers, so it needs a Supabase Edge Function as a proxy; the user's own SerpAPI key would stay in browser storage and be sent with each search. Results would be stored as file logos.

### Duplicate names

Two place names are the same place when they match after lowercasing, trimming, collapsing whitespace, and removing common Latin diacritics, so "Pepco", " pepco " and "PEPCO" match, and so do "Łódź" and "Lodz". The database function `public.place_name_key` defines this key, and `apps/web/src/app/shared/place-name/place-name.ts` mirrors it.

- The Places module refuses to add or rename a place to a name that another place already uses and names the existing place.
- The single-transaction form reuses and selects the existing place instead of creating a new one.
- Spendist CSV import matches places by the same key and creates only missing ones.
- MCP `create_place` returns the existing place with `existing: true`.

The database has no unique constraint on the key yet, because existing accounts can already contain duplicates. **Planned:** add a unique index on `(owner_id, place_name_key(name))` after users have had time to merge them.

### Merging places

The Places module lists possible duplicates (places with the same key) above the list, each with a **Review merge** action. Users can also tick two or more places and choose **Merge selected**.

The merge dialog asks which place to keep and shows, for the selected target, the transaction count of each place, how many transactions will move and which empty target fields will be filled. Confirming the merge:

- moves every transaction of the merged places to the kept place;
- fills the kept place's empty street, city, postal code, country, note, and logo from the merged places, in list order, without overwriting filled fields;
- deletes the merged places.

All of this happens in one database transaction (`public.merge_places`); a failure changes nothing. Only places of the signed-in user can be merged, the kept place cannot also be a merged place, and one merge covers at most 50 places. Only transactions reference places; recurring payments have no place and are not affected, and transactions generated by a recurring payment keep their link to it. `public.place_merge_preview` computes the preview without changing data.

## Dashboard

The dashboard is a read-only overview based on recorded transactions. It shows:

- income, expenses, and net cash flow across up to the last 12 calendar months;
- category and tag totals for a selected month;
- count, income, expense, and net total of recurring-generated transactions in a selected month;
- annual expense totals, transaction count, latest transaction and logo for each place.

Wallet selection scopes applicable data. Empty states explain missing wallet, month, transaction, or place data.

The dashboard reports existing records only; it does not forecast investments or recommend financial actions.
