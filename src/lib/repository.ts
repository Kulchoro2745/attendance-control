import type {
  AppData,
  AttendanceInput,
  AttendanceRecord,
  Group,
  GroupInput,
  Lesson,
  LessonInput,
  NotificationInput,
  NotificationItem,
  Profile,
  ProfileInput,
  Role,
  SessionUser,
  Subject,
} from "../types";
import { uid } from "../utils";
import { isSupabaseConfigured, supabase } from "./supabase";
import { loadDemoData, saveDemoData } from "./demoData";

type DbProfile = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  group_id: string | null;
  position: string | null;
  phone: string | null;
  avatar_tone: string | null;
};

type DbGroup = {
  id: string;
  name: string;
  course: number;
  specialty: string;
  curator_id: string | null;
  color: string | null;
};

type DbSubject = {
  id: string;
  title: string;
  short_title: string;
  color: string | null;
};

type DbLesson = {
  id: string;
  group_id: string;
  subject_id: string;
  teacher_id: string | null;
  weekday: number;
  starts_at: string;
  ends_at: string;
  room: string;
};

type DbAttendance = {
  id: string;
  lesson_id: string;
  student_id: string;
  date: string;
  status: AttendanceRecord["status"];
  note: string | null;
  marked_by: string | null;
  updated_at: string;
};

type DbNotification = {
  id: string;
  title: string;
  message: string;
  audience: NotificationItem["audience"];
  group_id: string | null;
  user_id: string | null;
  created_by: string | null;
  created_at: string;
  type: NotificationItem["type"];
  read_by: string[] | null;
};

export const repositoryMode = isSupabaseConfigured ? "supabase" : "demo";

function toProfile(row: DbProfile): Profile {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    groupId: row.group_id,
    position: row.position ?? "Пользователь",
    phone: row.phone ?? undefined,
    avatarTone: row.avatar_tone ?? "#124e78",
  };
}

function toGroup(row: DbGroup): Group {
  return {
    id: row.id,
    name: row.name,
    course: row.course,
    specialty: row.specialty,
    curatorId: row.curator_id,
    color: row.color ?? "#124e78",
  };
}

function toSubject(row: DbSubject): Subject {
  return {
    id: row.id,
    title: row.title,
    shortTitle: row.short_title,
    color: row.color ?? "#124e78",
  };
}

function toLesson(row: DbLesson): Lesson {
  return {
    id: row.id,
    groupId: row.group_id,
    subjectId: row.subject_id,
    teacherId: row.teacher_id,
    weekday: row.weekday,
    startsAt: row.starts_at.slice(0, 5),
    endsAt: row.ends_at.slice(0, 5),
    room: row.room,
  };
}

function toAttendance(row: DbAttendance): AttendanceRecord {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    studentId: row.student_id,
    date: row.date,
    status: row.status,
    note: row.note ?? "",
    markedBy: row.marked_by,
    updatedAt: row.updated_at,
  };
}

function toNotification(row: DbNotification): NotificationItem {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    audience: row.audience,
    groupId: row.group_id,
    userId: row.user_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    type: row.type,
    readBy: row.read_by ?? [],
  };
}

function assertSupabase() {
  if (!supabase) {
    throw new Error("Supabase не настроен. Заполните .env.local или используйте демо-режим.");
  }
  return supabase;
}

function failIfError(error: { message: string } | null | undefined) {
  if (error) throw new Error(error.message);
}

export async function getSupabaseSessionProfile(): Promise<SessionUser | null> {
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (error || !data) return null;
  return { ...toProfile(data as DbProfile), source: "supabase" };
}

export async function loadAppData(forceDemo = false): Promise<AppData> {
  if (forceDemo || !isSupabaseConfigured) return loadDemoData();

  const client = assertSupabase();
  const [profiles, groups, subjects, lessons, attendance, notifications] = await Promise.all([
    client.from("profiles").select("*").order("full_name"),
    client.from("groups").select("*").order("course", { ascending: false }).order("name"),
    client.from("subjects").select("*").order("title"),
    client.from("lessons").select("*").order("weekday").order("starts_at"),
    client.from("attendance_records").select("*").order("date", { ascending: false }),
    client.from("notifications").select("*").order("created_at", { ascending: false }),
  ]);

  [profiles, groups, subjects, lessons, attendance, notifications].forEach((result) =>
    failIfError(result.error),
  );

  return {
    profiles: ((profiles.data ?? []) as DbProfile[]).map(toProfile),
    groups: ((groups.data ?? []) as DbGroup[]).map(toGroup),
    subjects: ((subjects.data ?? []) as DbSubject[]).map(toSubject),
    lessons: ((lessons.data ?? []) as DbLesson[]).map(toLesson),
    attendance: ((attendance.data ?? []) as DbAttendance[]).map(toAttendance),
    notifications: ((notifications.data ?? []) as DbNotification[]).map(toNotification),
  };
}

