---
name: gpt5-responses-api
description: OpenAI reasoning models (gpt-5.x, o1, o3) need the Responses API and reject chat-completions sampling params
metadata:
  type: architecture
---

OpenAI reasoning models — `gpt-5.x`, `o1`, `o3` — must be called through the **Responses API** (`openai.responses.create({ model, instructions, input, max_output_tokens })`, read `response.output_text`), not `chat.completions.create`. They also reject the classic sampling params `temperature`, `top_p`, `frequency_penalty`, `presence_penalty`, and use `max_completion_tokens` instead of `max_tokens`.

**Where this lives in code:** `src/services/ai.ts` → `callApi()` branches on `isReasoningModel(model)` (exported pure fn, prefix match on `o1`/`o3`/`gpt-5`). Reasoning → Responses API; everything else → `chat.completions.create` with the sampling params. Groq and Anthropic are unaffected (their branches use their own APIs).

**Why it matters:** sending sampling params or hitting chat-completions with a gpt-5.x model returns a 400; combined with an old SDK (see [[node24-sdk-premature-close]]) the surfaced error is a misleading `Premature close` rather than a clean 400, which sends you debugging the wrong layer.

**How to apply:** adding a new OpenAI reasoning model = extend the prefix list in `isReasoningModel`. Keep the two endpoint paths separate; do not merge reasoning models back into the chat-completions call.
