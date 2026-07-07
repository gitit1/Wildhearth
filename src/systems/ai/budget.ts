import { AI_BUDGET_KEY } from "../../config";
import type { AiUsage } from "./provider";

/**
 * Monthly spend ledger (AI_ARCHITECTURE §7.1). Persisted on its OWN key — never
 * in saves.ts's GAME_KEYS — because spend is per-machine, not per-save-slot, and
 * must survive a New Game. `canSpend` gates every call against the player's
 * configured monthly token budget; the ledger resets naturally on a month
 * change (the stored monthKey no longer matches "now").
 *
 * A budget of 0 means "no cap" (unlimited) rather than "spend nothing" — a fresh
 * or zeroed value must never brick the feature.
 */

interface LedgerRecord {
  version: 1;
  monthKey: string;      // "2026-07"
  inputTokens: number;
  outputTokens: number;
  callCount: number;
}

export interface BudgetSnapshot {
  monthKey: string;
  inputTokens: number;
  outputTokens: number;
  callCount: number;
  spent: number;         // input + output
  limit: number;         // 0 = unlimited
  remaining: number;     // Infinity when unlimited
}

export interface Budget {
  /** Would this estimated spend stay within the monthly cap? */
  canSpend(estimateTokens: number): boolean;
  /** Fold a completed call's real usage into the ledger and persist. */
  record(usage: AiUsage): void;
  snapshot(): BudgetSnapshot;
}

function monthKeyOf(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function loadRecord(monthKey: string): LedgerRecord {
  try {
    const raw = localStorage.getItem(AI_BUDGET_KEY);
    if (raw) {
      const r = JSON.parse(raw) as Partial<LedgerRecord>;
      if (r && r.monthKey === monthKey) {
        return {
          version: 1, monthKey,
          inputTokens: num(r.inputTokens), outputTokens: num(r.outputTokens), callCount: num(r.callCount),
        };
      }
    }
  } catch { /* corrupt / private mode → fresh */ }
  return { version: 1, monthKey, inputTokens: 0, outputTokens: 0, callCount: 0 };
}

function num(v: unknown): number { return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0; }

function persist(rec: LedgerRecord) {
  try { localStorage.setItem(AI_BUDGET_KEY, JSON.stringify(rec)); } catch { /* private mode */ }
}

/** monthlyTokenBudget: the cap from aiSettings (0 = unlimited). `now` is
 *  injectable so tests can cross a month boundary deterministically. */
export function createBudget(monthlyTokenBudget: number, now: () => number = Date.now): Budget {
  let rec = loadRecord(monthKeyOf(now()));

  const rollIfNewMonth = () => {
    const mk = monthKeyOf(now());
    if (mk !== rec.monthKey) rec = { version: 1, monthKey: mk, inputTokens: 0, outputTokens: 0, callCount: 0 };
  };

  const limit = Math.max(0, Math.round(monthlyTokenBudget));

  return {
    canSpend(estimateTokens: number): boolean {
      rollIfNewMonth();
      if (limit <= 0) return true; // unlimited
      const spent = rec.inputTokens + rec.outputTokens;
      return spent + Math.max(0, estimateTokens) <= limit;
    },
    record(usage: AiUsage): void {
      rollIfNewMonth();
      rec.inputTokens += Math.max(0, usage.inputTokens || 0);
      rec.outputTokens += Math.max(0, usage.outputTokens || 0);
      rec.callCount += 1;
      persist(rec);
    },
    snapshot(): BudgetSnapshot {
      rollIfNewMonth();
      const spent = rec.inputTokens + rec.outputTokens;
      return {
        monthKey: rec.monthKey, inputTokens: rec.inputTokens, outputTokens: rec.outputTokens,
        callCount: rec.callCount, spent, limit,
        remaining: limit <= 0 ? Infinity : Math.max(0, limit - spent),
      };
    },
  };
}
