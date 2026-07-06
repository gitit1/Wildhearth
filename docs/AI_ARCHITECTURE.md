# AI_ARCHITECTURE.md — how the LLM layer works throughout Wildhearth

**Scope:** Part D of the build (AI integration). This document is the single
reference for where AI lives, what it does, what it costs, and how the game
stays fully playable with the AI turned off. It is grounded in the real
world-state layer (`src/systems/worldContext.ts`) and in the pitfalls VISION.md
records from shipped LLM-NPC games (Suck Up!, AI Dungeon).

Model/pricing figures are current as of the claude-api reference (cached
2026-06-24). Re-baseline with `count_tokens` before shipping.

---

## 0. Design principle zero, restated as an engineering constraint

The mechanical simulation — skills, economy, farming, fishing, foraging,
busking, seasons, needs, scripted relationships, and **authored** dialogue
trees / want-tables — is plain code and runs with **zero AI calls**. The AI
layer sits on top and only ever *enriches* what already works. Every AI feature
below ships with a **flat fallback** that is not a degraded stub — per VISION,
the AI-off experience is most of the actual game.

Three hard rules that the whole layer is built to enforce:

1. **AI is never on the tick path.** No `getWorldContext()` consumer calls the
   provider inside `main.ts`'s update loop. Calls fire only at discrete,
   player-meaningful moments (open dialogue, accept a haggle, day rollover, a
   first-snow event) behind an `await` that never blocks rendering.
2. **AI never executes free-form output.** The model returns structured JSON
   validated against a closed action set (§6). The game applies the validated
   action; it never `eval`s, never runs a tool the model named, never trusts
   prose verbatim without the validator passing.
3. **AI is never required.** A player who never enters a key has a complete
   game. A key that runs out of budget mid-session degrades silently to the
   flat fallbacks — no error modal, no broken NPC.

---

## 1. Module layout

All AI code lives under one directory so it is trivially excludable and
never leaks into gameplay systems:

```
src/systems/ai/
  index.ts            — the facade the rest of the game imports (aiSay, aiQuest, …)
  provider.ts         — transport: Anthropic browser-direct client, mock, off
  settings.ts         — AI settings state (key, monthly cap, per-feature flags), localStorage
  budget.ts           — monthly token-cap accounting + per-NPC-per-session rate limits
  cache.ts            — response cache (prompt-hash keyed) + prompt-caching breakpoints
  antiRepetition.ts   — session + persisted memory of everything an NPC has said
  schema.ts           — the closed NPCAction union + JSON schemas + game-side validator
  prompts.ts          — prompt builders (read getWorldContext(), char sheet, memory)
  deterministic.ts    — seeded deterministic mode for tests (mulberry32, like art/)
  features/
    backstory.ts        — D1  world-creation NPC backstories
    dialogue.ts         — D2  render choice-tree turns in-voice
    quests.ts           — D3  emergent quests from world state
    npcThought.ts       — D4  current-thought internal state
    storyArc.ts         — D5  play-pattern narrative threads
    eventNarration.ts   — D6  one-off world-event lines
    improvementObserver.ts — D8  meta, dev-facing HANDOFF notes
```

`antiRepetition.ts` is also feature #7, but it is infrastructure every other
feature reads from, so it lives at the top level, not under `features/`.

**Convention:** the AI layer follows the project's explicit-passing rule (like
`InteractCtx` and `WorldContextSources`). No singletons, no module-level client.
`index.ts` exposes pure-ish async functions that take an `AICtx` built fresh at
the call site:

```ts
// src/systems/ai/index.ts
export interface AICtx {
  provider: AIProvider;        // anthropic | mock | off, chosen from settings
  budget: BudgetLedger;        // localStorage-backed, see §7
  memory: AntiRepetition;      // per-NPC said-history
  world: WorldContext;         // snapshot from getWorldContext(sources, { npcId })
  npc: NPCSheet;               // the fixed character sheet
}
```

### What AI explicitly does NOT do

- **Not per-tick.** Never inside `main.ts` update/draw. Never on movement,
  collision, need decay, weather roll, or skill-gain rolls — all plain code.
