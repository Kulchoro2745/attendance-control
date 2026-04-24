import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type TelegramUpdate = {
  message?: {
    chat: { id: number; type?: string };
    from?: {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
    text?: string;
  };
};

const allowedUsernames = new Set(
  (Deno.env.get("TELEGRAM_ALLOWED_USERNAMES") ?? "Choke2745,Adilkan_dev")
    .split(",")
    .map((item) => item.trim().replace(/^@/, "").toLowerCase())
    .filter(Boolean),
);

const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const webhookSecret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function sendMessage(chatId: number, text: string) {
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is not configured");

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Telegram sendMessage failed: ${errorText}`);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: true });

  if (webhookSecret) {
    const actualSecret = req.headers.get("x-telegram-bot-api-secret-token");
    if (actualSecret !== webhookSecret) return json({ error: "Forbidden" }, 403);
  }

  const update = (await req.json()) as TelegramUpdate;
  const message = update.message;
  const from = message?.from;
  const chatId = message?.chat.id;
  const text = message?.text?.trim() ?? "";

  if (!message || !from || !chatId) return json({ ok: true });

  const username = from.username?.replace(/^@/, "") ?? "";
  const normalizedUsername = username.toLowerCase();
  const fullName = [from.first_name, from.last_name].filter(Boolean).join(" ").trim();

  if (text.startsWith("/stop")) {
    await supabaseAdmin
      .from("telegram_subscriptions")
      .update({ is_active: false, last_seen_at: new Date().toISOString() })
      .eq("telegram_user_id", from.id);

    await sendMessage(chatId, "Вы отписаны от отчетов AttendIQ.");
    return json({ ok: true });
  }

  if (!text.startsWith("/start")) return json({ ok: true });

  if (!allowedUsernames.has(normalizedUsername)) {
    await sendMessage(
      chatId,
      "Доступ к отчетам ограничен. Напишите администратору AttendIQ.",
    );
    return json({ ok: true });
  }

  const { error } = await supabaseAdmin.from("telegram_subscriptions").upsert(
    {
      telegram_user_id: from.id,
      chat_id: chatId,
      username,
      full_name: fullName || username,
      is_active: true,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "telegram_user_id" },
  );

  if (error) throw error;

  await sendMessage(
    chatId,
    "Готово. Вы подписаны на отчеты и уведомления AttendIQ.",
  );

  return json({ ok: true });
});
