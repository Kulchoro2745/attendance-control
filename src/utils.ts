import type { AttendanceRecord, AttendanceStatus, Group, Lesson, Profile, Subject } from "./types";

export const roleLabels = {
  admin: "Администратор",
  teacher: "Преподаватель",
  student: "Пользователь",
} as const;

export const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export const statusMeta: Record<
  AttendanceStatus,
  { label: string; short: string; tone: string; weight: number }
> = {
  present: { label: "Присутствует", short: "П", tone: "good", weight: 1 },
  late: { label: "Опоздал", short: "О", tone: "warn", weight: 0.5 },
  absent: { label: "Отсутствует", short: "Н", tone: "danger", weight: 0 },
  excused: { label: "Уважительная", short: "У", tone: "info", weight: 0.75 },
};

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function getWeekdayIndex(dateIso: string) {
  const jsDay = new Date(`${dateIso}T12:00:00`).getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function formatDateRu(dateIso: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateIso}T12:00:00`));
}

export function formatDateTimeRu(dateIso: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateIso));
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export function findProfile(profiles: Profile[], id: string | null | undefined) {
  return profiles.find((profile) => profile.id === id) ?? null;
}

export function findGroup(groups: Group[], id: string | null | undefined) {
  return groups.find((group) => group.id === id) ?? null;
}

export function findSubject(subjects: Subject[], id: string | null | undefined) {
  return subjects.find((subject) => subject.id === id) ?? null;
}

export function lessonLabel(
  lesson: Lesson,
  subjects: Subject[],
  groups: Group[],
  profiles: Profile[],
) {
  const subject = findSubject(subjects, lesson.subjectId);
  const group = findGroup(groups, lesson.groupId);
  const teacher = findProfile(profiles, lesson.teacherId);
  return `${lesson.startsAt}-${lesson.endsAt} · ${subject?.shortTitle ?? "Предмет"} · ${
    group?.name ?? "Группа"
  } · ${teacher?.fullName ?? "Преподаватель"}`;
}

export function attendanceFor(
  attendance: AttendanceRecord[],
  lessonId: string,
  studentId: string,
  date: string,
) {
  return attendance.find(
    (record) =>
      record.lessonId === lessonId && record.studentId === studentId && record.date === date,
  );
}

export function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(";"),
    )
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
