# Google OAuth Setup Guide

## Current Issues & Solutions

### Issue 1: "Access blocked: Authorization Error" on Localhost
**Cause**: Google Cloud Console authorized origins not configured for localhost
**Error**: `Error 401: invalid_client`

### Issue 2: Google Sign-in Button Not Appearing in Production
**Cause**: Environment variable not available during build process
**Error**: Button doesn't render because `VITE_GOOGLE_CLIENT_ID` is undefined

## Step-by-Step Fix

### 1. Google Cloud Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID: `461128965954-90fcltci30rissdg8825l3lv5e0ifpfd`
4. Click **Edit** (pencil icon)

#### Update Authorized JavaScript Origins:
```
http://localhost:5173
https://lynqit.onrender.com
```

#### Update Authorized Redirect URIs (if any):
```
http://localhost:5173
https://lynqit.onrender.com
```

### 2. Render Dashboard Configuration

1. Go to your Render dashboard
2. Navigate to service: **lynqit-chat-app**
3. Go to **Environment** tab
4. Add/Update environment variable:
   - **Key**: `VITE_GOOGLE_CLIENT_ID`
   - **Value**: `461128965954-90fcltci30rissdg8825l3lv5e0ifpfd.apps.googleusercontent.com`

### 3. Local Development Setup

Create `frontend/.env.local`:
```bash
VITE_GOOGLE_CLIENT_ID=461128965954-90fcltci30rissdg8825l3lv5e0ifpfd.apps.googleusercontent.com
```

### 4. Deploy Changes

1. Commit and push code changes
2. Render will automatically redeploy
3. Test both localhost and production

## Testing Checklist

- [ ] Google Cloud Console origins updated
- [ ] Render environment variable set
- [ ] Local `.env.local` file created
- [ ] Code deployed to production
- [ ] Localhost Google OAuth works
- [ ] Production Google OAuth works

## Debug Commands

Check environment variables:
```bash
npm run production-check
```

Check browser console for debug logs:
- Look for "🔍 Google Client ID Debug" logs
- Verify client ID is loaded correctly
