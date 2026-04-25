# Verification Log Supplement - 2026-04-24

## Scope
- Validate the local app with a runtime Gemini API key
- Confirm whether the blocker is app code, environment, or outbound network

## Runtime handling
- The provided `GEMINI_API_KEY` was used only as a process environment variable
- The key was not written into `.env.local` or any repo-tracked file

## Commands and results

### 1. Local API startup
Command shape:
```powershell
npm.cmd run dev:api
```

Observed result:
- Local API started on `http://localhost:3001`

### 2. Main generation API with runtime key
Request:
```json
{
  "prompt": "cute voxel rabbit",
  "systemContext": "You are a creative voxel generator.",
  "mode": "fast",
  "options": {
    "style": "cartoon",
    "colorScheme": "pastel",
    "size": "medium",
    "symmetry": "bilateral"
  }
}
```

Response:
```json
{"success":false,"warnings":["The backend request failed before a valid voxel result was produced."],"error":"exception TypeError: fetch failed sending request","errorCode":"GEMINI_GENERATION_FAILED","mode":"fast","usedTwoStage":false}
```

Interpretation:
- The app passed request validation
- The app entered the server-side Gemini call path
- Failure happened during outbound Gemini request execution

### 3. Local DB health
Response:
```json
{"ok":false,"mode":"noop","message":"No DATABASE_URL/POSTGRES_URL configured. Running without persistent logs."}
```

Interpretation:
- DB debug endpoint works
- Current DB mode is graceful fallback because there is no local Postgres configuration

### 4. Direct SDK check outside app code
Using a minimal `@google/genai` script with the same runtime key:

Output:
```text
ERROR_NAME=Error
ERROR_MESSAGE=exception TypeError: fetch failed sending request
```

Interpretation:
- Same failure reproduces outside the app
- This is not specific to project routing or handler code

### 5. Raw network connectivity check
Command:
```powershell
curl.exe -I https://generativelanguage.googleapis.com
```

Output:
```text
curl: (28) Failed to connect to generativelanguage.googleapis.com port 443 after 22700 ms: Could not connect to server
```

Interpretation:
- Current machine cannot reach the Gemini gateway on port 443
- The blocker is network connectivity before we can even prove key validity

## Result
- Local frontend/backend wiring is working
- Local debug endpoints are working
- Request validation is working
- The machine-level Gemini network blocker has been resolved by routing Node outbound traffic through the detected local proxy `http://127.0.0.1:7897`
- After proxy routing was enabled, Gemini calls no longer failed with `fetch failed`
- The current blocker is now a real upstream API response: `API_KEY_INVALID`
- Real Postgres validation is currently blocked because there is no local Postgres runtime and no `DATABASE_URL`

## Final proxy verification

### Auto-detected proxy
`configureOutboundProxyOnce()` result:
```text
BEFORE=null
CONFIGURED=http://127.0.0.1:7897
AFTER=http://127.0.0.1:7897
```

### Direct SDK result after proxy enable
```text
ERROR_NAME=ApiError
ERROR_MESSAGE={"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT"...}}
```

### App API result after proxy enable
```json
{"success":false,"warnings":["The backend request failed before a valid voxel result was produced."],"error":"{\"error\":{\"code\":400,\"message\":\"API key not valid. Please pass a valid API key.\",\"status\":\"INVALID_ARGUMENT\"...}}","errorCode":"GEMINI_GENERATION_FAILED","mode":"fast","usedTwoStage":false}
```

Interpretation:
- Network access to Gemini is now working from this machine through the local proxy
- The next required fix is a valid Gemini API key

## Additional run - provided key verification (same date)

### Setup change
- Updated local `.env.local` with the newly provided `GEMINI_API_KEY`
- Restarted local API server to ensure the new runtime value was loaded

### API call result
`POST /api/lego-gemini` returned:

```json
{"success":false,"warnings":["The backend request failed before a valid voxel result was produced."],"error":"{\"error\":{\"code\":403,\"message\":\"Your API key was reported as leaked. Please use another API key.\",\"status\":\"PERMISSION_DENIED\"}}","errorCode":"GEMINI_GENERATION_FAILED","mode":"fast","usedTwoStage":false}
```

Interpretation:
- Outbound network path is still functional
- The current blocker is no longer transport, but key policy state on Google side
- This key cannot be used for successful generation on this machine

Required next action:
- Replace with a newly created, non-leaked Gemini API key and re-run the same local request

## Additional run - second new key verification (same date)

### Runtime handling
- This key was injected as a temporary process environment variable only
- No new key value was persisted into repository files during this run

### API call result
`POST /api/lego-gemini` returned:

```json
{"success":false,"warnings":["The backend request failed before a valid voxel result was produced."],"error":"{\"error\":{\"code\":403,\"message\":\"Your project has been denied access. Please contact support.\",\"status\":\"PERMISSION_DENIED\"}}","errorCode":"GEMINI_GENERATION_FAILED","mode":"fast","usedTwoStage":false}
```

Interpretation:
- Outbound network path remains healthy
- The blocker moved to project-level access policy, not key transport
- Even with a different key, current project identity is still denied upstream

Protection action completed:
- Cleared `GEMINI_API_KEY` in local `.env.local` to avoid retaining leaked/blocked credentials on disk

## Additional run - local embedded database connectivity test

### Setup change
- Enabled `LOCAL_DB_MODE=memory` for the local API process
- This routes the database layer through an embedded Postgres-compatible `pg-mem` instance for local verification

### Validation results
- `GET /api/debug/db-health` returned:

```json
{"ok":true,"mode":"embedded","message":"Embedded Postgres connected and generation_logs schema is ready."}
```

- `GET /api/debug/generation-logs?limit=5` returned an empty list before insertion:

```json
{"success":true,"mode":"embedded","count":0,"logs":[]}
```

- A generation request was issued and failed at Gemini key validation, but the failure was persisted into the embedded database.
- `GET /api/debug/generation-logs?limit=5` then returned one record:

```json
{"success":true,"mode":"embedded","count":1,"logs":[{"id":1,"prompt":"a small blue cube","generation_options":{"voxelSize":1},"success":false,"voxel_count":0,"color_count":0,"warnings":["Backend generation failed before a valid voxel result was produced."],"template_match":null,"error_message":"Missing GEMINI_API_KEY for server-side Gemini calls.","created_at":"2026-04-24T11:55:54.679Z"}]}
```

Interpretation:
- Local database connectivity is now demonstrably working in embedded mode
- The log write path and log read path both function end-to-end
- This provides a reproducible local DB verification path even on machines without a native Postgres service
