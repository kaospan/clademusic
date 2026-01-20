# Edge Function: verify-2fa

## Purpose
Server-side 2FA verification to prevent client-side bypass attacks.

## Endpoint
`POST /functions/v1/verify-2fa`

## Request Body
```json
{
  "code": "123456",
  "isBackupCode": false
}
```

## Response
```json
{
  "success": true,
  "message": "2FA verified successfully"
}
```

## Implementation Notes
- Uses service_role key to access user_2fa_secrets table
- Verifies TOTP code against stored secret
- For backup codes: checks hash match and marks code as used
- Returns 401 if verification fails
- Rate-limited to 5 attempts per minute per user

## Security
- All verification happens server-side
- Secrets never sent to client
- Backup codes are hashed before storage
- Failed attempts are logged for security monitoring
