# Codex (GPT-5.2) の実行結果

**Findings**
- Critical: Missing CSRF/state verification details for LINE OAuth. `state` must be generated per request, stored server-side (or signed), and verified in callback to prevent login CSRF; plan doesn’t mention storage or verification.
- Critical: JWT cookie security attributes not specified. Must set `HttpOnly`, `Secure` (prod), `SameSite=Lax` or `Strict`, `Path=/`, and consider `Max-Age`/`Expires`. Missing increases XSS/session fixation risk.
- High: No refresh/rotation strategy. If JWT is long-lived and stored in cookie, compromise = long access; if short-lived, you need refresh flow or re-login UX. Plan doesn’t specify TTL or rotation.
- High: ID token validation requirements not spelled out. LINE ID token must be verified with issuer/audience/nonce, signature, and `exp`. Plan only mentions `verifyLineToken` but not required claims.
- High: OpenId as primary user ID could change if LINE account deleted/recreated; consider stable internal UUID and map `openId` to it to avoid orphan data and enable future auth methods.
- Medium: Admin auth based on `OWNER_OPEN_ID` in env risks manual mistakes and hard‑to‑audit access. Consider a DB role table, or at least validate on startup and log mismatches.
- Medium: Logout route should also revoke LINE access token if stored and clear cookie with same attributes used on set; plan doesn’t mention token revocation.
- Medium: `getLineProfile` call likely needs access token; if token isn’t stored or refreshed, profile fetch failures will break user data updates. Clarify what’s persisted.
- Low: `loginMethod` default “line” but no plan for migration/backfill or uniqueness constraints when switching existing supabase users.
- Low: `lastSignedIn` uses `defaultNow()` but should be updated on every login; default alone won’t update.

**Open questions / assumptions**
- Are you storing LINE access/refresh tokens? If yes, need encryption at rest and rotation; if no, what data are you using to populate user profile?
- How will you handle email scope unavailability or user denial (LINE often omits email)?
- Do you need multi-device sessions or a single session per user? That affects token invalidation strategy.

**Change summary (what’s solid)**
- Plan is directionally fine: replace Supabase Auth with LINE Login + JWT, update middleware, and centralize auth/session logic under `src/lib/auth`.

**Suggested next steps**
1) Specify OAuth state/nonce storage + verification strategy for LINE callback.  
2) Define JWT cookie attributes and TTL/rotation policy.  
3) Document ID token validation requirements and claim checks.  
4) Decide on internal user ID vs `openId` mapping for future‑proofing.
