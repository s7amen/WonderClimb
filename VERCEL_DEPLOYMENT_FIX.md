# Vercel Deployment CORS Fix

## Issues Fixed

### 1. CORS Error ✅
**Problem:** Frontend deployed on Vercel couldn't connect to backend API due to CORS policy blocking requests.

**Solution:** Updated backend CORS configuration to automatically allow all Vercel preview URLs (`*.vercel.app`).

**Changes Made:**
- Updated `backend/src/app.js` to use a dynamic CORS origin function
- Vercel preview URLs are now automatically allowed (no configuration needed)
- Custom production domains can still be added via `CORS_ORIGIN` environment variable

### 2. Manifest.json 401 Error
**Problem:** Browser console showing 401 error when fetching manifest.json.

**Solution:** Updated `vercel.json` to ensure proper headers for manifest.json. This error may also resolve once CORS is fixed (could be a preflight OPTIONS request issue).

## Next Steps

### 1. Deploy Backend Changes to Fly.dev

The CORS fix needs to be deployed to your Fly.dev backend:

```bash
cd backend
# Commit the changes
git add src/app.js
git commit -m "Fix CORS to allow Vercel preview URLs"

# Deploy to Fly.dev
fly deploy
```

### 2. Verify CORS Configuration

After deploying, test that CORS is working:

1. Open your Vercel frontend URL in browser
2. Open browser DevTools → Network tab
3. Try to make an API request (e.g., fetch sessions)
4. Check the response headers - you should see `Access-Control-Allow-Origin` header

### 3. Optional: Set Production Domain in CORS_ORIGIN

If you have a custom production domain (not Vercel), set it on Fly.dev:

```bash
fly secrets set CORS_ORIGIN="https://your-production-domain.com"
```

**Note:** Vercel preview URLs (`*.vercel.app`) work automatically - no need to add them!

### 4. Test the Fix

After deploying the backend:

1. Clear browser cache or use incognito mode
2. Visit your Vercel frontend URL
3. Check browser console - CORS errors should be gone
4. Verify API requests are working (sessions, bookings, etc.)

## How CORS Now Works

- **Development:** All origins allowed
- **Production:** 
  - All `*.vercel.app` URLs automatically allowed ✅
  - Origins in `CORS_ORIGIN` env var allowed
  - Other origins blocked

## Troubleshooting

If CORS errors persist after deploying:

1. **Check Fly.dev logs:**
   ```bash
   fly logs
   ```
   Look for CORS warning messages showing blocked origins

2. **Verify environment:**
   ```bash
   fly ssh console
   echo $NODE_ENV
   ```
   Should be `production`

3. **Test CORS directly:**
   ```bash
   curl -H "Origin: https://your-vercel-url.vercel.app" \
        -H "Access-Control-Request-Method: GET" \
        -H "Access-Control-Request-Headers: Content-Type" \
        -X OPTIONS \
        https://wonderclimb.fly.dev/api/v1/health \
        -v
   ```
   Should return `Access-Control-Allow-Origin` header

## Files Changed

- `backend/src/app.js` - Updated CORS configuration
- `vercel.json` - Added headers for manifest.json
- `backend/README.md` - Updated documentation