export async function upsertAttendance(input: AttendanceInput, forceDemo = false) {
  if (isSupabaseConfigured && !forceDemo) {
    const client = assertSupabase();
    const { data, error } = await client
      .from("attendance_records")
      .upsert(
        {
          lesson_id: input.lessonId,
          student_id: input.studentId,
          date: input.date,
          status: input.status,
          note: input.note ?? "",
          marked_by: input.markedBy,
        },
        { onConflict: "lesson_id,student_id,date" },
      )
      .select("*")
      .single();

    failIfError(error);
    return toAttendance(data as DbAttendance);
  }

  const data = loadDemoData();
  const existingIndex = data.attendance.findIndex(
    (record) =>
      record.lessonId === input.lessonId &&
      record.studentId === input.studentId &&
      record.date === input.date,
  );
  const record: AttendanceRecord = {
    id: existingIndex >= 0 ? data.attendance[existingIndex].id : uid("att"),
    lessonId: input.lessonId,
    studentId: input.studentId,
    date: input.date,
    status: input.status,
    note: input.note ?? "",
    markedBy: input.markedBy,
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) data.attendance[existingIndex] = record;
  else data.attendance.unshift(record);
  saveDemoData(data);
  return record;
}

export async function createNotification(input: NotificationInput, forceDemo = false) {
  if (isSupabaseConfigured && !forceDemo) {
    const client = assertSupabase();
    const { data, error } = await client
      .from("notifications")
      .insert({
        title: input.title,
        message: input.message,
        audience: input.audience,
        group_id: input.groupId,
        user_id: input.userId,
        created_by: input.createdBy,
        type: input.type,
      })
      .select("*")
      .single();

    failIfError(error);
    return toNotification(data as DbNotification);
  }

  const data = loadDemoData();
  const notification: NotificationItem = {
    id: uid("note"),
    title: input.title,
    message: input.message,
    audience: input.audience,
    groupId: input.groupId,
    userId: input.userId,
    createdBy: input.createdBy,
    type: input.type,
    readBy: [],
    createdAt: new Date().toISOString(),
  };
  data.notifications.unshift(notification);
  saveDemoData(data);
  return notification;
}

export async function createGroup(input: GroupInput, forceDemo = false) {
  if (isSupabaseConfigured && !forceDemo) {
    const client = assertSupabase();
    const { data, error } = await client
      .from("groups")
      .insert({
        name: input.name,
        course: input.course,
        specialty: input.specialty,
        curator_id: input.curatorId,
        color: input.color,
      })
      .select("*")
      .single();

    failIfError(error);
    return toGroup(data as DbGroup);
  }

  const data = loadDemoData();
  const group: Group = { id: uid("group"), ...input };
  data.groups.unshift(group);
  saveDemoData(data);
  return group;
}

export async function createLesson(input: LessonInput, forceDemo = false) {
  if (isSupabaseConfigured && !forceDemo) {
    const client = assertSupabase();
    const { data, error } = await client
      .from("lessons")
      .insert({
        group_id: input.groupId,
        subject_id: input.subjectId,
        teacher_id: input.teacherId,
        weekday: input.weekday,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        room: input.room,
      })
      .select("*")
      .single();

    failIfError(error);
    return toLesson(data as DbLesson);
  }

  const data = loadDemoData();
  const lesson: Lesson = { id: uid("lesson"), ...input };
  data.lessons.push(lesson);
  saveDemoData(data);
  return lesson;
}

export async function createDemoProfile(input: ProfileInput, forceDemo = false) {
  if (isSupabaseConfigured && !forceDemo) {
    throw new Error("В Supabase пользователей нужно создавать через Authentication Sign up.");
  }

  const data = loadDemoData();
  const profile: Profile = {
    id: uid("profile"),
    ...input,
    avatarTone: "#124e78",
  };
  data.profiles.push(profile);
  saveDemoData(data);
  return profile;
}

export async function updateProfileRole(profileId: string, role: Role, forceDemo = false) {
  if (isSupabaseConfigured && !forceDemo) {
    const client = assertSupabase();
    const { data, error } = await client
      .from("profiles")
      .update({ role })
      .eq("id", profileId)
      .select("*")
      .single();

    failIfError(error);
    return toProfile(data as DbProfile);
  }

  const data = loadDemoData();
  const profile = data.profiles.find((item) => item.id === profileId);
  if (!profile) throw new Error("Пользователь не найден.");
  profile.role = role;
  saveDemoData(data);
  return profile;
}

export async function markNotificationRead(
  notificationId: string,
  userId: string,
  readBy: string[],
  forceDemo = false,
) {
  const nextReadBy = Array.from(new Set([...readBy, userId]));

  if (isSupabaseConfigured && !forceDemo) {
    const client = assertSupabase();
    const { data, error } = await client
      .from("notifications")
      .update({ read_by: nextReadBy })
      .eq("id", notificationId)
      .select("*")
      .single();

    failIfError(error);
    return toNotification(data as DbNotification);
  }

  const data = loadDemoData();
  const notification = data.notifications.find((item) => item.id === notificationId);
  if (!notification) throw new Error("Уведомление не найдено.");
  notification.readBy = nextReadBy;
  saveDemoData(data);
  return notification;
}

export async function sendTelegramReport(input: {
  groupId: string | null;
  dateFrom: string;
  dateTo: string;
}) {
  const client = assertSupabase();
  const { data, error } = await client.functions.invoke("send-attendance-report", {
    body: input,
  });

  failIfError(error);
  return data as { ok: boolean; sentCount: number };
}
