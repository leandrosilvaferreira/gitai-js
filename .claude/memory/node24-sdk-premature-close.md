---
name: node24-sdk-premature-close
description: "Premature close" FetchError from AI SDK calls on Node 24 means the SDK is too old (node-fetch), not a bad API key
metadata:
  type: architecture
---

`FetchError: Invalid response body ... Premature close` on EVERY OpenAI/Anthropic/Groq SDK request under Node 24 is caused by the SDK shipping the legacy `node-fetch@^2.6.7` shim, which breaks on Node 24's undici. It is NOT an API key, balance, model, or endpoint problem.

**Why hard to spot:** the error names the response body / network, the API key validates fine, and an identical `curl` request succeeds — so the obvious suspects (key, balance, model availability) all look healthy. The only tell is "SDK fails but curl works", plus the `FetchError` class (which only exists in node-fetch, not native fetch).

**Diagnostic:** `curl https://api.openai.com/v1/models -H "Authorization: Bearer $KEY"` → 200, but `client.chat.completions.create(...)` throws `Premature close`. Confirms the SDK fetch layer, not the credentials.

**Fix:** upgrade to native-fetch SDK majors. This repo went `openai 4.104→6.44`, `@anthropic-ai/sdk 0.36→0.105`, `groq-sdk 0.15→1.3`. All three old versions depended on `node-fetch@^2.6.7` — the same shim — so all three providers fail identically; upgrade them together. Check a dep's `node-fetch` presence with `node -e "console.log(require('<pkg>/package.json').dependencies)"`.

**How to apply:** when any provider call dies with "Premature close" / `FetchError`, check Node version and the SDK's deps before touching `~/.gitai` config or the API key. See [[gpt5-responses-api]] for the separate gpt-5.x endpoint requirement.
