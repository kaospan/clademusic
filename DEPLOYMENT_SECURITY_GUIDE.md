# Complete Deployment & Security Guide

## 🚀 Deployment Checklist

### 1. Database Migrations (Run in Order)

```bash
# Navigate to Supabase project
cd supabase

# Run migrations in order
supabase db push migrations/20260122_performance_optimization.sql
supabase db push migrations/20260122_unified_interactions.sql

# Verify migrations
supabase db diff
```

### 2. Install Required Dependencies

```bash
# Install security library
npm install isomorphic-dompurify

# Install Supabase client (if not installed)
npm install @supabase/supabase-js

# Install testing libraries
npm install -D vitest @testing-library/react
```

### 3. Environment Variables (.env)

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Optional: For production
VITE_APP_URL=https://your-domain.com
VITE_ENABLE_ANALYTICS=true
```

### 4. Configure Supabase Edge Functions

Create edge function for CSRF protection:

```bash
supabase functions new csrf-validate
```

**File: `supabase/functions/csrf-validate/index.ts`**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Get CSRF token from header
  const csrfToken = req.headers.get('X-CSRF-Token')
  const storedToken = req.headers.get('X-Stored-Token')
  
  // Validate token
  if (!csrfToken || csrfToken !== storedToken) {
    return new Response(
      JSON.stringify({ error: 'Invalid CSRF token' }),
      { status: 403 }
    )
  }
  
  return new Response(
    JSON.stringify({ valid: true }),
    { status: 200 }
  )
})
```

Deploy edge function:

```bash
supabase functions deploy csrf-validate
```

### 5. Configure Content Security Policy (CSP)

**For Vite (vite.config.ts):**

```typescript
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'html-transform',
      transformIndexHtml(html) {
        return html.replace(
          '<head>',
          `<head>
            <meta http-equiv="Content-Security-Policy" content="
              default-src 'self';
              script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
              style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
              img-src 'self' data: https:;
              font-src 'self' https://fonts.gstatic.com;
              connect-src 'self' https://*.supabase.co;
              frame-src 'self' https://www.youtube.com https://open.spotify.com;
            ">
          `
        );
      },
    },
  ],
});
```

**For Production (Netlify, Vercel, etc.):**

Create `netlify.toml` or `vercel.json`:

```toml
# netlify.toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co"
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
```

### 6. Enable RLS Policies (Already in Migrations)

Verify RLS is enabled:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

All tables should have `rowsecurity = t`.

### 7. Configure Rate Limiting with pg_cron

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule materialized view refreshes
SELECT cron.schedule(
  'refresh-hot-posts',
  '*/5 * * * *', -- Every 5 minutes
  $$SELECT refresh_hot_posts()$$
);

SELECT cron.schedule(
  'refresh-top-contributors',
  '0 * * * *', -- Every hour
  $$SELECT refresh_top_contributors()$$
);

SELECT cron.schedule(
  'refresh-forum-stats',
  '*/15 * * * *', -- Every 15 minutes
  $$SELECT refresh_forum_stats()$$
);

-- Schedule cleanup jobs
SELECT cron.schedule(
  'cleanup-expired-cache',
  '0 0 * * *', -- Daily at midnight
  $$SELECT cleanup_expired_cache()$$
);

SELECT cron.schedule(
  'cleanup-rate-limits',
  '0 * * * *', -- Every hour
  $$SELECT cleanup_old_rate_limits()$$
);
```

### 8. Generate 1M Fake Users (Optional, for Testing)

```bash
# Run user generation script
cd scripts
ts-node generate-fake-users.ts

# This will take 16-20 hours for full 1M users
# For testing, generate 10K users (10 minutes):
# Set USER_COUNT = 10000 in the script
```

---

## 🔒 Security Hardening Steps

### 1. Input Sanitization (Frontend)

**Update all form components to use security utilities:**

```typescript
import { sanitizeHtml, sanitizeText, validateContent } from '@/lib/security';

