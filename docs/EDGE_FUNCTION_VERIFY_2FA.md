# Edge Function: verify_2fa

## Purpose
Server-side 2FA verification to prevent client-side bypass attacks.

## Endpoint
`POST /functions/v1/verify_2fa`

## Request Body
```json
{
  "action": "verify_totp",
  "code": "123456"
}
```

## Response
```json
{
  "valid": true
}
```

## Implementation Notes
- Uses `service_role` key to look up the user’s `secure_2fa_secrets` row
- `action: "verify_totp"` verifies a 6-digit TOTP code against the stored secret
- `action: "verify_backup"` hashes the provided code server-side (SHA-256) and checks/consumes it
- Returns 401 if missing/invalid auth
- Returns 400 if 2FA is not configured or request is invalid

## Security
- All verification happens server-side
- Secrets never sent to client
- Backup codes are hashed before storage

## Migrations Required
- `supabase/migrations/20260120_secure_2fa_secrets.sql`
