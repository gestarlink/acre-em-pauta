import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const SendSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(300),
  url: z.string().min(1).max(512).default("/"),
  image: z.string().url().max(1024).optional().nullable(),
  tag: z.string().max(64).optional().nullable(),
});

export const sendPushNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SendSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: staffRows } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "editor"]);
    if (!staffRows || staffRows.length === 0) {
      throw new Error("Apenas a equipe pode enviar push.");
    }

    const subject = process.env.VAPID_SUBJECT;
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!subject || !publicKey || !privateKey) {
      throw new Error("VAPID_SUBJECT, VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY precisam estar configurados.");
    }

    const webpush = await import("web-push");
    webpush.setVapidDetails(subject, publicKey, privateKey);

    const { data: subs } = await supabaseAdmin.from("push_subscriptions").select("endpoint,p256dh,auth");
    const payload = JSON.stringify({
      title: data.title,
      body: data.body,
      url: data.url,
      image: data.image ?? undefined,
      tag: data.tag ?? "aep-news",
    });

    let sent = 0;
    let removed = 0;
    const toRemove: string[] = [];
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          toRemove.push(s.endpoint);
          removed++;
        }
      }
    }
    if (toRemove.length) {
      await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", toRemove);
    }
    return { total: subs?.length ?? 0, sent, removed };
  });

export const getPushStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { count } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*", { count: "exact", head: true });
    return { subscribers: count ?? 0 };
  });