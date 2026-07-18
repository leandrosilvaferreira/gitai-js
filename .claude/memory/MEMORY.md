# Memory index

- [Release pipeline](release-pipeline.md) — **publishing to npm? invoke the `release` skill first.** CI is the sole publisher; unscoped `gitai` is someone else's package; green CI does NOT prove the publish landed (v1.0.8 silently failed).
- [GPT-5.x Responses API](gpt5-responses-api.md) — gpt-5.x/o1/o3 need openai.responses.create and reject chat-completions sampling params; lives in ai.ts isReasoningModel().
- [Permission bypass two gates](architecture-permission-bypass-two-gates.md) — `.claude/settings.json` bypassPermissions alone does nothing; needs editor-level `claudeCode.allowDangerouslySkipPermissions` too.
- [import-x/no-cycle needs extensions setting](architecture-import-x-no-cycle-needs-extensions-setting.md) — TS resolver alone isn't enough; `import-x/extensions` must include `.ts` or ExportMap silently drops every resolved file with zero errors.