- **Not the source of truth.** It never owns coins, skills, relationship
  numbers, quest state, or inventory. Those live in `economy.ts`, `skills.ts`,
  the relationship engine, etc. AI only *reads* the world snapshot and *proposes*
  actions the game validates and applies.
- **Not free-form execution.** No natural-language command interpretation, no
  "the NPC decides to give you 500 coins" unless `500` passes the reward bound
  in the validator.
- **Not a gate.** Nothing — no region, quest, sale, or relationship threshold —
  is reachable *only* through AI. Every gate has a scripted path.

---

## 2. Provider / transport layer — BYOK, browser-direct

The player brings her own Anthropic API key (BYOK, per VISION, ~$20/month
ceiling). Calls go **direct from the browser** to `api.anthropic.com`. The
Anthropic API blocks browser origins by default; the documented opt-in is a
single request header:

```ts
// src/systems/ai/provider.ts
import Anthropic from "@anthropic-ai/sdk";

function makeClient(apiKey: string) {
  return new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true, // sends anthropic-dangerous-direct-browser-access: true
  });
}
```

**CORS reality:** without `dangerouslyAllowBrowser` (which sets the
`anthropic-dangerous-direct-browser-access: true` header) the request is
rejected by the browser's same-origin policy. With it, the call succeeds
directly from the page — no server needed, matching the "browser-first,
server-optional" pillar.

**Security note (documented, not hidden):** BYOK means the key sits in the
player's own `localStorage` and browser memory. This is acceptable because it is
*her* key on *her* machine — no third party ever sees it. The Settings panel
(§8) tells her plainly: use a key with a spend limit set in the Anthropic
console, and that the key never leaves her browser except to Anthropic.

**Optional lightweight relay (not v1):** for players who would rather not hold
the key client-side, the provider interface is transport-agnostic — a thin
relay (a single Cloudflare Worker / tiny Node endpoint that injects the key and
forwards to Anthropic) can be dropped in by pointing `baseURL` at the relay and
sending the player's *session* token instead of the raw key. The game code does
not change; only `makeClient` does. This stays a documented option, not a v1
dependency.

The provider is one of three kinds, chosen from settings:

```ts
export interface AIProvider {
  readonly kind: "anthropic" | "mock" | "off";
  complete(req: AIRequest): Promise<AIResult>;   // resolves to a validated action or a miss
}
```

`kind: "off"` short-circuits to the flat fallback without any network call —
this is the default until the player opts in.

---

## 3. Grounding in the real world context

Every feature reads the live snapshot from `getWorldContext(sources, { npcId })`.
Its actual shape (from `src/systems/worldContext.ts`):

```ts
interface WorldContext {
  version: 1;
  coins: number;
  skills: Readonly<Record<string, number>>;   // e.g. { fishing: 34.2, cooking: 8.0 }
  farm: { roof: boolean; window: boolean; barn: boolean; fence: boolean };
  calendar?: { season: Season; day: number; hour: number; minute: number; phase: DayPhase };
  weather?: { state: WeatherKind; daysSinceChange: number };
  flags: Record<string, boolean>;              // active world flags
}
```

The `WorldContextQuery { npcId?: string }` field already exists for exactly this
use — Block 6 will let the snapshot carry NPC-scoped relationship/mood slices.
The AI layer is the first real consumer of that path. Until relationship state
lands, the NPC-scoped fields are supplied by the NPC engine's own state and the
relationship engine directly, merged into the prompt alongside the world
snapshot — the AI layer does not re-derive them.

`prompts.ts` serializes this snapshot to compact JSON and injects it **after**
the cached prefix (see §7), so a changing hour/weather never invalidates the
cached system prompt + character sheet.

---

## 4. Model selection & the depth/cost dial

VISION calls for an on/off toggle plus a depth-vs-cost dial. The dial maps to
model tiers. High-frequency features default to Haiku (cheap, fast, low
latency); one-time / narrative-rich features use Sonnet; Opus is reserved for
the top dial setting.

