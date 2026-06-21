# Cloudflare Manual Cutover Gate (Dashboard-Only)

This gate is **manual and dashboard-only**. Complete each step in order and do not continue deploy/cutover until all checks pass.

## Locked host map (freeze before changes)

| Surface | Locked target |
| --- | --- |
| `goldshore.ai` | `gs-web` (Pages) |
| `gw.goldshore.ai` | `gs-platform` (Worker custom domain) |
| `api.goldshore.ai` | `gs-api` (Worker custom domain) |
| `agent.goldshore.ai` | `gs-agent` (Worker custom domain) |
| `goldshore.org` | `goldshore-web-router` + `goldshore-org-pages` (existing) |
| `api.goldshore.org` | `goldshore-api` (existing canonical `.org` API) |

> Decision freeze: use `api.goldshore.ai` for the `.ai` API cutover target. Do not leave both `api.goldshore.ai` and `api.goldshore.org` as candidates.

## Execution order

1. **Cloudflare Access policy fix (highest risk, first)**
   - Locate the active Access app policy.
   - Replace policy from:
     - `non_identity` + `everyone`
   - To:
     - `identity` + allowed email domain `@goldshore.ai`
   - Verify arbitrary unauthenticated entry is blocked.

2. **Delete stale Access applications (after policy correction)**
   - Remove duplicate stale apps:
     - `gs-mail` ×2
     - `gs-platform` ×2
     - `gs-api` ×2
     - `goldshore-core` ×2
     - `banproof-me` ×2
   - Keep the active/validated app only.

3. **Attach Worker custom domains**
   - `gs-platform` → `gw.goldshore.ai`
   - `gs-api` → `api.goldshore.ai`
   - `gs-agent` → `agent.goldshore.ai`

   After each binding:
   - Confirm hostname is attached to the intended Worker.
   - Confirm hostname is not attached anywhere else.
   - Confirm `/health` responds after binding.

4. **Disconnect redundant `goldshore-ai` build**
   - In Workers/Pages build settings for `goldshore-ai`, disconnect Git build.
   - Do **not** delete the Worker yet unless dependency checks confirm nothing still relies on it.

5. **Fix `goldshore.org` mail DNS**
   - SPF TXT at apex:
     - `v=spf1 include:_spf.mx.cloudflare.net ~all`
   - DMARC TXT at `_dmarc`:
     - `v=DMARC1; p=none; rua=mailto:<reporting-address>`
   - If a dedicated mailbox is not ready, use the standardized Cloudflare-generated reporting address.

6. **Fix `armsway.com` mail routing**
   - Add Cloudflare Email Routing MX records with Cloudflare-required priorities:
     - `route1.mx.cloudflare.net`
     - `route2.mx.cloudflare.net`
     - `route3.mx.cloudflare.net`
   - Ensure a valid SPF record exists.
   - Remove conflicting legacy MX records.

7. **Verification checks**
   - Access:
     - Re-test protected surfaces for denied arbitrary access.
   - Workers:
     - `curl -I https://gw.goldshore.ai/health`
     - `curl -I https://api.goldshore.ai/health`
     - `curl -I https://agent.goldshore.ai/health`
   - DNS/mail:
     - Verify TXT/MX records resolve publicly after propagation.

8. **Only then continue deploy/cutover**
   - Do not proceed to release/cutover until steps 1–7 are complete and validated.
