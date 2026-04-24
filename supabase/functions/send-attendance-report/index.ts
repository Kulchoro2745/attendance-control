import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type ReportRequest = {
  groupId?: string | null;
  dateFrom?: string;
  dateTo?: string;
};

type Profile = {
  id: string;
  full_name: string;
  role: "admin" | "teacher" | "student";
  group_id: string | null;
};

type AttendanceRecord = {
  student_id: string;
  date: string;
  status: "present" | "late" | "absent" | "excused";
};

type TelegramSubscription = {
  id: string;
  telegram_user_id: number;
  chat_id: number;
  username: string | null;
};

type TelegramSendResult = {
  ok: boolean;
  result?: {
    message_id?: number;
  };
  description?: string;
};

const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const statusWeight = {
  present: 1,
  late: 0.5,
  absent: 0,
  excused: 0.75,
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function sendMessage(
  chatId: number,
  text: string,
  replyMarkup?: Record<string, unknown>,
) {
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is not configured");

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });
  const payload = (await response.json().catch(() => null)) as TelegramSendResult | null;

  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed: ${payload?.description ?? response.statusText}`);
  }

  return payload;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = req.headers.get("Authorization") ?? "";
  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user },
    error: userError,
  } = await supabaseUser.auth.getUser();
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  const { data: requester, error: requesterError } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, role, group_id")
    .eq("id", user.id)
    .single<Profile>();
  if (requesterError || !requester) return json({ error: "Profile not found" }, 404);
  if (!["admin", "teacher"].includes(requester.role)) return json({ error: "Forbidden" }, 403);

  const body = (await req.json().catch(() => ({}))) as ReportRequest;
  const dateFrom = body.dateFrom ?? addDaysISO(-30);
  const dateTo = body.dateTo ?? todayISO();
  const groupId = body.groupId ?? null;

  const profilesQuery = supabaseAdmin
    .from("profiles")
    .select("id, full_name, role, group_id")
    .eq("role", "student")
    .order("full_name");
  if (groupId) profilesQuery.eq("group_id", groupId);

  const { data: students, error: studentsError } = await profilesQuery.returns<Profile[]>();
  if (studentsError) throw studentsError;

  const studentIds = (students ?? []).map((student) => student.id);
  const recordsQuery = supabaseAdmin
    .from("attendance_records")
    .select("student_id, date, status")
    .gte("date", dateFrom)
    .lte("date", dateTo);
  if (studentIds.length) recordsQuery.in("student_id", studentIds);

  const { data: records, error: recordsError } = await recordsQuery.returns<AttendanceRecord[]>();
  if (recordsError) throw recordsError;

  const { data: group } = groupId
    ? await supabaseAdmin.from("groups").select("name").eq("id", groupId).single<{ name: string }>()
    : { data: null };

  const rows = (students ?? []).map((student) => {
    const studentRecords = (records ?? []).filter((record) => record.student_id === student.id);
    const weighted = studentRecords.reduce(
      (sum, record) => sum + statusWeight[record.status],
      0,
    );
    return {
      name: student.full_name,
      total: studentRecords.length,
      absences: studentRecords.filter((record) => record.status === "absent").length,
      rate: percent(weighted, studentRecords.length),
    };
  });

  const average = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + row.rate, 0) / rows.length)
    : 0;
  const absences = rows.reduce((sum, row) => sum + row.absences, 0);
  const atRisk = rows
    .filter((row) => row.total > 0 && (row.absences > 0 || row.rate < 80))
    .sort((a, b) => b.absences - a.absences || a.rate - b.rate)
    .slice(0, 6);

  const reportText = [
    "<b>Отчет AttendIQ</b>",
    `Период: ${escapeHtml(dateFrom)} - ${escapeHtml(dateTo)}`,
    `Группа: ${escapeHtml(group?.name ?? "Все группы")}`,
    `Средняя посещаемость: <b>${average}%</b>`,
    `Пропуски: <b>${absences}</b>`,
    "",
    atRisk.length ? "<b>Контроль:</b>" : "Студентов в зоне риска нет.",
    ...atRisk.map(
      (row) =>
        `• ${escapeHtml(row.name)} — ${row.rate}%, пропусков: ${row.absences}`,
    ),
  ].join("\n");

  const { data: subscriptions, error: subscriptionsError } = await supabaseAdmin
    .from("telegram_subscriptions")
    .select("id, telegram_user_id, chat_id, username")
    .eq("is_active", true)
    .returns<TelegramSubscription[]>();
  if (subscriptionsError) throw subscriptionsError;

  const { data: reportRun, error: runError } = await supabaseAdmin
    .from("telegram_report_runs")
    .insert({
      requested_by: requester.id,
      group_id: groupId,
      date_from: dateFrom,
      date_to: dateTo,
      sent_count: 0,
      status: "pending",
    })
    .select("id")
    .single<{ id: string }>();
  if (runError || !reportRun) throw runError ?? new Error("Report run was not created");

  let sentCount = 0;
  for (const subscription of subscriptions ?? []) {
    const { data: delivery, error: deliveryError } = await supabaseAdmin
      .from("telegram_report_deliveries")
      .insert({
        report_run_id: reportRun.id,
        telegram_subscription_id: subscription.id,
        telegram_user_id: subscription.telegram_user_id,
        chat_id: subscription.chat_id,
        username: subscription.username,
        status: "pending",
      })
      .select("id")
      .single<{ id: string }>();

    if (deliveryError || !delivery) throw deliveryError ?? new Error("Delivery row was not created");

    try {
      const sent = await sendMessage(Number(subscription.chat_id), reportText, {
        inline_keyboard: [
          [
            {
              text: "Прочитано",
              callback_data: `report_read:${delivery.id}`,
            },
          ],
        ],
      });

      await supabaseAdmin
        .from("telegram_report_deliveries")
        .update({
          status: "sent",
          telegram_message_id: sent?.result?.message_id ?? null,
          sent_at: new Date().toISOString(),
        })
        .eq("id", delivery.id);
      sentCount += 1;
    } catch (error) {
      await supabaseAdmin
        .from("telegram_report_deliveries")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Telegram send failed",
        })
        .eq("id", delivery.id);
    }
  }

  await supabaseAdmin.from("telegram_report_runs").update({
    sent_count: sentCount,
    status:
      sentCount === 0
        ? "failed"
        : sentCount === (subscriptions ?? []).length
          ? "sent"
          : "partial",
  }).eq("id", reportRun.id);

  return json({ ok: true, sentCount });
});
