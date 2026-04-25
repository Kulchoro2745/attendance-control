import type { AppData } from "../types";
import { addDaysISO, todayISO } from "../utils";

export const demoData: AppData = {
  profiles: [
    {
      id: "demo_admin",
      fullName: "Алтынбеков Кулчоро Алтынбекович",
      email: "admin@attendiq.local",
      role: "admin",
      groupId: null,
      position: "Администратор учебной части",
      phone: "+996 555 010 101",
      avatarTone: "#124e78",
    },
    {
      id: "teacher_askar",
      fullName: "Каримов Эльдар Рахимович",
      email: "karimov@komteh.edu",
      role: "teacher",
      groupId: null,
      position: "Преподаватель веб-разработки",
      phone: "+996 555 010 102",
      avatarTone: "#2f7d63",
    },
    {
      id: "teacher_gulnara",
      fullName: "Исхакова Гульнара Абдыкадыровна",
      email: "isxakova@komteh.edu",
      role: "teacher",
      groupId: null,
      position: "Куратор и преподаватель БД",
      phone: "+996 555 010 103",
      avatarTone: "#8a4f21",
    },
    {
      id: "teacher_dinara",
      fullName: "Айтматова Динара Саматовна",
      email: "aitmatova@komteh.edu",
      role: "teacher",
      groupId: null,
      position: "Преподаватель математики и аналитики",
      phone: "+996 555 010 104",
      avatarTone: "#2f63d9",
    },
    {
      id: "student_azamat",
      fullName: "Маматов Азамат Нурбекович",
      email: "azamat@student.komteh.edu",
      role: "student",
      groupId: "group_povt_41",
      position: "Студент",
      phone: "+996 700 000 111",
      avatarTone: "#2454a6",
    },
    {
      id: "student_aigerim",
      fullName: "Садыкова Айгерим Бакытовна",
      email: "aigerim@student.komteh.edu",
      role: "student",
      groupId: "group_povt_41",
      position: "Студент",
      phone: "+996 700 000 112",
      avatarTone: "#7c3aed",
    },
    {
      id: "student_bekbolot",
      fullName: "Токтосунов Бекболот Мирланович",
      email: "bekbolot@student.komteh.edu",
      role: "student",
      groupId: "group_povt_41",
      position: "Студент",
      phone: "+996 700 000 113",
      avatarTone: "#a43e52",
    },
    {
      id: "student_dastan",
      fullName: "Осмонов Дастан Кубанычбекович",
      email: "dastan@student.komteh.edu",
      role: "student",
      groupId: "group_is_31",
      position: "Студент",
      phone: "+996 700 000 114",
      avatarTone: "#0f766e",
    },
    {
      id: "student_madina",
      fullName: "Эсеналиева Мадина Эрмековна",
      email: "madina@student.komteh.edu",
      role: "student",
      groupId: "group_is_31",
      position: "Студент",
      phone: "+996 700 000 115",
      avatarTone: "#9a3412",
    },
    {
      id: "student_nursultan",
      fullName: "Бейшеналиев Нурсултан Асанович",
      email: "nursultan@student.komteh.edu",
      role: "student",
      groupId: "group_dis_21",
      position: "Студент",
      phone: "+996 700 000 116",
      avatarTone: "#4d7c0f",
    },
  ],
  groups: [
    {
      id: "group_povt_41",
      name: "ПОВТ-4-1",
      course: 4,
      specialty: "Программное обеспечение вычислительной техники",
      curatorId: "teacher_gulnara",
      color: "#124e78",
    },
    {
      id: "group_is_31",
      name: "ИС-3-1",
      course: 3,
      specialty: "Информационные системы",
      curatorId: "teacher_askar",
      color: "#2f7d63",
    },
    {
      id: "group_dis_21",
      name: "ДИЗ-2-1",
      course: 2,
      specialty: "Цифровой дизайн",
      curatorId: "teacher_gulnara",
      color: "#7c3aed",
    },
  ],
  subjects: [
    {
      id: "subject_web",
      title: "Веб-программирование",
      shortTitle: "Web",
      color: "#124e78",
    },
    {
      id: "subject_db",
      title: "Базы данных",
      shortTitle: "БД",
      color: "#2f7d63",
    },
    {
      id: "subject_ui",
      title: "UI/UX проектирование",
      shortTitle: "UI/UX",
      color: "#7c3aed",
    },
    {
      id: "subject_test",
      title: "Тестирование ПО",
      shortTitle: "QA",
      color: "#a43e52",
    },
    {
      id: "subject_math",
      title: "Математика",
      shortTitle: "Мат",
      color: "#c96f12",
    },
  ],
  subjectTeacherAssignments: [
    {
      id: "subteach_web_askar",
      subjectId: "subject_web",
      teacherId: "teacher_askar",
      groupId: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: "subteach_db_gulnara",
      subjectId: "subject_db",
      teacherId: "teacher_gulnara",
      groupId: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: "subteach_math_dinara",
      subjectId: "subject_math",
      teacherId: "teacher_dinara",
      groupId: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: "subteach_math_askar_povt",
      subjectId: "subject_math",
      teacherId: "teacher_askar",
      groupId: "group_povt_41",
      createdAt: new Date().toISOString(),
    },
    {
      id: "subteach_math_gulnara_is",
      subjectId: "subject_math",
      teacherId: "teacher_gulnara",
      groupId: "group_is_31",
      createdAt: new Date().toISOString(),
    },
  ],
  lessons: [
    {
      id: "lesson_web_mon",
      groupId: "group_povt_41",
      subjectId: "subject_web",
      teacherId: "teacher_askar",
      weekday: 0,
      startsAt: "09:00",
      endsAt: "10:30",
      room: "310",
    },
    {
      id: "lesson_db_mon",
      groupId: "group_povt_41",
      subjectId: "subject_db",
      teacherId: "teacher_gulnara",
      weekday: 0,
      startsAt: "10:45",
      endsAt: "12:15",
      room: "305",
    },
    {
      id: "lesson_ui_tue",
      groupId: "group_is_31",
      subjectId: "subject_ui",
      teacherId: "teacher_askar",
      weekday: 1,
      startsAt: "09:00",
      endsAt: "10:30",
      room: "214",
    },
    {
      id: "lesson_test_wed",
      groupId: "group_povt_41",
      subjectId: "subject_test",
      teacherId: "teacher_askar",
      weekday: 2,
      startsAt: "13:00",
      endsAt: "14:30",
      room: "312",
    },
    {
      id: "lesson_math_wed",
      groupId: "group_povt_41",
      subjectId: "subject_math",
      teacherId: "teacher_dinara",
      weekday: 2,
      startsAt: "10:45",
      endsAt: "12:15",
      room: "207",
    },
    {
      id: "lesson_db_thu",
      groupId: "group_is_31",
      subjectId: "subject_db",
      teacherId: "teacher_gulnara",
      weekday: 3,
      startsAt: "10:45",
      endsAt: "12:15",
      room: "305",
    },
    {
      id: "lesson_ui_fri",
      groupId: "group_dis_21",
      subjectId: "subject_ui",
      teacherId: "teacher_gulnara",
      weekday: 4,
      startsAt: "14:45",
      endsAt: "16:15",
      room: "201",
    },
  ],
  attendance: [
    {
      id: "att_1",
      lessonId: "lesson_web_mon",
      studentId: "student_azamat",
      date: todayISO(),
      status: "present",
      note: "",
      markedBy: "teacher_askar",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "att_2",
      lessonId: "lesson_web_mon",
      studentId: "student_aigerim",
      date: todayISO(),
      status: "late",
      note: "Опоздание 8 минут",
      markedBy: "teacher_askar",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "att_3",
      lessonId: "lesson_web_mon",
      studentId: "student_bekbolot",
      date: todayISO(),
      status: "absent",
      note: "Нет уведомления",
      markedBy: "teacher_askar",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "att_4",
      lessonId: "lesson_db_mon",
      studentId: "student_azamat",
      date: addDaysISO(-1),
      status: "present",
      note: "",
      markedBy: "teacher_gulnara",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "att_5",
      lessonId: "lesson_db_mon",
      studentId: "student_aigerim",
      date: addDaysISO(-1),
      status: "present",
      note: "",
      markedBy: "teacher_gulnara",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "att_6",
      lessonId: "lesson_db_mon",
      studentId: "student_bekbolot",
      date: addDaysISO(-1),
      status: "excused",
      note: "Справка",
      markedBy: "teacher_gulnara",
      updatedAt: new Date().toISOString(),
    },
  ],
  gradeCategories: [
    {
      id: "gradecat_current",
      subjectId: "subject_math",
      groupId: null,
      title: "Текущий контроль",
      coefficient: 1,
      color: "#2f63d9",
      sortOrder: 10,
    },
    {
      id: "gradecat_practice",
      subjectId: "subject_math",
      groupId: null,
      title: "Практика",
      coefficient: 2,
      color: "#0f8f7a",
      sortOrder: 20,
    },
    {
      id: "gradecat_exam",
      subjectId: "subject_math",
      groupId: null,
      title: "Контрольная",
      coefficient: 3,
      color: "#d92d54",
      sortOrder: 30,
    },
    {
      id: "gradecat_project",
      subjectId: "subject_web",
      groupId: "group_povt_41",
      title: "Проект",
      coefficient: 4,
      color: "#7048e8",
      sortOrder: 40,
    },
  ],
  grades: [
    {
      id: "grade_azamat_math_1",
      studentId: "student_azamat",
      subjectId: "subject_math",
      categoryId: "gradecat_current",
      lessonId: "lesson_math_wed",
      title: "Домашняя работа",
      score: 88,
      maxScore: 100,
      gradedAt: todayISO(),
      comment: "Стабильная работа",
      createdBy: "teacher_dinara",
      createdAt: new Date().toISOString(),
    },
    {
      id: "grade_azamat_math_2",
      studentId: "student_azamat",
      subjectId: "subject_math",
      categoryId: "gradecat_exam",
      lessonId: "lesson_math_wed",
      title: "Контрольная 1",
      score: 82,
      maxScore: 100,
      gradedAt: todayISO(),
      comment: "",
      createdBy: "teacher_dinara",
      createdAt: new Date().toISOString(),
    },
    {
      id: "grade_aigerim_math_1",
      studentId: "student_aigerim",
      subjectId: "subject_math",
      categoryId: "gradecat_current",
      lessonId: "lesson_math_wed",
      title: "Домашняя работа",
      score: 94,
      maxScore: 100,
      gradedAt: todayISO(),
      comment: "",
      createdBy: "teacher_dinara",
      createdAt: new Date().toISOString(),
    },
    {
      id: "grade_aigerim_math_2",
      studentId: "student_aigerim",
      subjectId: "subject_math",
      categoryId: "gradecat_practice",
      lessonId: "lesson_math_wed",
      title: "Практическая",
      score: 90,
      maxScore: 100,
      gradedAt: addDaysISO(-2),
      comment: "",
      createdBy: "teacher_dinara",
      createdAt: new Date().toISOString(),
    },
    {
      id: "grade_bekbolot_math_1",
      studentId: "student_bekbolot",
      subjectId: "subject_math",
      categoryId: "gradecat_current",
      lessonId: "lesson_math_wed",
      title: "Домашняя работа",
      score: 61,
      maxScore: 100,
      gradedAt: todayISO(),
      comment: "Нужно закрыть пробелы",
      createdBy: "teacher_dinara",
      createdAt: new Date().toISOString(),
    },
  ],
  notifications: [
    {
      id: "note_1",
      title: "Пропуск занятия",
      message: "Бекболот отсутствовал на занятии Web без подтвержденной причины.",
      audience: "user",
      groupId: null,
      userId: "student_bekbolot",
      createdBy: "teacher_askar",
      createdAt: new Date().toISOString(),
      type: "absence",
      readBy: [],
    },
    {
      id: "note_2",
      title: "Изменение расписания",
      message: "Занятие по БД для ПОВТ-4-1 переносится в аудиторию 305.",
      audience: "group",
      groupId: "group_povt_41",
      userId: null,
      createdBy: "teacher_gulnara",
      createdAt: addDaysISO(-1) + "T09:30:00.000Z",
      type: "schedule",
      readBy: ["student_azamat"],
    },
  ],
  notificationDeliveries: [
    {
      id: "delivery_note_1_student_bekbolot",
      notificationId: "note_1",
      profileId: "student_bekbolot",
      channel: "app",
      status: "delivered",
      deliveredAt: new Date().toISOString(),
      readAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "delivery_note_2_student_azamat",
      notificationId: "note_2",
      profileId: "student_azamat",
      channel: "app",
      status: "read",
      deliveredAt: addDaysISO(-1) + "T09:30:00.000Z",
      readAt: addDaysISO(-1) + "T10:02:00.000Z",
      createdAt: addDaysISO(-1) + "T09:30:00.000Z",
      updatedAt: addDaysISO(-1) + "T10:02:00.000Z",
    },
    {
      id: "delivery_note_2_student_aigerim",
      notificationId: "note_2",
      profileId: "student_aigerim",
      channel: "app",
      status: "delivered",
      deliveredAt: addDaysISO(-1) + "T09:30:00.000Z",
      readAt: null,
      createdAt: addDaysISO(-1) + "T09:30:00.000Z",
      updatedAt: addDaysISO(-1) + "T09:30:00.000Z",
    },
    {
      id: "delivery_note_2_student_bekbolot",
      notificationId: "note_2",
      profileId: "student_bekbolot",
      channel: "app",
      status: "delivered",
      deliveredAt: addDaysISO(-1) + "T09:30:00.000Z",
      readAt: null,
      createdAt: addDaysISO(-1) + "T09:30:00.000Z",
      updatedAt: addDaysISO(-1) + "T09:30:00.000Z",
    },
  ],
};

