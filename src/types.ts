export type Role = "admin" | "teacher" | "student";

export type AttendanceStatus = "present" | "late" | "absent" | "excused";

export type NotificationAudience = "all" | "group" | "user";

export type NotificationDeliveryChannel = "app" | "telegram";

export type NotificationDeliveryStatus = "pending" | "sent" | "delivered" | "read" | "failed";

export type ViewKey =
  | "dashboard"
  | "journal"
  | "schedule"
  | "directory"
  | "grades"
  | "reports"
  | "notifications";

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  groupId: string | null;
  position: string;
  phone?: string;
  avatarTone: string;
}

export interface Group {
  id: string;
  name: string;
  course: number;
  specialty: string;
  curatorId: string | null;
  color: string;
}

export interface Subject {
  id: string;
  title: string;
  shortTitle: string;
  color: string;
}

export interface Lesson {
  id: string;
  groupId: string;
  subjectId: string;
  teacherId: string | null;
  weekday: number;
  startsAt: string;
  endsAt: string;
  room: string;
}

export interface SubjectTeacherAssignment {
  id: string;
  subjectId: string;
  teacherId: string;
  groupId: string | null;
  createdAt: string;
}

export interface GradeCategory {
  id: string;
  subjectId: string;
  groupId: string | null;
  title: string;
  coefficient: number;
  color: string;
  sortOrder: number;
}

export interface GradeRecord {
  id: string;
  studentId: string;
  subjectId: string;
  categoryId: string;
  lessonId: string | null;
  title: string;
  score: number;
  maxScore: number;
  gradedAt: string;
  comment: string;
  createdBy: string | null;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  lessonId: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  note: string;
  markedBy: string | null;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  audience: NotificationAudience;
  groupId: string | null;
  userId: string | null;
  createdBy: string | null;
  createdAt: string;
  type: "absence" | "schedule" | "system";
  readBy: string[];
}

export interface NotificationDelivery {
  id: string;
  notificationId: string;
  profileId: string;
  channel: NotificationDeliveryChannel;
  status: NotificationDeliveryStatus;
  deliveredAt: string | null;
  readAt: string | null;
  telegramMessageId?: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  profiles: Profile[];
  groups: Group[];
  subjects: Subject[];
  subjectTeacherAssignments: SubjectTeacherAssignment[];
  lessons: Lesson[];
  attendance: AttendanceRecord[];
  gradeCategories: GradeCategory[];
  grades: GradeRecord[];
  notifications: NotificationItem[];
  notificationDeliveries: NotificationDelivery[];
}

export interface SessionUser extends Profile {
  source: "demo" | "supabase";
}

export interface AttendanceInput {
  lessonId: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  note?: string;
  markedBy: string | null;
}

export interface GroupInput {
  name: string;
  course: number;
  specialty: string;
  curatorId: string | null;
  color: string;
}

export interface LessonInput {
  groupId: string;
  subjectId: string;
  teacherId: string | null;
  weekday: number;
  startsAt: string;
  endsAt: string;
  room: string;
}

export interface SubjectTeacherInput {
  subjectId: string;
  teacherId: string;
  groupId: string | null;
  createdBy: string | null;
}

export interface GradeCategoryInput {
  subjectId: string;
  groupId: string | null;
  title: string;
  coefficient: number;
  color: string;
  sortOrder: number;
  createdBy: string | null;
}

export interface GradeInput {
  studentId: string;
  subjectId: string;
  categoryId: string;
  lessonId: string | null;
  title: string;
  score: number;
  maxScore: number;
  gradedAt: string;
  comment: string;
  createdBy: string | null;
}

export interface ProfileInput {
  fullName: string;
  email: string;
  role: Role;
  groupId: string | null;
  position: string;
  phone?: string;
}

export interface NotificationInput {
  title: string;
  message: string;
  audience: NotificationAudience;
  groupId: string | null;
  userId: string | null;
  createdBy: string | null;
  type: NotificationItem["type"];
}
