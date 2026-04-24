# Proxy Guide

## Purpose
- Explain how local server-side Gemini requests reach the internet on restricted networks
- Provide a repeatable checklist when Gemini calls fail before returning a model response

## Current implementation
- The server now supports outbound proxy routing for Node-side Gemini calls
- Proxy selection order:
  1. `LOCAL_PROXY_URL`
  2. `HTTPS_PROXY` / `HTTP_PROXY` / `ALL_PROXY`
  3. On Windows only: auto-detect the user-level system proxy from Internet Settings

This proxy support is applied only to server-side outbound model traffic.

## Recommended local setup

### Option 1: Let Windows auto-detection work
Use this when you already have a desktop proxy client configured as the system proxy.

Checklist:
- Confirm the proxy client is running
- Confirm Windows Internet Settings has proxy enabled
- Start the app normally:

```powershell
npm.cmd run dev
```

### Option 2: Set an explicit local proxy
Use this when auto-detection is unreliable or you want a predictable setup.

Add to `.env.local`:

```env
LOCAL_PROXY_URL=http://127.0.0.1:7897
```

Then restart the local server:

```powershell
npm.cmd run dev
```

## Symptoms and interpretation

### Symptom: `fetch failed sending request`
Meaning:
- The server reached the Gemini SDK call
- The outbound network path is failing before a valid API response is returned

Check:
- Whether the local proxy process is running
- Whether the proxy port is open
- Whether direct access to `generativelanguage.googleapis.com:443` is blocked

### Symptom: `API_KEY_INVALID`
Meaning:
- Network access to Gemini is working
- The current blocker is now the API key itself

This is a better state than `fetch failed`, because it proves the network path is no longer the blocker.

## Useful checks

### Check the local proxy port
```powershell
Test-NetConnection 127.0.0.1 -Port 7897
```

### Check direct network access without proxy
```powershell
curl.exe -I https://generativelanguage.googleapis.com
```

If this fails, direct internet access is blocked or filtered.

### Check access through the local proxy
```powershell
curl.exe -x http://127.0.0.1:7897 -k -I https://generativelanguage.googleapis.com
```

If this returns an HTTP response from Google, the proxy route is working.

### Check whether the app can auto-detect the system proxy
Expected behavior on Windows:
- No explicit `LOCAL_PROXY_URL`
- App starts
- Gemini no longer fails with raw network transport errors

## Validation criteria

Network layer is considered fixed when:
- Gemini calls no longer fail with `fetch failed sending request`
- The server receives a real upstream response from Google

That upstream response may still be a business error such as:
- `API_KEY_INVALID`
- `PERMISSION_DENIED`
- quota or billing related errors

Those are no longer proxy/network blockers.

## Current known local result
- This machine has a local proxy service available
- The app can auto-detect and use the Windows user-level proxy
- After proxy routing is applied, Gemini requests advance past the network layer
- The next blocker becomes the validity of the provided API key
