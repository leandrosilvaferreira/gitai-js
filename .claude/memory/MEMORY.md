# Memory index

- [Release pipeline](release-pipeline.md) — CI creates the GitHub Release; AI notes travel via annotated tag (no API key in CI); version.ts `name='gitai'` is the CLI name, not the npm package.
- [GPT-5.x Responses API](gpt5-responses-api.md) — gpt-5.x/o1/o3 need openai.responses.create and reject chat-completions sampling params; lives in ai.ts isReasoningModel().