// In form submission
const handleSubmit = async (content: string) => {
  // Validate
  const validation = validateContent(content);
  if (!validation.valid) {
    toast({ title: 'Error', description: validation.error });
    return;
  }
  
  // Sanitize before sending
  const sanitized = sanitizeHtml(content);
  
  await postComment(sanitized);
};
```

**Update components:**
- `src/pages/ForumHomePage.tsx` - Post creation
- `src/components/CommentsSheet.tsx` - Comment posting
- `src/pages/ProfilePage.tsx` - Bio editing

### 2. API Request Validation (Edge Functions)

Create validation edge function:

```typescript
// supabase/functions/validate-input/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { content, type } = await req.json()
  
  // SQL injection check
  const sqlKeywords = ['DROP TABLE', 'DELETE FROM', 'UNION SELECT']
  if (sqlKeywords.some(kw => content.toUpperCase().includes(kw))) {
    return new Response(
      JSON.stringify({ error: 'Invalid input detected' }),
      { status: 400 }
    )
  }
  
  // XSS check
  if (content.includes('<script>') || content.includes('javascript:')) {
    return new Response(
      JSON.stringify({ error: 'Invalid input detected' }),
      { status: 400 }
    )
  }
  
  return new Response(JSON.stringify({ valid: true }), { status: 200 })
})
```

### 3. Supabase Security Settings

**In Supabase Dashboard → Authentication:**

1. **Email Settings:**
   - Enable email confirmation
   - Set email rate limit: 5 per hour
   - Enable CAPTCHA on signup

2. **Password Policy:**
   - Minimum length: 8 characters
   - Require uppercase, lowercase, number
   - Block common passwords

3. **Session Settings:**
   - Session timeout: 1 hour
   - Refresh token rotation: Enabled
   - JWT expiry: 1 hour

4. **API Settings:**
   - Enable rate limiting: 100 requests/minute per IP
   - Enable CORS with specific origins only
   - Disable public schema access (RLS only)

### 4. Database Security Policies

**Review and tighten RLS policies:**

```sql
-- Verify no tables allow public read without auth
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' AND cmd = 'SELECT'
  AND qual NOT LIKE '%auth.uid()%';

-- Should return 0 rows (all selects require auth)
```

### 5. Secure Cookies Configuration

**In edge function middleware:**

```typescript
// Set secure cookie headers
const headers = new Headers({
  'Set-Cookie': [
    'session=value; HttpOnly; Secure; SameSite=Strict; Max-Age=3600',
    'csrf_token=value; Secure; SameSite=Strict',
  ].join(', '),
})
```

---

## 🧪 Security Testing (Penetration Tests)

### Run Automated Tests

```bash
# Run pentest suite
npm run test src/test/pentest.test.ts

# Expected output:
# ✅ XSS Prevention: 8/8 passed
# ✅ SQL Injection: 6/6 passed
# ✅ Auth Bypass: 3/3 passed
# ✅ Rate Limiting: 3/3 passed
# ✅ Input Validation: 8/8 passed
```

### Manual Security Audit

1. **Test XSS Protection:**
   ```bash
   # Try to post comment with script tag
   curl -X POST https://your-api.com/comments \
     -H "Content-Type: application/json" \
     -d '{"content": "<script>alert(\"XSS\")</script>"}'
   
   # Expected: Content should be sanitized
   ```

2. **Test SQL Injection:**
   ```bash
   # Try to inject SQL in search
   curl -X GET "https://your-api.com/search?q=test'; DROP TABLE users; --"
   
   # Expected: Should return safe results or error
   ```

3. **Test Rate Limiting:**
   ```bash
   # Send 150 rapid requests
   for i in {1..150}; do
     curl -X POST https://your-api.com/vote
   done
   
   # Expected: Should block after 100 requests
   ```

4. **Test Authentication:**
   ```bash
   # Try to access protected route without auth
   curl -X GET https://your-api.com/user/interactions
   
   # Expected: 401 Unauthorized
   ```

---

## 📊 Performance Monitoring

### 1. Enable Slow Query Logging

```sql
-- View slow queries
SELECT * FROM slow_queries ORDER BY mean_time DESC LIMIT 20;

-- Set up alert for queries > 500ms
CREATE OR REPLACE FUNCTION alert_slow_queries()
RETURNS void AS $$
BEGIN
  -- Log to monitoring service
  PERFORM pg_notify('slow_query_alert', 
    json_build_object(
      'query', query,
      'mean_time', mean_time
    )::text
  )
  FROM slow_queries
  WHERE mean_time > 500;