const STORAGE_KEY = "attendiq-demo-data-v1";

function cloneDemoData() {
  return JSON.parse(JSON.stringify(demoData)) as AppData;
}

function demoRecipients(data: AppData, notificationId: string) {
  const note = data.notifications.find((item) => item.id === notificationId);
  if (!note) return [];

  if (note.audience === "user") {
    return data.profiles.filter((profile) => profile.id === note.userId);
  }

  if (note.audience === "group") {
    return data.profiles.filter((profile) => profile.groupId === note.groupId);
  }

  return data.profiles;
}

function ensureDemoShape(data: AppData) {
  const now = new Date().toISOString();
  const defaults = cloneDemoData();
  mergeMissingById(data.profiles, defaults.profiles);
  mergeMissingById(data.subjects, defaults.subjects);
  mergeMissingById(data.lessons, defaults.lessons);
  data.subjectTeacherAssignments ??= [];
  data.gradeCategories ??= [];
  data.grades ??= [];
  mergeMissingById(data.subjectTeacherAssignments, defaults.subjectTeacherAssignments);
  mergeMissingById(data.gradeCategories, defaults.gradeCategories);
  mergeMissingById(data.grades, defaults.grades);
  data.notificationDeliveries ??= [];

  for (const note of data.notifications) {
    for (const recipient of demoRecipients(data, note.id)) {
      const exists = data.notificationDeliveries.some(
        (delivery) =>
          delivery.notificationId === note.id &&
          delivery.profileId === recipient.id &&
          delivery.channel === "app",
      );
      if (exists) continue;

      const isRead = note.readBy.includes(recipient.id);
      data.notificationDeliveries.push({
        id: uidForDemoDelivery(note.id, recipient.id),
        notificationId: note.id,
        profileId: recipient.id,
        channel: "app",
        status: isRead ? "read" : "delivered",
        deliveredAt: note.createdAt,
        readAt: isRead ? note.createdAt : null,
        createdAt: note.createdAt,
        updatedAt: now,
      });
    }
  }

  return data;
}

function mergeMissingById<T extends { id: string }>(target: T[], source: T[]) {
  for (const item of source) {
    if (!target.some((existing) => existing.id === item.id)) target.push(item);
  }
}

function uidForDemoDelivery(notificationId: string, profileId: string) {
  return `delivery_${notificationId}_${profileId}`;
}

export function loadDemoData() {
  if (typeof window === "undefined") return ensureDemoShape(cloneDemoData());
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initialData = ensureDemoShape(cloneDemoData());
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
    return initialData;
  }

  try {
    const parsed = ensureDemoShape(JSON.parse(raw) as AppData);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    return parsed;
  } catch {
    const initialData = ensureDemoShape(cloneDemoData());
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
    return initialData;
  }
}

export function saveDemoData(data: AppData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function resetDemoData() {
  const initialData = cloneDemoData();
  saveDemoData(initialData);
  return initialData;
}