| Model | ID | In / Out per MTok | Role |
|---|---|---|---|
| Haiku 4.5 | `claude-haiku-4-5` | $1.00 / $5.00 | Default: dialogue, thought, narration |
| Sonnet 5 | `claude-sonnet-5` | $3.00 / $15.00 (intro $2/$10) | Rich: backstory, quests, story arcs |
| Opus 4.8 | `claude-opus-4-8` | $5.00 / $25.00 | "Rich" dial only, opt-in |

```
Dial "Economy":  Haiku everywhere.
Dial "Balanced": Haiku for D2/D4/D6, Sonnet for D1/D3/D5.   (default)
Dial "Rich":     Sonnet for D2/D4/D6, Opus for D1/D3/D5.
```

**Portability rule:** we steer output variety through the anti-repetition memory
and the prompt, **not** through `temperature`/`top_p` — those 400 on Opus 4.8 /
Sonnet 5. The same request shape works on every tier, so the dial is a
one-line model swap. High-frequency calls run thinking-off / low-latency
(Haiku); Sonnet/Opus narrative calls may use `output_config.effort: "low"`.

---

## 5. The structured JSON contract (closed action set)

The model never returns prose the game shows verbatim. It returns one action
from a **closed union**, matching VISION's allowed set
(say / sell / haggle-response / offer-quest / memory-update / gossip / teach):

```ts
// src/systems/ai/schema.ts
export type NPCAction =
  | { type: "say"; text: string; mood?: Mood }
  | { type: "offer_quest"; questId: string; title: string; text: string; reward: Reward }
  | { type: "haggle_response"; accept: boolean; counterOffer?: number; text: string }
  | { type: "sell"; itemId: string; price: number; text: string }
  | { type: "gossip"; aboutNpcId: string; text: string }
  | { type: "teach"; skillId: string; text: string }
  | { type: "memory_update"; note: string };
```

Requests use structured outputs so the wire shape is guaranteed:

```ts
const res = await client.messages.create({
  model, max_tokens: maxTokens,
  system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
  output_config: { format: { type: "json_schema", schema: NPC_ACTION_SCHEMA } },
  messages: [...],
});
```

**Game-side validation** (`schema.ts`) runs on every response before anything is
applied — the real backstop VISION names against players who try to break
character:

1. **Shape:** parse JSON; reject if it is not exactly one `NPCAction`.
2. **Referential integrity:** `questId` must resolve in the quest catalog;
   `aboutNpcId`/`skillId`/`itemId` must exist; `reward`/`price`/`counterOffer`
   must fall inside config bounds (`src/config.ts`).
3. **In-character / on-topic guard:** `text` length cap; reject if it leaks the
   system prompt, breaks the pre-industrial setting (no cars, phones, "AI"), or
   is flagged off-character by a cheap heuristic list.
4. **Any failure → scripted fallback.** The player sees an authored line for
   that NPC/choice, never the malformed or off-character output. The failure is
   logged (dev-facing) so bad prompts surface in `improvementObserver`.

This is why the game is safe even when a curious player tries to make the
fisherwoman discuss quantum physics: worst case, she says her scripted line.

---

## 6. The eight use cases

Each entry: prompt strategy · what it reads from context · estimated cost ·
flat fallback. Costs assume prompt caching on the stable prefix (system +
character sheet), which is a ~0.1× read after the first call of a session.

### D1 — Backstory generation
- **When:** once, at world creation, for all 10 v1 NPCs.
- **Prompt:** system rules + the NPC's fixed sheet (name, gender, age band,
  profession, personality archetype, tastes). Ask for why she came to town,
  what she misses, what she hopes for — grounded in personality + profession.
- **Reads:** the character sheet only (no world snapshot yet — world is fresh).
- **Model / cost:** Sonnet, one-time. ~800 in + ~450 out ≈ **$0.009/NPC ≈
  $0.09 for all 10**. Stored in save data (`memory_update`-style blob), then
  feeds every later dialogue. Never regenerated.
- **Fallback:** one authored backstory paragraph per personality archetype
  (4 paths × a few archetypes). Static, complete, ships in `src/data/`.

