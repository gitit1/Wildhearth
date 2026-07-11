import { SAVE_KEY, SKILLS_KEY, RENOVATION_KEY, META_KEY, CALENDAR_KEY, WEATHER_KEY, WORLD_FLAGS_KEY, LIVESTOCK_KEY, PLOTS_KEY, GARDEN_KEY, COLLECTIONS_KEY, MEMORIES_KEY, NEEDS_KEY, RELATIONSHIPS_KEY, SLOT_KEY, GUIDANCE_KEY, QUESTS_KEY, STORAGE_KEY, PRODUCE_KEY, CUSTOMERS_KEY, REPUTATION_KEY, DISCOVERY_KEY, TRANSPORT_KEY, TEACHING_KEY, AI_ANTIREP_KEY, AI_BACKSTORY_KEY, AI_ARCS_KEY, AI_DEVNOTES_KEY } from "../config";

/**
 * Persistence hub (Step 9 save hardening). Each store keeps its own versioned
 * record under its own key (economy, skills, renovation, meta); this module is
 * the one place that knows the whole *set*, so "is there a game to continue?"
 * and "wipe the game for a New Game" don't have to be reinvented — or, worse,
 * kept in sync by hand — at every call site.
 *
 * Player settings (the guided toggle) and UI panel layout are deliberately NOT
 * game state: a New Game keeps them, so their keys are absent here.
 */

// The keys that together make up one saved game. The slot manifest
// (saveSlots.ts) rides along here too — a New Game should look un-continuable,
// not show a stale "last saved" stamp from the life that just ended.
// The AI feature stores (anti-repetition, generated backstories, story-arc
// tracker, dev observations) are per-playthrough, so they ride along here — a
// New Game meets everyone fresh. The AI budget ledger + response cache are
// per-machine and deliberately NOT here.
const GAME_KEYS = [SAVE_KEY, SKILLS_KEY, RENOVATION_KEY, META_KEY, CALENDAR_KEY, WEATHER_KEY, WORLD_FLAGS_KEY, LIVESTOCK_KEY, PLOTS_KEY, GARDEN_KEY, COLLECTIONS_KEY, MEMORIES_KEY, NEEDS_KEY, RELATIONSHIPS_KEY, SLOT_KEY, GUIDANCE_KEY, QUESTS_KEY, STORAGE_KEY, PRODUCE_KEY, CUSTOMERS_KEY, REPUTATION_KEY, DISCOVERY_KEY, TRANSPORT_KEY, TEACHING_KEY, AI_ANTIREP_KEY, AI_BACKSTORY_KEY, AI_ARCS_KEY, AI_DEVNOTES_KEY];

/**
 * True when there's a continuable game. Anchored on the economy save (the
 * store every playthrough writes) and requires it to actually parse — a
 * present-but-corrupt blob should offer New Game, not a broken Continue.
 */
export function hasSavedGame(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d: unknown = JSON.parse(raw);
    return !!d && typeof d === "object";
  } catch {
    return false;
  }
}

/**
 * Removes every game-state key so a New Game starts from nothing — including
 * any store whose in-memory object isn't explicitly re-seeded by the caller,
 * so adding a future store to GAME_KEYS is all it takes to have New Game clear
 * it. Settings and UI layout are left untouched.
 */
export function clearSavedGame() {
  for (const k of GAME_KEYS) {
    try { localStorage.removeItem(k); } catch { /* private mode */ }
  }
}
