# Encrypted database backups

Supabase Free projects do not include operator-accessible automatic backups. Spendist therefore provides a local, encrypted logical backup workflow for disaster recovery.

## Included data

Every archive contains:

- application schemas, roles, data, and Supabase migration history;
- the explicit `auth` schema and data, including users, identities, MFA records, sessions, refresh tokens, and password hashes;
- the explicit `storage` schema and metadata;
- every physical Supabase Storage object downloaded through the Storage API;
- a manifest with per-file and per-object SHA-256 checksums.

The workflow does not include Supabase platform configuration that is not stored in Postgres, including Edge Function secrets, the project JWT secret, OAuth provider settings, SMTP configuration, or Dashboard settings. Keep these values in a separate secret manager and follow the disaster-recovery checklist below.

## Encryption and local files

The final archive uses AES-256-GCM authenticated encryption. Its key is derived with scrypt from `SPENDIST_BACKUP_ENCRYPTION_KEY`. The key must contain at least 24 characters and should be a randomly generated value stored in a password manager.

Plain SQL, Auth data, Storage objects, and the intermediate tar archive exist only inside a permission-restricted temporary directory. The tool removes that directory whether the operation succeeds or fails. If encryption or verification fails, it also removes the incomplete final archive.

The final files are:

```text
backups/spendist-PROJECT_REF-TIMESTAMP.enc
backups/spendist-PROJECT_REF-TIMESTAMP.enc.sha256
```

Both are ignored by Git. The `.enc` file is useless without the encryption key. Keep at least one additional encrypted copy on a different physical device.

## Configuration

Copy `.env.backup.example` to `.env.backup.local`:

```bash
cp .env.backup.example .env.backup.local
```

Set a unique encryption key. The ignored repository `.env` must provide:

```text
SUPABASE_REMOTE_DB_URL
SUPABASE_URL
SUPABASE_PROJECT_REF
SUPABASE_SERVICE_ROLE_KEY
```

`SUPABASE_SECRET_KEY` or `SB_SECRET_KEY` can replace `SUPABASE_SERVICE_ROLE_KEY`. Use the minimum-lived administrative credential available and rotate it if exposed. Never pass database credentials or encryption keys as command-line arguments.

The script verifies that the database hostname, API URL, and project reference point to the same Supabase project before reading any data.

## Create and verify a backup

Create a full backup:

```bash
npm run db:backup:remote
```

The command:

1. exports application, migration, Auth, and Storage SQL;
2. downloads every Storage object;
3. records sizes and SHA-256 hashes;
4. creates and encrypts the archive;
5. decrypts it into a temporary directory;
6. authenticates the encryption, verifies SQL coverage, and checks every hash;
7. writes the encrypted archive and its external checksum.

Verify an existing archive later:

```bash
npm run db:backup:verify -- --file=backups/spendist-PROJECT_REF-TIMESTAMP.enc
```

Verification requires the same `SPENDIST_BACKUP_ENCRYPTION_KEY` and the adjacent `.sha256` file. It never restores or changes Supabase.

## Restore procedure

Restoring is intentionally not automated because it overwrites authentication and financial data.

1. Create or select an isolated recovery project.
2. Verify the encrypted archive.
3. Copy the archive and checksum to a temporary, encrypted workstation.
4. Decrypt and inspect it using a reviewed recovery command or script.
5. Restore roles, application schema, application data, and migration history with `psql --single-transaction --variable ON_ERROR_STOP=1`.
6. Restore Auth only after reviewing compatibility with the target project's existing Auth schema.
7. Restore Storage metadata, then upload the physical objects through the Storage API or S3 endpoint.
8. Reconfigure Edge Function secrets, Vault values, OAuth, SMTP, scheduled jobs, and other Dashboard settings.
9. If the original JWT secret is unavailable, invalidate old sessions and require users to sign in again. Password hashes remain present, so passwords do not need to be reset when the Auth restore succeeds.
10. Validate RLS, login, account deletion, recurring jobs, financial totals, Storage access, and generated notifications before directing traffic to the recovered project.

Never test a restore against production. Perform a recovery drill on an isolated project at least quarterly.

## Recommended schedule

For a Free project:

- daily backups retained for 7 days;
- weekly backups retained for 4 weeks;
- monthly backups retained for 6 months;
- at least one encrypted copy stored off the machine running the backup;
- quarterly restore drills.

Retention deletion is deliberately not part of the script. An operator must review backup age and location before deleting archives.
