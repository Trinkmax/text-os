// Lock de idempotencia por mensaje. PG hace el trabajo: UNIQUE(message_id)
// → si dos webhooks corren al mismo tiempo, sólo uno claimea. El segundo
// recibe "duplicate key" y se va silencioso.

import { createSbService } from "@/lib/channels/service";

export type Claim =
  | { ok: true }
  | { ok: false; reason: "already_processed" | "error"; error?: string };

export async function claimMessage(orgId: string, messageId: string): Promise<Claim> {
  const sb = createSbService();
  const { error } = await sb
    .from("textos_message_processing")
    .insert({ org_id: orgId, message_id: messageId, status: "claimed" });
  if (!error) return { ok: true };
  // 23505 = unique violation
  if (error.code === "23505") return { ok: false, reason: "already_processed" };
  return { ok: false, reason: "error", error: error.message };
}

export async function releaseMessage(
  messageId: string,
  status: "done" | "failed" | "skipped",
  reason?: string,
): Promise<void> {
  const sb = createSbService();
  await sb
    .from("textos_message_processing")
    .update({
      status,
      completed_at: new Date().toISOString(),
      reason: reason?.slice(0, 200) ?? null,
    })
    .eq("message_id", messageId);
}