### D2 — Dialogue variation
- **When:** each dialogue turn the player picks a choice-tree option (2–3
  choices per turn per DECISIONS.md). Rate-limited per NPC per session (§7).
- **Prompt:** cached prefix (system + sheet + backstory) → then world snapshot
  (season, phase, weather) + relationship/mood slice + anti-repetition memory +
  the specific choice the player picked. Return a `say` action in-voice.
- **Reads:** `getWorldContext(sources,{npcId})` — `calendar`, `weather`,
  `skills` (Haggling changes tone), plus the NPC-scoped mood/relationship slice.
- **Model / cost:** Haiku. ~700 fresh + ~1800 cached-read in, ~120 out ≈
  **~$0.0015/turn**.
- **Fallback:** the authored line attached to that choice-tree node. The tree is
  the skeleton; AI only re-renders the words.

### D3 — Quest generation
- **When:** occasionally, when world state crosses a trigger (an NPC's low mood,
  a bumper harvest, a long dry spell, a decayed friendship). Not every session.
- **Prompt:** sheet + backstory (cached) + world snapshot + the triggering
  condition. Return an `offer_quest` action; the game validates `questId` slots
  into a template family and `reward` is in bounds.
- **Reads:** `weather.daysSinceChange` (dry spell), `skills`, `farm`, `flags`,
  `calendar.season`, plus relationship level.
- **Model / cost:** Sonnet. ~900 in + ~200 out ≈ **~$0.006/quest**, a few per
  play session at most.
- **Fallback:** the authored/aspiration/tutorial quests already feed the same
  quest-log UI (DECISIONS.md: hybrid quests). With AI off, only proactive
  emergent offers disappear; scripted quests remain.

### D4 — NPC internal state (current thought)
- **When:** refreshed cheaply at day rollover (batched across NPCs) and when the
  player approaches an NPC whose thought is stale.