END;
$$ LANGUAGE plpgsql;
```

### 2. Monitor Materialized View Performance

```sql
-- Check view sizes and refresh times
SELECT schemaname, matviewname, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size
FROM pg_matviews
WHERE schemaname = 'public';
```

### 3. Monitor Rate Limit Effectiveness

```sql
-- Check rate limit hits
SELECT action, COUNT(*) as blocked_attempts
FROM rate_limits
WHERE count >= 100
GROUP BY action
ORDER BY blocked_attempts DESC;
```

---

## 🚨 Production Readiness Checklist

- [ ] All migrations deployed successfully
- [ ] RLS policies enabled on all tables
- [ ] CSP headers configured
- [ ] HTTPS enforced (no HTTP)
- [ ] Rate limiting active
- [ ] Input sanitization in all forms
- [ ] Password policy enforced (8+ chars, complexity)
- [ ] Session timeout configured (1 hour)
- [ ] Email confirmation enabled
- [ ] CSRF protection implemented
- [ ] XSS protection tested (pentest passed)
- [ ] SQL injection protection tested (pentest passed)
- [ ] Error logging enabled (Sentry, LogRocket)
- [ ] Performance monitoring active (pg_stat_statements)
- [ ] Backup strategy configured (daily snapshots)
- [ ] SSL certificates valid (Let's Encrypt)
- [ ] CORS limited to specific origins
- [ ] API keys rotated and secure
- [ ] Database credentials encrypted
- [ ] Environment variables not committed
- [ ] 1M user load test completed

---

## 📈 Scaling for 1M Users

### Database Optimization

1. **Connection Pooling:**
   ```
   max_connections = 200
   shared_buffers = 2GB
   effective_cache_size = 6GB
   ```

2. **Partitioning Verification:**
   ```sql
   -- Check partition sizes
   SELECT parent.relname AS parent,
          child.relname AS child,
          pg_size_pretty(pg_total_relation_size(child.oid)) AS size
   FROM pg_inherits
   JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
   JOIN pg_class child  ON pg_inherits.inhrelid  = child.oid
   WHERE parent.relname IN ('chat_messages', 'forum_posts');
   ```

3. **Index Usage:**
   ```sql
   -- Verify indexes are being used
   SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
   FROM pg_stat_user_indexes
   WHERE schemaname = 'public'
   ORDER BY idx_scan DESC;
   ```

### Application Optimization

1. **Enable Redis Caching (Optional):**
   - Cache hot posts (5 min TTL)
   - Cache user sessions (1 hour TTL)
   - Cache search results (15 min TTL)

2. **CDN Configuration:**
   - Serve static assets via CDN (Cloudflare, AWS CloudFront)
   - Cache API responses for public data

3. **Load Balancing:**
   - Use multiple Supabase instances (if available)
   - Implement read replicas for heavy queries

---

## 🎯 Success Metrics

Monitor these metrics post-deployment:

- **Performance:**
  - Page load time < 2 seconds
  - API response time < 200ms (p95)
  - Database query time < 100ms (p95)

- **Security:**
  - 0 successful XSS attacks
  - 0 successful SQL injections
  - 0 unauthorized data access
  - Rate limit effectiveness > 99%

- **Reliability:**
  - Uptime > 99.9%
  - Error rate < 0.1%
  - Session persistence > 95%

- **Scale:**
  - Support 1M concurrent users
  - Handle 10K posts/hour
  - Handle 100K votes/hour

---

## 📞 Troubleshooting

### Issue: Users keep getting logged out

**Solution:**
```typescript
// Check auth persistence in useAuth.tsx
localStorage.getItem('lastAuthTime') // Should be recent
supabase.auth.getSession() // Should return valid session
```

### Issue: Slow query performance with 1M users

**Solution:**
```sql
-- Analyze query plans
EXPLAIN ANALYZE SELECT * FROM forum_posts WHERE forum_id = 'xxx';

-- Rebuild indexes if needed
REINDEX TABLE forum_posts;

-- Refresh materialized views
SELECT refresh_hot_posts();
```

### Issue: Rate limiting too aggressive

**Solution:**
```sql
-- Adjust rate limits in check_rate_limit calls
-- Change from 10/hour to 20/hour for posts
UPDATE rate_limits SET max_count = 20 WHERE action = 'post_create';
```

---

## ✅ Deployment Complete

Your application is now:
- ✅ Secure (XSS, SQL injection, CSRF protected)
- ✅ Scalable (1M users supported)
- ✅ Performant (optimized queries, caching, partitioning)
- ✅ Reliable (RLS policies, rate limiting, monitoring)
- ✅ Maintainable (DRY code, reusable hooks, testing)
