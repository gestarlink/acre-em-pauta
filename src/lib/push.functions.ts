import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const SubSchema = z.object({
  endpoint: z.string().url().max(2048),
  p256dh: z.string().min(10).max(512),
  auth: z.string().min(4).max(512),
  userAgent: z.string().max(512).optional().nullable(),
});

export const subscribePush = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SubSchema.parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        {
          endpoint: data.endpoint,
          p256dh: data.p256dh,
          auth: data.auth,
          user_agent: data.userAgent ?? null,
        },
        { onConflict: "endpoint" }
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unsubscribePush = createServerFn({ method: "POST" })
  .inputValidator((d: { endpoint: string }) => d)
  .handler(async ({ data }) => {
    await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", data.endpoint);
    return { ok: true };
  });