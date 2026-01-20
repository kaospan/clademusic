# Edge Function: setup-2fa

## Purpose
Server-side 2FA setup to securely store secrets without client exposure.

## Endpoint
`POST /functions/v1/setup-2fa`

## Request Body
```json
{
  "secret": "BASE32SECRET",
  "verificationCode": "123456",
  "backupCodesHashed": ["hash1", "hash2", ...]
}
```

## Response
```json
{
  "success": true,
  "message": "2FA enabled successfully"
}
```

## Implementation Notes
- Verifies the provided code against the secret before enabling
- Stores secret in user_2fa_secrets table (service_role access)
- Updates profiles.twofa_enabled = true
- Backup codes are already hashed client-side
- Returns 400 if verification code is invalid

## Security
- Verification happens before storing
- Uses service_role to bypass RLS and write to secure table
- Secret never stored in profiles table
- One-time use: cannot be re-setup without disabling first
