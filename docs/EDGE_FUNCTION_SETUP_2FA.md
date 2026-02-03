# Edge Function: setup_2fa

## Purpose
Server-side 2FA setup to securely store secrets without client exposure.

## Endpoint
`POST /functions/v1/setup_2fa`

## Request Body
```json
{
  "secret": "BASE32SECRET",
  "code": "123456",
  "backup_codes": ["sha256hex1", "sha256hex2"]
}
```

## Response
```json
{
  "success": true
}
```

## Implementation Notes
- Verifies the provided code against the secret server-side before enabling
- Uses `service_role` to authenticate the user (Bearer token) and write securely
- Upserts into `secure_2fa_secrets` (`user_id`, `secret`, `backup_codes`)
- Updates `profiles.twofa_enabled = true`
- Returns 401 if missing/invalid auth, 400 for invalid/missing fields

## Security
- Verification happens before storing
- Uses `service_role` to write to a service-only table
- Secret is stored in `secure_2fa_secrets` (not in `profiles`)
- Backup codes should be hashed client-side (see `src/lib/totp.ts#hashBackupCode`)

## Migrations Required
- `supabase/migrations/20260120_secure_2fa_secrets.sql`