- **Prompt:** sheet + world snapshot + recent events for that NPC → one short
  "current thought": what she wants now, what she's worried about, what she
  noticed. Stored on the NPC entity; drives spontaneous comments ("you look
  tired") and what she raises in dialogue.
- **Reads:** `calendar`, `weather`, `flags`, relationship/mood slice, and the
  player's low-need warnings (needs engine) so she can react to them.
- **Model / cost:** Haiku, batched — all 10 NPCs in one call at day-start ≈
  **~$0.003/day**; single refresh ≈ $0.0008.
- **Fallback:** a small want-table per personality archetype selects a canned
  thought by season/weather/relationship tier. Deterministic, no call.

### D5 — Story arc weaving
- **When:** end of session / day rollover, reading the play-pattern log
  (who she visits, when, what she completes).
- **Prompt:** a compact play-history summary + relationship states + completed
  quests → suggest at most one emergent thread ("she visits the fisherwoman
  every Friday; the fisherwoman starts saving her best catch"). Output is a
  `memory_update` proposing a flag the relationship engine may set — never a
  direct state write.
- **Reads:** `flags`, `calendar`, relationship snapshots, a separate
  play-pattern log (new, small, in `ai/` — a ring buffer of recent interactions).
- **Model / cost:** Sonnet, ~once per session. ~1200 in + ~250 out ≈
  **~$0.01/session**.
- **Fallback:** none needed — with AI off there simply are no discovered
  threads; scripted heart-events (relationship engine) still fire on thresholds.

### D6 — World-event narration
- **When:** a discrete event fires — first snow, a rare fish caught, an NPC's
  birthday, a relationship crossing a threshold.
- **Prompt:** sheet-light (event + minimal world snapshot) → one narration line,
  never templated, remembered by anti-repetition so a second first-snow reads
  differently.
- **Reads:** `weather.state`, `calendar.season`, the event payload, and the
  anti-repetition store.
- **Model / cost:** Haiku, short. ~400 in + ~80 out ≈ **~$0.001/event**, a
  handful per hour.
- **Fallback:** a pool of 3–5 authored lines per event type, picked by seeded
  RNG — VISION's own point that a small set of well-written lines still reads
  alive.

### D7 — Anti-repetition memory
- **What:** not a call — the store (`antiRepetition.ts`) every generative
  feature reads and writes. Keeps, per NPC: a rolling set of recent line
  fingerprints (hashes + short gists) for the session, plus a persisted set of
  "stories already told" across sessions.
- **How it feeds calls:** the prompt includes a "do not repeat these" block
  (recent gists, ~200–500 tokens) so the same choice yields different phrasing
  and no story is retold. Post-generation, a near-duplicate check (token-set
  overlap) rejects a line too close to a prior one and retries once, then falls
  back.
- **Cost:** adds the memory tokens to each generative call (already included in
  the D2/D6 estimates). Persisted via the `economy.ts` `SAVE_KEY`-versioned
  localStorage pattern.
- **Fallback:** with AI off, the authored pools are simply cycled without
  repetition by seeded RNG.

### D8 — Improvement observation (meta, dev-facing)
- **When:** end of session, off the player's path. **Dev-facing only** — its
  output goes to a HANDOFF-style log, never shown to the player.
- **Prompt:** an aggregated play-pattern summary → flags like "player skipped
  fishing 5 sessions — this hook may be weak."
- **Reads:** the play-pattern log + skill deltas over time.
- **Model / cost:** Sonnet, ~once per session, ~$0.01. **Off by default** — the
  player is spending her own tokens, so this only runs when she (or a developer
  build) opts in.
- **Fallback:** disabled = nothing happens.

### Per-hour cost envelope
A busy hour: ~5 NPCs × 3 dialogue turns (15 × $0.0015), ~6 event narrations
(× $0.001), one thought refresh batch ($0.003), one quest ($0.006). ≈
**$0.04/hour on the Balanced dial**, dominated by dialogue. At the $20/month
ceiling that is ~500 hours — the cap exists to protect against a runaway loop,
not because normal play is expensive. Backstory ($0.09) and story-arc/session
costs are one-time or once-per-session and negligible.

---

## 7. Budget discipline

Three independent mechanisms, all local, no server:

**1. Monthly token cap (localStorage).** `budget.ts` keeps a
`SAVE_KEY`-versioned ledger `{ monthKey, inputTokens, outputTokens, estUSD }`
(same persistence pattern as `economy.ts`). Every `AIResult.usage` is added
after each call. Before a call, `budget.ts` checks the projected cost against
the player's configured monthly cap (default derived from ~$20). Over cap →
the provider returns a miss and the feature uses its flat fallback. The player
sees a small HUD note ("AI budget reached for this month — NPCs are running on
scripted lines"), never an error.

**2. Rate limit per NPC per session.** VISION's explicit lesson: a curious
player rapid-firing dialogue spikes cost. `budget.ts` tracks calls-per-NPC for
the current session and enforces a config cap (e.g. N dialogue calls per NPC per
session; a cooldown between event narrations). Over the limit → fallback line.
This also prevents a single NPC from dominating spend.

**3. Caching, two layers.**
- *Prompt caching* (Anthropic-side): the system prompt + character sheet +
  backstory form a stable cached prefix (`cache_control: ephemeral`). The
  volatile world snapshot, memory, and player choice go *after* the breakpoint,
  so an hour/weather change never invalidates the ~1800-token prefix. Cached
  reads are ~0.1× — this is what makes dialogue ~$0.0015 instead of ~$0.003.
- *Response caching* (`cache.ts`, game-side): identical `(feature, npc,
  choice, coarse-world-bucket)` requests within a short window return the last
  result instead of re-calling — cheap protection against a player mashing the
  same choice. Anti-repetition still varies output across *distinct* turns.

---

## 8. Settings → AI section (player-facing UX)

Built with the reusable panel chrome, in `src/ui/` reading `ai/settings.ts`:

- **Master toggle:** AI on/off. Off = `provider.kind = "off"`, zero calls,
  pure scripted game. Default off until she opts in.
- **API key input (masked):** password-style field, shows only last 4 chars.
  Stored in `localStorage`. Copy explains: the key stays in her browser, is sent
  only to Anthropic, and she should set a spend limit in the Anthropic console.
  A "test key" button makes one tiny `max_tokens`-small call to confirm it works.
- **Monthly token / cost cap:** a number field (default ≈ $20 equivalent) that
  drives `budget.ts`. A read-out shows this month's spend so far.
- **Depth/cost dial:** Economy / Balanced / Rich (the model tiers, §4).
- **Per-feature checkboxes:** one per Part D feature (backstory, dialogue,
  quests, NPC thoughts, story arcs, event narration). A player can enable only
  dialogue and leave the rest scripted. Improvement-observation (D8) is a
  separate dev-facing checkbox, off by default.
- **Relay URL (advanced, hidden by default):** optional field to route calls
  through a relay instead of direct-from-browser, for players who prefer not to
  store the key client-side.

---

## 9. Testing without burning tokens

**Mock provider (`deterministic.ts` + `provider.ts` `kind: "mock"`).** A drop-in
`AIProvider` that returns canned, schema-valid `NPCAction`s. Because everything
routes through the `AIProvider` interface and `AICtx`, unit and integration
tests inject the mock and exercise the *full* validation → apply → fallback path
with **zero network and zero tokens**. Tests assert:
- valid mock action → applied correctly;
- deliberately malformed mock output → validator rejects → scripted fallback
  used (the critical safety path);
- rate-limit and budget-cap paths → fallback used, no call attempted.

**Deterministic mode.** The mock uses the project's `mulberry32` fixed-seed RNG
(same convention as `src/art/`) so a given `(feature, npc, seed)` always yields
the same action — snapshot tests are stable. The anti-repetition store is also
seedable, so dedup logic is testable without randomness.

**A tiny live smoke test** (one real Haiku call, guarded behind an env flag and
run manually) confirms the browser-direct header and structured-outputs schema
still parse against the live API — but it is never part of the normal `npm run
build` / CI, so day-to-day work never spends the owner's tokens.

---

## 10. v1 → v5 evolution of the AI layer

- **v1 — Enrichment on 10 independent NPCs.** BYOK, browser-direct, Haiku
  default. D1 backstory, D2 dialogue variation, D6 event narration, D4 thoughts
  live. D3 quests and D5 arcs behind their checkboxes. Closed action set, full
  validation, every feature has a flat fallback. Budget cap + per-NPC rate
  limits + caching from day one. The game is 100% playable with the master
  toggle off.
- **v2 — Town opens.** More NPCs, merchant-specific dialogue; `sell` and the
  Haggling-tone hook (`skills.haggling` already in the snapshot) become active.
  Response cache warms across an in-town day. Relay option documented for
  players who want it.
- **v3 — Deep relationships & haggling.** `haggle_response`, `teach`, and
  `gossip` actions go live as the relationship engine, Haggling skill, and
  teacher-NPCs land. Story-arc weaving (D5) matures; heart-events carry
  AI-flavored variants over the scripted ones.
- **v4 — Inter-NPC life.** NPC-to-NPC relationships and rumor propagation:
  `gossip` actions feed a shared town memory. Backstories reference each other.
  Budget model extends to town-wide batched thought refreshes.
- **v5 — Product-complete.** 50+ NPCs, families, marriage/children, seasonal
  and weather-reactive schedules feeding richer snapshots (the
  `WorldContextQuery` npc slice fully populated). Dial's "Rich" (Opus) tier for
  players who want maximum depth. D8 improvement-observation matured into a
  proper analytics loop for the developer. Throughout, principle zero holds: the
  entire game still runs with AI off.

---

## Open judgment calls for the owner

- **Default monthly cap value** — set at ~$20 equivalent from VISION; confirm
  the exact number and whether it is expressed in dollars or tokens in the UI.
- **Improvement-observation (D8) default** — proposed **off** (it spends her
  tokens for developer benefit). Confirm.
- **Relay** — kept as a documented, non-v1 option. Confirm we are content
  shipping v1 as pure browser-direct BYOK with the key in `localStorage`.
- **Backstory permanence** — proposed generated once and frozen in the save.
  Confirm we never offer a "reroll backstory" (cheap, but changes canon).
