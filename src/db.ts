import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import type { Database } from "./database.types.js";
import type { SlotMachineResult } from "./core/game.js";

let supabase: SupabaseClient<Database> | null = null;

function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabase) {
    const url = process.env["SUPABASE_URL"];
    const anonKey = process.env["SUPABASE_ANON_KEY"];
    if (!url || !anonKey) {
      throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set");
    }
    supabase = createClient<Database>(url, anonKey, {
      auth: { persistSession: false },
    });
  }
  return supabase;
}

function getMatchType(
  reels: string[],
  isWin: boolean
): "three_of_a_kind" | "two_of_a_kind" | "none" {
  if (!isWin) {
    return "none";
  }
  if (reels[0] === reels[1] && reels[1] === reels[2]) {
    return "three_of_a_kind";
  }
  if (reels[0] === reels[1]) {
    return "two_of_a_kind";
  }
  return "none";
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) {
    return null;
  }
  const rawIp = (ip.split(",")[0] ?? "").trim();
  return createHash("sha256").update(rawIp).digest("hex").slice(0, 32);
}

export async function recordSpin(
  result: SlotMachineResult,
  bet: number,
  ipHash: string | null
): Promise<void> {
  try {
    const client = getSupabaseClient();
    const matchType = getMatchType(result.reels, result.isWin);

    const { error } = await client.from("spins").insert({
      spin_id: result.spinId,
      bet_amount: bet,
      reel_1: result.reels[0] ?? "",
      reel_2: result.reels[1] ?? "",
      reel_3: result.reels[2] ?? "",
      is_win: result.isWin,
      win_amount: result.winAmount,
      combination: result.combination ?? null,
      match_type: matchType,
      ip_hash: ipHash,
    });

    if (error) {
      console.error("[db] Failed to record spin:", error.message);
    }
  } catch (err) {
    console.error("[db] Unexpected error recording spin:", err);
  }
}
