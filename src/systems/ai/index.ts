/**
 * AI foundation (Part D commit 1) — the one directory the rest of the game
 * imports for anything AI. See docs/AI_ARCHITECTURE.md. Infrastructure only:
 * no gameplay feature calls this yet. With the master toggle off (the default)
 * the whole layer is inert.
 */
export { createAiCtx } from "./aiCtx";
export type {
  AiCtx, AiCtxOptions, AiRequestSpec, AiText, AiFail, AiTextResult,
  AiActionOk, AiActionResult,
} from "./aiCtx";
export { aiMockRequested } from "./provider";
export type { AiProviderKind, AiErrorKind, AiUsage } from "./provider";
export {
  validateNpcAction, validateText, sanitizeText, looksOffCharacter,
} from "./schema";
export type { NpcAction, NpcActionType, NpcMood, ActionRefs, Validation } from "./schema";
