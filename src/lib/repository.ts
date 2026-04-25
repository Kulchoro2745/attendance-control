import type {
  AppData,
  AttendanceInput,
  AttendanceRecord,
  Group,
  GroupInput,
  GradeCategory,
  GradeCategoryInput,
  GradeInput,
  GradeRecord,
  Lesson,
  LessonInput,
  NotificationDelivery,
  NotificationDeliveryChannel,
  NotificationDeliveryStatus,
  NotificationInput,
  NotificationItem,
  Profile,
  ProfileInput,
  Role,
  SessionUser,
  Subject,
  SubjectTeacherAssignment,
  SubjectTeacherInput,
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

type DbSubjectTeacher = {
  id: string;
  subject_id: string;
  teacher_id: string;
  group_id: string | null;
  created_at: string;
};

type DbGradeCategory = {
  id: string;
  subject_id: string;
  group_id: string | null;
  title: string;
  coefficient: number | string;
  color: string | null;
  sort_order: number | null;
};

type DbGradeRecord = {
  id: string;
  student_id: string;
  subject_id: string;
  category_id: string;
  lesson_id: string | null;
  title: string;
  score: number | string;
  max_score: number | string;
  graded_at: string;
  comment: string | null;
  created_by: string | null;
  created_at: string;
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

type DbNotificationDelivery = {
  id: string;
  notification_id: string;
  profile_id: string;
  channel: NotificationDeliveryChannel;
  status: NotificationDeliveryStatus;
  delivered_at: string | null;
  read_at: string | null;
  telegram_message_id: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type CreatedNotificationResult = {
  notification: NotificationItem;
  deliveries: NotificationDelivery[];
};

export type ReadNotificationResult = {
  notification: NotificationItem;
  delivery: NotificationDelivery;
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

function toSubjectTeacher(row: DbSubjectTeacher): SubjectTeacherAssignment {
  return {
    id: row.id,
    subjectId: row.subject_id,
    teacherId: row.teacher_id,
    groupId: row.group_id,
    createdAt: row.created_at,
  };
}

function toGradeCategory(row: DbGradeCategory): GradeCategory {
  return {
    id: row.id,
    subjectId: row.subject_id,
    groupId: row.group_id,
    title: row.title,
    coefficient: Number(row.coefficient),
    color: row.color ?? "#2f63d9",
    sortOrder: row.sort_order ?? 0,
  };
}

function toGradeRecord(row: DbGradeRecord): GradeRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    subjectId: row.subject_id,
    categoryId: row.category_id,
    lessonId: row.lesson_id,
    title: row.title,
    score: Number(row.score),
    maxScore: Number(row.max_score),
    gradedAt: row.graded_at,
    comment: row.comment ?? "",
    createdBy: row.created_by,
    createdAt: row.created_at,
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

function toNotificationDelivery(row: DbNotificationDelivery): NotificationDelivery {
  return {
    id: row.id,
    notificationId: row.notification_id,
    profileId: row.profile_id,
    channel: row.channel,
    status: row.status,
    deliveredAt: row.delivered_at,
    readAt: row.read_at,
    telegramMessageId: row.telegram_message_id ?? undefined,
    errorMessage: row.error_message ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
  const [
    profiles,
    groups,
    subjects,
    subjectTeacherAssignments,
    lessons,
    attendance,
    gradeCategories,
    grades,
    notifications,
    notificationDeliveries,
  ] = await Promise.all([
    client.from("profiles").select("*").order("full_name"),
    client.from("groups").select("*").order("course", { ascending: false }).order("name"),
    client.from("subjects").select("*").order("title"),
    client.from("subject_teachers").select("*").order("created_at", { ascending: false }),
    client.from("lessons").select("*").order("weekday").order("starts_at"),
    client.from("attendance_records").select("*").order("date", { ascending: false }),
    client.from("grade_categories").select("*").order("sort_order").order("title"),
    client.from("grades").select("*").order("graded_at", { ascending: false }),
    client.from("notifications").select("*").order("created_at", { ascending: false }),
    client
      .from("notification_deliveries")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  [
    profiles,
    groups,
    subjects,
    subjectTeacherAssignments,
    lessons,
    attendance,
    gradeCategories,
    grades,
    notifications,
    notificationDeliveries,
  ].forEach((result) => failIfError(result.error));

  return {
    profiles: ((profiles.data ?? []) as DbProfile[]).map(toProfile),
    groups: ((groups.data ?? []) as DbGroup[]).map(toGroup),
    subjects: ((subjects.data ?? []) as DbSubject[]).map(toSubject),
    subjectTeacherAssignments: ((subjectTeacherAssignments.data ?? []) as DbSubjectTeacher[]).map(
      toSubjectTeacher,
    ),
    lessons: ((lessons.data ?? []) as DbLesson[]).map(toLesson),
    attendance: ((attendance.data ?? []) as DbAttendance[]).map(toAttendance),
    gradeCategories: ((gradeCategories.data ?? []) as DbGradeCategory[]).map(toGradeCategory),
    grades: ((grades.data ?? []) as DbGradeRecord[]).map(toGradeRecord),
    notifications: ((notifications.data ?? []) as DbNotification[]).map(toNotification),
    notificationDeliveries: ((notificationDeliveries.data ?? []) as DbNotificationDelivery[]).map(
      toNotificationDelivery,
    ),
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

function notificationRecipientsFromData(data: AppData, notification: NotificationItem) {
  if (notification.audience === "user") {
    return data.profiles.filter((profile) => profile.id === notification.userId);
  }

  if (notification.audience === "group") {
    return data.profiles.filter((profile) => profile.groupId === notification.groupId);
  }

  return data.profiles;
}

export async function createNotification(
  input: NotificationInput,
  forceDemo = false,
): Promise<CreatedNotificationResult> {
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
    const notification = toNotification(data as DbNotification);
    const deliveries = await client
      .from("notification_deliveries")
      .select("*")
      .eq("notification_id", notification.id);

    failIfError(deliveries.error);
    return {
      notification,
      deliveries: ((deliveries.data ?? []) as DbNotificationDelivery[]).map(toNotificationDelivery),
    };
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
  const deliveries: NotificationDelivery[] = notificationRecipientsFromData(data, notification).map(
    (profile) => ({
      id: uid("delivery"),
      notificationId: notification.id,
      profileId: profile.id,
      channel: "app",
      status: "delivered",
      deliveredAt: notification.createdAt,
      readAt: null,
      createdAt: notification.createdAt,
      updatedAt: notification.createdAt,
    }),
  );
  data.notifications.unshift(notification);
  data.notificationDeliveries.unshift(...deliveries);
  saveDemoData(data);
  return { notification, deliveries };
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

export async function createSubjectTeacherAssignment(
  input: SubjectTeacherInput,
  forceDemo = false,
) {
  if (isSupabaseConfigured && !forceDemo) {
    const client = assertSupabase();
    const { data, error } = await client
      .from("subject_teachers")
      .insert({
        subject_id: input.subjectId,
        teacher_id: input.teacherId,
        group_id: input.groupId,
        created_by: input.createdBy,
      })
      .select("*")
      .single();

    failIfError(error);
    return toSubjectTeacher(data as DbSubjectTeacher);
  }

  const data = loadDemoData();
  const duplicate = data.subjectTeacherAssignments.some(
    (item) =>
      item.subjectId === input.subjectId &&
      item.teacherId === input.teacherId &&
      item.groupId === input.groupId,
  );
  if (duplicate) throw new Error("Такая связка уже есть.");
  const assignment: SubjectTeacherAssignment = {
    id: uid("subteach"),
    subjectId: input.subjectId,
    teacherId: input.teacherId,
    groupId: input.groupId,
    createdAt: new Date().toISOString(),
  };
  data.subjectTeacherAssignments.unshift(assignment);
  saveDemoData(data);
  return assignment;
}

export async function createGradeCategory(input: GradeCategoryInput, forceDemo = false) {
  if (isSupabaseConfigured && !forceDemo) {
    const client = assertSupabase();
    const { data, error } = await client
      .from("grade_categories")
      .insert({
        subject_id: input.subjectId,
        group_id: input.groupId,
        title: input.title,
        coefficient: input.coefficient,
        color: input.color,
        sort_order: input.sortOrder,
        created_by: input.createdBy,
      })
      .select("*")
      .single();

    failIfError(error);
    return toGradeCategory(data as DbGradeCategory);
  }

  const data = loadDemoData();
  const category: GradeCategory = {
    id: uid("gradecat"),
    subjectId: input.subjectId,
    groupId: input.groupId,
    title: input.title,
    coefficient: input.coefficient,
    color: input.color,
    sortOrder: input.sortOrder,
  };
  data.gradeCategories.push(category);
  saveDemoData(data);
  return category;
}

export async function createGrade(input: GradeInput, forceDemo = false) {
  if (isSupabaseConfigured && !forceDemo) {
    const client = assertSupabase();
    const { data, error } = await client
      .from("grades")
      .insert({
        student_id: input.studentId,
        subject_id: input.subjectId,
        category_id: input.categoryId,
        lesson_id: input.lessonId,
        title: input.title,
        score: input.score,
        max_score: input.maxScore,
        graded_at: input.gradedAt,
        comment: input.comment,
        created_by: input.createdBy,
      })
      .select("*")
      .single();

    failIfError(error);
    return toGradeRecord(data as DbGradeRecord);
  }

  const data = loadDemoData();
  const grade: GradeRecord = {
    id: uid("grade"),
    studentId: input.studentId,
    subjectId: input.subjectId,
    categoryId: input.categoryId,
    lessonId: input.lessonId,
    title: input.title,
    score: input.score,
    maxScore: input.maxScore,
    gradedAt: input.gradedAt,
    comment: input.comment,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
  };
  data.grades.unshift(grade);
  saveDemoData(data);
  return grade;
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
): Promise<ReadNotificationResult> {
  const nextReadBy = Array.from(new Set([...readBy, userId]));

  if (isSupabaseConfigured && !forceDemo) {
    const client = assertSupabase();
    const now = new Date().toISOString();
    const { data: delivery, error: deliveryError } = await client
      .from("notification_deliveries")
      .upsert(
        {
          notification_id: notificationId,
          profile_id: userId,
          channel: "app",
          status: "read",
          delivered_at: now,
          read_at: now,
        },
        { onConflict: "notification_id,profile_id,channel" },
      )
      .select("*")
      .single();

    failIfError(deliveryError);

    const { data: notification, error: notificationError } = await client
      .from("notifications")
      .select("*")
      .eq("id", notificationId)
      .single();

    failIfError(notificationError);
    return {
      notification: toNotification(notification as DbNotification),
      delivery: toNotificationDelivery(delivery as DbNotificationDelivery),
    };
  }

  const data = loadDemoData();
  const notification = data.notifications.find((item) => item.id === notificationId);
  if (!notification) throw new Error("Уведомление не найдено.");
  notification.readBy = nextReadBy;
  const now = new Date().toISOString();
  let delivery = data.notificationDeliveries.find(
    (item) =>
      item.notificationId === notificationId && item.profileId === userId && item.channel === "app",
  );
  if (!delivery) {
    delivery = {
      id: uid("delivery"),
      notificationId,
      profileId: userId,
      channel: "app",
      status: "read",
      deliveredAt: now,
      readAt: now,
      createdAt: now,
      updatedAt: now,
    };
    data.notificationDeliveries.unshift(delivery);
  } else {
    delivery.status = "read";
    delivery.deliveredAt ??= now;
    delivery.readAt ??= now;
    delivery.updatedAt = now;
  }
  saveDemoData(data);
  return { notification, delivery };
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
