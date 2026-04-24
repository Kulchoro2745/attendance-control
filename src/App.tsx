import {
  Bell,
  CalendarDays,
  CheckCircle2,
  CheckCheck,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Download,
  Eye,
  Filter,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { AuthScreen } from "./components/AuthScreen";
import {
  createDemoProfile,
  createGroup,
  createLesson,
  createNotification,
  getSupabaseSessionProfile,
  loadAppData,
  markNotificationRead,
  repositoryMode,
  sendTelegramReport,
  updateProfileRole,
  upsertAttendance,
} from "./lib/repository";
import { supabase } from "./lib/supabase";
import type {
  AppData,
  AttendanceStatus,
  GroupInput,
  LessonInput,
  NotificationAudience,
  NotificationInput,
  Profile,
  ProfileInput,
  Role,
  SessionUser,
  ViewKey,
} from "./types";
import {
  addDaysISO,
  attendanceFor,
  downloadCsv,
  findGroup,
  findProfile,
  findSubject,
  formatDateRu,
  formatDateTimeRu,
  getInitials,
  getWeekdayIndex,
  lessonLabel,
  percent,
  roleLabels,
  statusMeta,
  todayISO,
  uid,
  weekdays,
} from "./utils";

const emptyData: AppData = {
  profiles: [],
  groups: [],
  subjects: [],
  lessons: [],
  attendance: [],
  notifications: [],
  notificationDeliveries: [],
};

const navItems: Array<{ key: ViewKey; label: string; icon: typeof LayoutDashboard }> = [
  { key: "dashboard", label: "Панель", icon: LayoutDashboard },
  { key: "journal", label: "Журнал", icon: ClipboardCheck },
  { key: "schedule", label: "Расписание", icon: CalendarDays },
  { key: "directory", label: "Люди и группы", icon: UsersRound },
  { key: "reports", label: "Отчеты", icon: Filter },
  { key: "notifications", label: "Уведомления", icon: Bell },
];

export default function App() {
  const [data, setData] = useState<AppData>(emptyData);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void bootstrap();
  }, []);

  async function bootstrap() {
    setLoading(true);
    try {
      const restoredUser = await getSupabaseSessionProfile();
      const loadedData = await loadAppData(!restoredUser);
      setData(loadedData);
      if (restoredUser) setUser(restoredUser);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Не удалось загрузить данные.");
    } finally {
      setLoading(false);
    }
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }

  async function refreshData(forceDemo = user?.source === "demo") {
    const loadedData = await loadAppData(forceDemo);
    setData(loadedData);
    showToast("Данные обновлены.");
  }

  function handleDemoLogin(profile: Profile) {
    setUser({ ...profile, source: "demo" });
    setAuthError(null);
  }

  async function handleSupabaseLogin(email: string, password: string) {
    if (!supabase) return;
    setLoading(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const profile = await getSupabaseSessionProfile();
      if (!profile) throw new Error("Профиль пользователя не найден. Проверьте миграцию БД.");
      setUser(profile);
      await refreshData(false);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Ошибка входа.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSupabaseSignUp(name: string, email: string, password: string) {
    if (!supabase) return;
    setLoading(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (error) throw error;
      showToast("Аккаунт создан. Если включено подтверждение email, завершите его в почте.");
      const profile = await getSupabaseSessionProfile();
      if (profile) setUser(profile);
      await refreshData(false);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Ошибка регистрации.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    if (user?.source === "supabase" && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setActiveView("dashboard");
  }

  async function handleNotificationRead(notificationId: string) {
    if (!user) return;
    const notification = data.notifications.find((item) => item.id === notificationId);
    if (!notification || isNotificationReadBy(data, notification, user.id)) return;

    try {
      const updated = await markNotificationRead(
        notification.id,
        user.id,
        notification.readBy,
        user.source === "demo",
      );
      setData((current) => ({
        ...current,
        notifications: current.notifications.map((item) =>
          item.id === updated.notification.id ? updated.notification : item,
        ),
        notificationDeliveries: upsertLocalDelivery(
          current.notificationDeliveries,
          updated.delivery,
        ),
      }));
      showToast("Уведомление отмечено как прочитанное.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Не удалось обновить статус.");
    }
  }

  if (loading && data.profiles.length === 0) {
    return (
      <main className="splash">
        <RefreshCw className="spin" size={28} />
        <span>Загрузка AttendIQ</span>
      </main>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        profiles={data.profiles}
        loading={loading}
        authError={authError}
        onDemoLogin={handleDemoLogin}
        onSupabaseLogin={handleSupabaseLogin}
        onSupabaseSignUp={handleSupabaseSignUp}
        restoredUser={user}
      />
    );
  }

  return (
    <AppShell
      activeView={activeView}
      data={data}
      onRefresh={() => void refreshData(user.source === "demo")}
      onSignOut={() => void handleSignOut()}
      setActiveView={setActiveView}
      user={user}
    >
      {activeView === "dashboard" ? (
        <DashboardView
          data={data}
          onMarkNotificationRead={handleNotificationRead}
          setActiveView={setActiveView}
          user={user}
        />
      ) : null}
      {activeView === "journal" ? (
        <JournalView data={data} setData={setData} showToast={showToast} user={user} />
      ) : null}
      {activeView === "schedule" ? (
        <ScheduleView data={data} setData={setData} showToast={showToast} user={user} />
      ) : null}
      {activeView === "directory" ? (
        <DirectoryView data={data} setData={setData} showToast={showToast} user={user} />
      ) : null}
      {activeView === "reports" ? <ReportsView data={data} showToast={showToast} user={user} /> : null}
      {activeView === "notifications" ? (
        <NotificationsView
          data={data}
          onMarkNotificationRead={handleNotificationRead}
          setData={setData}
          showToast={showToast}
          user={user}
        />
      ) : null}
      {toast ? (
        <div className="toast">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      ) : null}
    </AppShell>
  );
}

function AppShell({
  activeView,
  children,
  data,
  onRefresh,
  onSignOut,
  setActiveView,
  user,
}: {
  activeView: ViewKey;
  children: ReactNode;
  data: AppData;
  onRefresh: () => void;
  onSignOut: () => void;
  setActiveView: (view: ViewKey) => void;
  user: SessionUser;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const group = findGroup(data.groups, user.groupId);
  const relevantNotifications = getRelevantNotifications(data, user);
  const unreadCount = relevantNotifications.filter(
    (note) => !isNotificationReadBy(data, note, user.id),
  ).length;

  return (
    <div className="app-shell">
      <aside className={menuOpen ? "sidebar open" : "sidebar"}>
        <div className="sidebar-brand">
          <div className="brand-icon">
            <ClipboardCheck size={22} />
          </div>
          <div>
            <strong>AttendIQ</strong>
            <span>Attendance OS</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Основная навигация">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={activeView === item.key ? "nav-item active" : "nav-item"}
                key={item.key}
                onClick={() => {
                  setActiveView(item.key);
                  setMenuOpen(false);
                }}
                type="button"
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.key === "notifications" && unreadCount ? (
                  <b className="nav-count">{unreadCount}</b>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-profile">
          <span className="avatar large" style={{ background: user.avatarTone }}>
            {getInitials(user.fullName)}
          </span>
          <strong>{user.fullName}</strong>
          <small>{group?.name ?? roleLabels[user.role]}</small>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <button
            aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
            className="icon-btn mobile-only"
            onClick={() => setMenuOpen((value) => !value)}
            type="button"
          >
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
          <div>
            <p className="eyebrow">
              {user.source === "demo"
                ? "Демо-режим"
                : repositoryMode === "supabase"
                  ? "Supabase подключен"
                  : "Демо-режим"}
            </p>
            <h1>{navItems.find((item) => item.key === activeView)?.label}</h1>
          </div>
          <div className="topbar-actions">
            <span className={`role-pill ${user.role}`}>
              <ShieldCheck size={15} />
              {roleLabels[user.role]}
            </span>
            <button className="icon-btn" onClick={onRefresh} title="Обновить данные" type="button">
              <RefreshCw size={18} />
            </button>
            <button className="icon-btn" onClick={onSignOut} title="Выйти" type="button">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

function DashboardView({
  data,
  onMarkNotificationRead,
  setActiveView,
  user,
}: {
  data: AppData;
  onMarkNotificationRead: (notificationId: string) => void;
  setActiveView: (view: ViewKey) => void;
  user: SessionUser;
}) {
  const today = todayISO();
  const todayWeekday = getWeekdayIndex(today);
  const students = scopedStudents(data, user);
  const todayRecords = data.attendance.filter((record) => record.date === today);
  const recordLessonIds = new Set(todayRecords.map((record) => record.lessonId));
  const todayLessons = data.lessons.filter((lesson) => {
    if (lesson.weekday !== todayWeekday) return false;
    if (user.role === "student") return lesson.groupId === user.groupId;
    return true;
  });
  const expectedLessons = data.lessons.filter((lesson) => {
    if (recordLessonIds.has(lesson.id)) return true;
    return todayLessons.some((todayLesson) => todayLesson.id === lesson.id);
  });
  const weighted = todayRecords.reduce((sum, record) => sum + statusMeta[record.status].weight, 0);
  const attendanceRate = percent(weighted, todayRecords.length);
  const expectedMarks = expectedLessons.reduce((sum, lesson) => {
    return sum + data.profiles.filter((profile) => profile.role === "student" && profile.groupId === lesson.groupId).length;
  }, 0);
  const coverage = percent(todayRecords.length, expectedMarks);
  const absentToday = todayRecords.filter((record) => record.status === "absent").length;
  const relevantNotes = getRelevantNotifications(data, user).slice(0, 4);
  const riskRows = buildRiskRows(data, students).slice(0, 5);

  return (
    <section className="view-stack">
      <div className="kpi-grid">
        <MetricCard label="Посещаемость" value={`${attendanceRate}%`} helper="по отмеченным занятиям" tone="blue" />
        <MetricCard label="Заполненность журнала" value={`${coverage}%`} helper="за сегодня" tone="green" />
        <MetricCard label="Пропуски сегодня" value={String(absentToday)} helper="без учета уважительных" tone="rose" />
        <MetricCard label="Занятия сегодня" value={String(todayLessons.length)} helper="в расписании" tone="amber" />
      </div>

      <div className="dashboard-grid">
        <section className="surface">
          <div className="section-head">
            <div>
              <p className="eyebrow">Сегодня, {formatDateRu(today)}</p>
              <h2>Ближайшие занятия</h2>
            </div>
            <button className="ghost-btn" onClick={() => setActiveView("schedule")} type="button">
              <CalendarDays size={17} />
              Расписание
            </button>
          </div>
          <div className="lesson-list">
            {todayLessons.length ? (
              todayLessons.map((lesson) => (
                <LessonRow data={data} key={lesson.id} lessonId={lesson.id} />
              ))
            ) : (
              <EmptyState title="На сегодня занятий нет" text="Расписание можно расширить в разделе расписания." />
            )}
          </div>
        </section>

        <section className="surface">
          <div className="section-head">
            <div>
              <p className="eyebrow">Контроль</p>
              <h2>Риски по пропускам</h2>
            </div>
            <button className="ghost-btn" onClick={() => setActiveView("reports")} type="button">
              <Filter size={17} />
              Отчеты
            </button>
          </div>
          <div className="risk-list">
            {riskRows.length ? (
              riskRows.map((row) => (
                <div className="risk-row" key={row.student.id}>
                  <span className="avatar" style={{ background: row.student.avatarTone }}>
                    {getInitials(row.student.fullName)}
                  </span>
                  <div>
                    <strong>{row.student.fullName}</strong>
                    <small>
                      {findGroup(data.groups, row.student.groupId)?.name ?? "Без группы"} · {row.absent} пропусков
                    </small>
                  </div>
                  <div className="mini-bar" aria-label={`Посещаемость ${row.rate}%`}>
                    <span style={{ width: `${row.rate}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="Нет рисков" text="Данные появятся после первых отметок журнала." />
            )}
          </div>
        </section>
      </div>

      <section className="surface">
        <div className="section-head">
          <div>
            <p className="eyebrow">Лента</p>
            <h2>Последние уведомления</h2>
          </div>
          <button className="ghost-btn" onClick={() => setActiveView("notifications")} type="button">
            <Bell size={17} />
            Открыть
          </button>
        </div>
        <div className="notification-strip">
          {relevantNotes.length ? (
            relevantNotes.map((note) => (
              <NotificationCard
                data={data}
                key={note.id}
                note={note}
                onMarkRead={onMarkNotificationRead}
                user={user}
              />
            ))
          ) : (
            <EmptyState title="Нет уведомлений" text="Сообщения по пропускам и расписанию появятся здесь." />
          )}
        </div>
      </section>
    </section>
  );
}

function JournalView({
  data,
  setData,
  showToast,
  user,
}: {
  data: AppData;
  setData: Dispatch<SetStateAction<AppData>>;
  showToast: (message: string) => void;
  user: SessionUser;
}) {
  const groups = user.role === "student" ? data.groups.filter((group) => group.id === user.groupId) : data.groups;
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id ?? "");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [query, setQuery] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!groups.some((group) => group.id === selectedGroupId)) {
      setSelectedGroupId(groups[0]?.id ?? "");
    }
  }, [groups, selectedGroupId]);

  const lessonsForGroup = data.lessons.filter((lesson) => lesson.groupId === selectedGroupId);
  const lessonsForDate = lessonsForGroup.filter((lesson) => lesson.weekday === getWeekdayIndex(selectedDate));
  const lessonOptions = lessonsForDate.length ? lessonsForDate : lessonsForGroup;

  useEffect(() => {
    if (!lessonOptions.some((lesson) => lesson.id === selectedLessonId)) {
      setSelectedLessonId(lessonOptions[0]?.id ?? "");
    }
  }, [lessonOptions, selectedLessonId]);

  const students = data.profiles
    .filter((profile) => profile.role === "student" && profile.groupId === selectedGroupId)
    .filter((profile) => profile.fullName.toLowerCase().includes(query.toLowerCase()));
  const canMark = user.role === "admin" || user.role === "teacher";
  const selectedLesson = data.lessons.find((lesson) => lesson.id === selectedLessonId) ?? null;

  async function mark(student: Profile, status: AttendanceStatus) {
    if (!selectedLesson) return;
    setSavingKey(`${student.id}:${status}`);
    try {
      const record = await upsertAttendance(
        {
          lessonId: selectedLesson.id,
          studentId: student.id,
          date: selectedDate,
          status,
          note: status === "late" ? "Опоздание" : status === "excused" ? "Уважительная причина" : "",
          markedBy: user.id,
        },
        user.source === "demo",
      );

      setData((current) => ({
        ...current,
        attendance: [
          record,
          ...current.attendance.filter(
            (item) =>
              !(
                item.lessonId === record.lessonId &&
                item.studentId === record.studentId &&
                item.date === record.date
              ),
          ),
        ],
      }));

      if (status === "absent" && !hasAbsenceNotification(data, student.id, selectedDate)) {
        const subject = findSubject(data.subjects, selectedLesson.subjectId);
        const created = await createNotification(
          {
            title: "Пропуск занятия",
            message: `${student.fullName}: ${formatDateRu(selectedDate)}, ${subject?.title ?? "занятие"} отмечено как пропуск.`,
            audience: "user",
            groupId: null,
            userId: student.id,
            createdBy: user.id,
            type: "absence",
          },
          user.source === "demo",
        );
        setData((current) => ({
          ...current,
          notifications: [created.notification, ...current.notifications],
          notificationDeliveries: [...created.deliveries, ...current.notificationDeliveries],
        }));
      }

      showToast("Отметка сохранена.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Не удалось сохранить отметку.");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <section className="view-stack">
      <div className="toolbar surface">
        <label>
          <span>Дата</span>
          <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        </label>
        <label>
          <span>Группа</span>
          <select value={selectedGroupId} onChange={(event) => setSelectedGroupId(event.target.value)}>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
        <label className="wide-control">
          <span>Занятие</span>
          <select value={selectedLessonId} onChange={(event) => setSelectedLessonId(event.target.value)}>
            {lessonOptions.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lessonLabel(lesson, data.subjects, data.groups, data.profiles)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Поиск</span>
          <div className="input-shell compact">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ф.И.О." />
          </div>
        </label>
      </div>

      <section className="surface">
        <div className="section-head">
          <div>
            <p className="eyebrow">Журнал</p>
            <h2>{findGroup(data.groups, selectedGroupId)?.name ?? "Группа"}</h2>
          </div>
          {!canMark ? <span className="soft-badge">Только просмотр</span> : null}
        </div>

        {selectedLesson ? (
          <div className="attendance-table" role="table" aria-label="Журнал посещаемости">
            <div className="attendance-row head" role="row">
              <span>Студент</span>
              <span>Группа</span>
              <span>Статус</span>
              <span>Действие</span>
            </div>
            {students.map((student) => {
              const record = attendanceFor(data.attendance, selectedLesson.id, student.id, selectedDate);
              return (
                <div className="attendance-row" key={student.id} role="row">
                  <div className="person-cell">
                    <span className="avatar" style={{ background: student.avatarTone }}>
                      {getInitials(student.fullName)}
                    </span>
                    <div>
                      <strong>{student.fullName}</strong>
                      <small>{student.email}</small>
                    </div>
                  </div>
                  <span>{findGroup(data.groups, student.groupId)?.name ?? "Без группы"}</span>
                  <StatusChip status={record?.status ?? null} />
                  <div className="status-actions">
                    {(Object.keys(statusMeta) as AttendanceStatus[]).map((status) => (
                      <button
                        className={record?.status === status ? `status-btn ${statusMeta[status].tone} active` : "status-btn"}
                        disabled={!canMark || savingKey === `${student.id}:${status}`}
                        key={status}
                        onClick={() => void mark(student, status)}
                        title={statusMeta[status].label}
                        type="button"
                      >
                        {statusMeta[status].short}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {!students.length ? <EmptyState title="Нет студентов" text="Измените фильтр или добавьте пользователей в группу." /> : null}
          </div>
        ) : (
          <EmptyState title="Нет занятий" text="Для выбранной группы пока не создано расписание." />
        )}
      </section>
    </section>
  );
}

function ScheduleView({
  data,
  setData,
  showToast,
  user,
}: {
  data: AppData;
  setData: Dispatch<SetStateAction<AppData>>;
  showToast: (message: string) => void;
  user: SessionUser;
}) {
  const canManage = user.role === "admin";
  const teachers = data.profiles.filter((profile) => profile.role === "teacher" || profile.role === "admin");
  const [form, setForm] = useState<LessonInput>({
    groupId: data.groups[0]?.id ?? "",
    subjectId: data.subjects[0]?.id ?? "",
    teacherId: teachers[0]?.id ?? null,
    weekday: 0,
    startsAt: "09:00",
    endsAt: "10:30",
    room: "310",
  });

  async function submitLesson() {
    if (!form.groupId || !form.subjectId) return;
    try {
      const lesson = await createLesson(form, user.source === "demo");
      setData((current) => ({ ...current, lessons: [...current.lessons, lesson] }));
      showToast("Занятие добавлено.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Не удалось добавить занятие.");
    }
  }

  return (
    <section className="view-stack">
      {canManage ? (
        <section className="surface">
          <div className="section-head">
            <div>
              <p className="eyebrow">Редактор</p>
              <h2>Новое занятие</h2>
            </div>
            <button className="primary-btn inline" onClick={() => void submitLesson()} type="button">
              <Plus size={17} />
              Добавить
            </button>
          </div>
          <div className="form-grid">
            <label>
              <span>Группа</span>
              <select value={form.groupId} onChange={(event) => setForm({ ...form, groupId: event.target.value })}>
                {data.groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Предмет</span>
              <select value={form.subjectId} onChange={(event) => setForm({ ...form, subjectId: event.target.value })}>
                {data.subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Преподаватель</span>
              <select value={form.teacherId ?? ""} onChange={(event) => setForm({ ...form, teacherId: event.target.value || null })}>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>День</span>
              <select value={form.weekday} onChange={(event) => setForm({ ...form, weekday: Number(event.target.value) })}>
                {weekdays.map((day, index) => (
                  <option key={day} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Начало</span>
              <input type="time" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} />
            </label>
            <label>
              <span>Конец</span>
              <input type="time" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} />
            </label>
            <label>
              <span>Аудитория</span>
              <input value={form.room} onChange={(event) => setForm({ ...form, room: event.target.value })} />
            </label>
          </div>
        </section>
      ) : null}

      <section className="schedule-grid">
        {weekdays.map((day, index) => (
          <div className="day-column" key={day}>
            <div className="day-head">
              <span>{day}</span>
              <b>{data.lessons.filter((lesson) => lesson.weekday === index).length}</b>
            </div>
            <div className="day-lessons">
              {data.lessons
                .filter((lesson) => lesson.weekday === index)
                .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
                .map((lesson) => (
                  <LessonCard data={data} key={lesson.id} lessonId={lesson.id} />
                ))}
            </div>
          </div>
        ))}
      </section>
    </section>
  );
}

function DirectoryView({
  data,
  setData,
  showToast,
  user,
}: {
  data: AppData;
  setData: Dispatch<SetStateAction<AppData>>;
  showToast: (message: string) => void;
  user: SessionUser;
}) {
  const canManage = user.role === "admin";
  const [groupForm, setGroupForm] = useState<GroupInput>({
    name: "ПОВТ-1-1",
    course: 1,
    specialty: "Программное обеспечение вычислительной техники",
    curatorId: null,
    color: "#124e78",
  });
  const [profileForm, setProfileForm] = useState<ProfileInput>({
    fullName: "Новый студент",
    email: "student@example.com",
    role: "student",
    groupId: data.groups[0]?.id ?? null,
    position: "Студент",
    phone: "",
  });
  const [query, setQuery] = useState("");
  const visibleProfiles = data.profiles.filter((profile) => {
    const inScope = user.role === "student" ? profile.groupId === user.groupId || profile.id === user.id : true;
    return inScope && `${profile.fullName} ${profile.email}`.toLowerCase().includes(query.toLowerCase());
  });

  async function submitGroup() {
    try {
      const group = await createGroup(groupForm, user.source === "demo");
      setData((current) => ({ ...current, groups: [group, ...current.groups] }));
      showToast("Группа добавлена.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Не удалось добавить группу.");
    }
  }

  async function submitProfile() {
    try {
      const profile = await createDemoProfile(profileForm, user.source === "demo");
      setData((current) => ({ ...current, profiles: [...current.profiles, profile] }));
      showToast("Пользователь добавлен в демо-данные.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Не удалось добавить пользователя.");
    }
  }

  async function changeRole(profileId: string, role: Role) {
    try {
      const profile = await updateProfileRole(profileId, role, user.source === "demo");
      setData((current) => ({
        ...current,
        profiles: current.profiles.map((item) => (item.id === profile.id ? profile : item)),
      }));
      showToast("Роль обновлена.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Не удалось изменить роль.");
    }
  }

  return (
    <section className="view-stack">
      {canManage ? (
        <div className="split-grid">
          <section className="surface">
            <div className="section-head">
              <div>
                <p className="eyebrow">Группы</p>
                <h2>Добавить группу</h2>
              </div>
              <button className="primary-btn inline" onClick={() => void submitGroup()} type="button">
                <Plus size={17} />
                Сохранить
              </button>
            </div>
            <div className="form-grid two">
              <label>
                <span>Название</span>
                <input value={groupForm.name} onChange={(event) => setGroupForm({ ...groupForm, name: event.target.value })} />
              </label>
              <label>
                <span>Курс</span>
                <input
                  min={1}
                  max={5}
                  type="number"
                  value={groupForm.course}
                  onChange={(event) => setGroupForm({ ...groupForm, course: Number(event.target.value) })}
                />
              </label>
              <label className="wide-control">
                <span>Специальность</span>
                <input value={groupForm.specialty} onChange={(event) => setGroupForm({ ...groupForm, specialty: event.target.value })} />
              </label>
              <label>
                <span>Куратор</span>
                <select value={groupForm.curatorId ?? ""} onChange={(event) => setGroupForm({ ...groupForm, curatorId: event.target.value || null })}>
                  <option value="">Не выбран</option>
                  {data.profiles
                    .filter((profile) => profile.role !== "student")
                    .map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.fullName}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                <span>Цвет</span>
                <input type="color" value={groupForm.color} onChange={(event) => setGroupForm({ ...groupForm, color: event.target.value })} />
              </label>
            </div>
          </section>

          <section className="surface">
            <div className="section-head">
              <div>
                <p className="eyebrow">Демо</p>
                <h2>Добавить пользователя</h2>
              </div>
              <button className="primary-btn inline" onClick={() => void submitProfile()} type="button">
                <Plus size={17} />
                Сохранить
              </button>
            </div>
            <div className="form-grid two">
              <label className="wide-control">
                <span>Ф.И.О.</span>
                <input value={profileForm.fullName} onChange={(event) => setProfileForm({ ...profileForm, fullName: event.target.value })} />
              </label>
              <label>
                <span>Email</span>
                <input value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} />
              </label>
              <label>
                <span>Роль</span>
                <select value={profileForm.role} onChange={(event) => setProfileForm({ ...profileForm, role: event.target.value as Role })}>
                  {(Object.keys(roleLabels) as Role[]).map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Группа</span>
                <select value={profileForm.groupId ?? ""} onChange={(event) => setProfileForm({ ...profileForm, groupId: event.target.value || null })}>
                  <option value="">Без группы</option>
                  {data.groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Телефон</span>
                <input value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} />
              </label>
            </div>
          </section>
        </div>
      ) : null}

      <section className="surface">
        <div className="section-head">
          <div>
            <p className="eyebrow">Справочник</p>
            <h2>Пользователи</h2>
          </div>
          <div className="input-shell compact search-box">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск" />
          </div>
        </div>

        <div className="people-grid">
          {visibleProfiles.map((profile) => (
            <article className="person-card" key={profile.id}>
              <span className="avatar large" style={{ background: profile.avatarTone }}>
                {getInitials(profile.fullName)}
              </span>
              <div>
                <strong>{profile.fullName}</strong>
                <small>{profile.email}</small>
              </div>
              <span className={`role-pill ${profile.role}`}>{roleLabels[profile.role]}</span>
              <span>{findGroup(data.groups, profile.groupId)?.name ?? "Без группы"}</span>
              {canManage ? (
                <select value={profile.role} onChange={(event) => void changeRole(profile.id, event.target.value as Role)}>
                  {(Object.keys(roleLabels) as Role[]).map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </select>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="groups-strip">
        {data.groups.map((group) => (
          <article className="group-card" key={group.id} style={{ borderTopColor: group.color }}>
            <strong>{group.name}</strong>
            <span>{group.specialty}</span>
            <small>
              {group.course} курс · {data.profiles.filter((profile) => profile.groupId === group.id).length} чел.
            </small>
          </article>
        ))}
      </section>
    </section>
  );
}

function ReportsView({
  data,
  showToast,
  user,
}: {
  data: AppData;
  showToast: (message: string) => void;
  user: SessionUser;
}) {
  const groups = user.role === "student" ? data.groups.filter((group) => group.id === user.groupId) : data.groups;
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [dateFrom, setDateFrom] = useState(addDaysISO(-30));
  const [dateTo, setDateTo] = useState(todayISO());
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const group = findGroup(data.groups, groupId);
  const rows = buildReportRows(data, groupId, dateFrom, dateTo);
  const totalRecords = rows.reduce((sum, row) => sum + row.total, 0);
  const totalAbsences = rows.reduce((sum, row) => sum + row.absent, 0);
  const averageRate = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.rate, 0) / rows.length) : 0;

  function exportCsv() {
    downloadCsv(`attendance-report-${group?.name ?? "all"}.csv`, [
      ["Студент", "Группа", "Всего отметок", "Присутствовал", "Опоздания", "Пропуски", "Уважительные", "Процент"],
      ...rows.map((row) => [
        row.student.fullName,
        group?.name ?? "",
        String(row.total),
        String(row.present),
        String(row.late),
        String(row.absent),
        String(row.excused),
        `${row.rate}%`,
      ]),
    ]);
  }

  async function sendToTelegram() {
    if (user.source === "demo") {
      showToast("Telegram-отчеты работают после входа через Supabase.");
      return;
    }

    setSendingTelegram(true);
    try {
      const result = await sendTelegramReport({ groupId, dateFrom, dateTo });
      showToast(`Отчет отправлен в Telegram: ${result.sentCount} получателя.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Не удалось отправить отчет.");
    } finally {
      setSendingTelegram(false);
    }
  }

  return (
    <section className="view-stack">
      <div className="toolbar surface">
        <label>
          <span>Группа</span>
          <select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
            {groups.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>С</span>
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        </label>
        <label>
          <span>По</span>
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </label>
        <button className="primary-btn inline" onClick={exportCsv} type="button">
          <Download size={17} />
          CSV
        </button>
        <button
          className="ghost-btn"
          disabled={sendingTelegram}
          onClick={() => void sendToTelegram()}
          type="button"
        >
          <Send size={17} />
          Telegram
        </button>
      </div>

      <div className="kpi-grid">
        <MetricCard label="Средний процент" value={`${averageRate}%`} helper={group?.name ?? "Группа"} tone="blue" />
        <MetricCard label="Всего отметок" value={String(totalRecords)} helper="за период" tone="green" />
        <MetricCard label="Пропуски" value={String(totalAbsences)} helper="требуют контроля" tone="rose" />
        <MetricCard label="Студенты" value={String(rows.length)} helper="в отчете" tone="amber" />
      </div>

      <section className="surface">
        <div className="section-head">
          <div>
            <p className="eyebrow">Аналитика</p>
            <h2>Отчет по посещаемости</h2>
          </div>
        </div>
        <div className="report-table">
          {rows.map((row) => (
            <div className="report-row" key={row.student.id}>
              <div className="person-cell">
                <span className="avatar" style={{ background: row.student.avatarTone }}>
                  {getInitials(row.student.fullName)}
                </span>
                <div>
                  <strong>{row.student.fullName}</strong>
                  <small>{row.total} отметок</small>
                </div>
              </div>
              <div className="stacked-bar" aria-label={`Посещаемость ${row.rate}%`}>
                <span style={{ width: `${row.rate}%` }} />
              </div>
              <b>{row.rate}%</b>
              <span className="muted">{row.absent} Н</span>
              <span className="muted">{row.late} О</span>
            </div>
          ))}
          {!rows.length ? <EmptyState title="Нет данных" text="Выберите другой период или заполните журнал." /> : null}
        </div>
      </section>
    </section>
  );
}

function NotificationsView({
  data,
  onMarkNotificationRead,
  setData,
  showToast,
  user,
}: {
  data: AppData;
  onMarkNotificationRead: (notificationId: string) => void;
  setData: Dispatch<SetStateAction<AppData>>;
  showToast: (message: string) => void;
  user: SessionUser;
}) {
  const canSend = user.role === "admin" || user.role === "teacher";
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [form, setForm] = useState<NotificationInput>({
    title: "Важное сообщение",
    message: "Проверьте изменения в расписании.",
    audience: "all",
    groupId: null,
    userId: null,
    createdBy: user.id,
    type: "system",
  });
  const relevantNotes = getRelevantNotifications(data, user);
  const unreadNotes = relevantNotes.filter((note) => !isNotificationReadBy(data, note, user.id));
  const readNotes = relevantNotes.filter((note) => isNotificationReadBy(data, note, user.id));
  const visibleNotes =
    filter === "unread" ? unreadNotes : filter === "read" ? readNotes : relevantNotes;
  const deliveryTotals = aggregateNotificationStats(data, relevantNotes);

  async function submitNotification() {
    try {
      const payload = normalizeNotificationTarget(form);
      const created = await createNotification(payload, user.source === "demo");
      setData((current) => ({
        ...current,
        notifications: [created.notification, ...current.notifications],
        notificationDeliveries: [...created.deliveries, ...current.notificationDeliveries],
      }));
      showToast("Уведомление отправлено.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Не удалось отправить уведомление.");
    }
  }

  return (
    <section className="view-stack">
      {canSend ? (
        <section className="surface">
          <div className="section-head">
            <div>
              <p className="eyebrow">Рассылка</p>
              <h2>Новое уведомление</h2>
            </div>
            <button className="primary-btn inline" onClick={() => void submitNotification()} type="button">
              <Send size={17} />
              Отправить
            </button>
          </div>
          <div className="form-grid">
            <label>
              <span>Заголовок</span>
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </label>
            <label>
              <span>Тип</span>
              <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as NotificationInput["type"] })}>
                <option value="system">Системное</option>
                <option value="absence">Пропуск</option>
                <option value="schedule">Расписание</option>
              </select>
            </label>
            <label>
              <span>Аудитория</span>
              <select value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value as NotificationAudience })}>
                <option value="all">Все</option>
                <option value="group">Группа</option>
                <option value="user">Пользователь</option>
              </select>
            </label>
            {form.audience === "group" ? (
              <label>
                <span>Группа</span>
                <select value={form.groupId ?? ""} onChange={(event) => setForm({ ...form, groupId: event.target.value })}>
                  <option value="">Выберите группу</option>
                  {data.groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {form.audience === "user" ? (
              <label>
                <span>Пользователь</span>
                <select value={form.userId ?? ""} onChange={(event) => setForm({ ...form, userId: event.target.value })}>
                  <option value="">Выберите пользователя</option>
                  {data.profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.fullName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="wide-control">
              <span>Сообщение</span>
              <textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} rows={3} />
            </label>
          </div>
        </section>
      ) : null}

      <section className="surface notification-summary">
        <div>
          <p className="eyebrow">Статус</p>
          <h2>Сообщения</h2>
        </div>
        <div className="notification-kpis" aria-label="Сводка доставки">
          <span>
            <Send size={14} />
            {deliveryTotals.delivered}/{deliveryTotals.total}
          </span>
          <span>
            <Eye size={14} />
            {deliveryTotals.read}
          </span>
          <span>
            <Clock3 size={14} />
            {deliveryTotals.waiting}
          </span>
        </div>
        <div className="status-tabs" role="tablist" aria-label="Фильтр уведомлений">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
            type="button"
          >
            Все <b>{relevantNotes.length}</b>
          </button>
          <button
            className={filter === "unread" ? "active" : ""}
            onClick={() => setFilter("unread")}
            type="button"
          >
            Новые <b>{unreadNotes.length}</b>
          </button>
          <button
            className={filter === "read" ? "active" : ""}
            onClick={() => setFilter("read")}
            type="button"
          >
            Прочитано <b>{readNotes.length}</b>
          </button>
        </div>
      </section>

      <section className="notification-list">
        {visibleNotes.map((note) => (
          <NotificationCard
            data={data}
            key={note.id}
            note={note}
            onMarkRead={onMarkNotificationRead}
            user={user}
          />
        ))}
        {!visibleNotes.length ? <EmptyState title="Нет уведомлений" text="Администратор или преподаватель могут создать рассылку." /> : null}
      </section>
    </section>
  );
}

function MetricCard({ helper, label, tone, value }: { helper: string; label: string; tone: string; value: string }) {
  return (
    <article className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  );
}

function LessonRow({ data, lessonId }: { data: AppData; lessonId: string }) {
  const lesson = data.lessons.find((item) => item.id === lessonId);
  if (!lesson) return null;
  const subject = findSubject(data.subjects, lesson.subjectId);
  const group = findGroup(data.groups, lesson.groupId);
  const teacher = findProfile(data.profiles, lesson.teacherId);

  return (
    <article className="lesson-row">
      <span className="lesson-dot" style={{ background: subject?.color }} />
      <div>
        <strong>{subject?.title ?? "Предмет"}</strong>
        <small>
          {group?.name ?? "Группа"} · {teacher?.fullName ?? "Преподаватель"}
        </small>
      </div>
      <b>{lesson.startsAt}</b>
      <span>{lesson.room}</span>
    </article>
  );
}

function LessonCard({ data, lessonId }: { data: AppData; lessonId: string }) {
  const lesson = data.lessons.find((item) => item.id === lessonId);
  if (!lesson) return null;
  const subject = findSubject(data.subjects, lesson.subjectId);
  const group = findGroup(data.groups, lesson.groupId);
  const teacher = findProfile(data.profiles, lesson.teacherId);

  return (
    <article className="lesson-card" style={{ borderLeftColor: subject?.color }}>
      <strong>{subject?.shortTitle ?? "Предмет"}</strong>
      <span>{group?.name ?? "Группа"}</span>
      <small>{teacher?.fullName ?? "Преподаватель"}</small>
      <b>
        {lesson.startsAt}-{lesson.endsAt}
      </b>
      <em>{lesson.room}</em>
    </article>
  );
}

function NotificationCard({
  data,
  note,
  onMarkRead,
  user,
}: {
  data: AppData;
  note: AppData["notifications"][number];
  onMarkRead?: (notificationId: string) => void;
  user?: SessionUser;
}) {
  const group = findGroup(data.groups, note.groupId);
  const targetUser = findProfile(data.profiles, note.userId);
  const author = findProfile(data.profiles, note.createdBy);
  const stats = notificationReadStats(data, note);
  const isUnread = user ? !isNotificationReadBy(data, note, user.id) : false;
  const isStaff = user?.role === "admin" || user?.role === "teacher";

  return (
    <article className={`notification-card ${note.type} ${isUnread ? "unread" : ""}`}>
      <div className="notification-card-head">
        <div>
          <strong>{note.title}</strong>
          <small>{formatDateTimeRu(note.createdAt)}</small>
        </div>
        <span className={`read-state ${isUnread ? "unread" : "read"}`}>
          {isUnread ? <Clock3 size={14} /> : <CheckCheck size={14} />}
          {isUnread ? "Новое" : "Прочитано"}
        </span>
      </div>
      <p>{note.message}</p>
      <div className="delivery-row">
        <span>
          <Send size={14} />
          {stats.delivered}/{stats.total} доставлено
        </span>
        <span>
          <Eye size={14} />
          {stats.read} прочитали
        </span>
        {stats.telegramSent > 0 ? <span>{stats.telegramSent} Telegram</span> : null}
        {isStaff && stats.waiting > 0 ? <span>{stats.waiting} ожидают</span> : null}
        {isStaff && stats.failed > 0 ? <span className="danger-text">{stats.failed} ошибок</span> : null}
      </div>
      {isStaff && stats.total > 0 ? (
        <div className="delivery-progress" aria-label={`Прочитано ${percent(stats.read, stats.total)}%`}>
          <span style={{ width: `${percent(stats.read, stats.total)}%` }} />
        </div>
      ) : null}
      <footer>
        <span>{note.audience === "all" ? "Все" : group?.name ?? targetUser?.fullName ?? "Адресат"}</span>
        <span>{author?.fullName ?? "Система"}</span>
      </footer>
      {isUnread && onMarkRead ? (
        <button className="ghost-btn mark-read-btn" onClick={() => onMarkRead(note.id)} type="button">
          <CheckCheck size={16} />
          Отметить прочитанным
        </button>
      ) : null}
    </article>
  );
}

function StatusChip({ status }: { status: AttendanceStatus | null }) {
  if (!status) return <span className="status-chip neutral">Не отмечено</span>;
  const meta = statusMeta[status];
  return <span className={`status-chip ${meta.tone}`}>{meta.label}</span>;
}

function EmptyState({ text, title }: { text: string; title: string }) {
  return (
    <div className="empty-state">
      <ChevronRight size={18} />
      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
    </div>
  );
}

function scopedStudents(data: AppData, user: SessionUser) {
  return data.profiles.filter((profile) => {
    if (profile.role !== "student") return false;
    if (user.role === "student") return profile.id === user.id;
    return true;
  });
}

function getRelevantNotifications(data: AppData, user: SessionUser) {
  if (user.role === "admin" || user.role === "teacher") {
    return [...data.notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return data.notifications
    .filter((note) => note.audience === "all" || note.userId === user.id || note.groupId === user.groupId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function notificationRecipients(data: AppData, note: AppData["notifications"][number]) {
  if (note.audience === "user") {
    return data.profiles.filter((profile) => profile.id === note.userId);
  }

  if (note.audience === "group") {
    return data.profiles.filter((profile) => profile.groupId === note.groupId);
  }

  return data.profiles;
}

function notificationReadStats(data: AppData, note: AppData["notifications"][number]) {
  const recipients = notificationRecipients(data, note);
  const appDeliveries = data.notificationDeliveries.filter(
    (delivery) => delivery.notificationId === note.id && delivery.channel === "app",
  );
  const deliveriesByProfile = new Map(
    appDeliveries.map((delivery) => [delivery.profileId, delivery]),
  );
  const hasDeliveryRows = appDeliveries.length > 0;
  const delivered = recipients.filter((profile) => {
    const delivery = deliveriesByProfile.get(profile.id);
    if (!hasDeliveryRows) return true;
    return Boolean(
      delivery && ["sent", "delivered", "read"].includes(delivery.status),
    );
  }).length;
  const read = recipients.filter((profile) => isNotificationReadBy(data, note, profile.id)).length;
  const failed = appDeliveries.filter((delivery) => delivery.status === "failed").length;
  const telegramSent = data.notificationDeliveries.filter(
    (delivery) =>
      delivery.notificationId === note.id &&
      delivery.channel === "telegram" &&
      ["sent", "delivered", "read"].includes(delivery.status),
  ).length;

  return {
    total: recipients.length,
    delivered,
    read,
    waiting: Math.max(recipients.length - read - failed, 0),
    failed,
    telegramSent,
  };
}

function aggregateNotificationStats(data: AppData, notes: AppData["notifications"]) {
  return notes.reduce(
    (acc, note) => {
      const stats = notificationReadStats(data, note);
      acc.total += stats.total;
      acc.delivered += stats.delivered;
      acc.read += stats.read;
      acc.waiting += stats.waiting;
      acc.failed += stats.failed;
      return acc;
    },
    { total: 0, delivered: 0, read: 0, waiting: 0, failed: 0 },
  );
}

function notificationDeliveryFor(
  data: AppData,
  note: AppData["notifications"][number],
  profileId: string,
) {
  return data.notificationDeliveries.find(
    (delivery) =>
      delivery.notificationId === note.id &&
      delivery.profileId === profileId &&
      delivery.channel === "app",
  );
}

function isNotificationReadBy(
  data: AppData,
  note: AppData["notifications"][number],
  profileId: string,
) {
  const delivery = notificationDeliveryFor(data, note, profileId);
  if (delivery) return delivery.status === "read" || Boolean(delivery.readAt);
  return note.readBy.includes(profileId);
}

function upsertLocalDelivery(
  deliveries: AppData["notificationDeliveries"],
  delivery: AppData["notificationDeliveries"][number],
) {
  const existingIndex = deliveries.findIndex((item) => item.id === delivery.id);
  if (existingIndex < 0) return [delivery, ...deliveries];

  return deliveries.map((item, index) => (index === existingIndex ? delivery : item));
}

function hasAbsenceNotification(data: AppData, userId: string, date: string) {
  return data.notifications.some(
    (note) => note.type === "absence" && note.userId === userId && note.message.includes(formatDateRu(date)),
  );
}

function buildRiskRows(data: AppData, students: Profile[]) {
  return buildReportRows(data, "", addDaysISO(-45), todayISO(), students)
    .filter((row) => row.total > 0 && (row.absent || row.rate < 80))
    .sort((a, b) => b.absent - a.absent || a.rate - b.rate);
}

function buildReportRows(
  data: AppData,
  groupId: string,
  dateFrom: string,
  dateTo: string,
  providedStudents?: Profile[],
) {
  const students =
    providedStudents ??
    data.profiles.filter((profile) => profile.role === "student" && (!groupId || profile.groupId === groupId));

  return students.map((student) => {
    const records = data.attendance.filter(
      (record) =>
        record.studentId === student.id &&
        record.date >= dateFrom &&
        record.date <= dateTo &&
        (!groupId || student.groupId === groupId),
    );
    const present = records.filter((record) => record.status === "present").length;
    const late = records.filter((record) => record.status === "late").length;
    const absent = records.filter((record) => record.status === "absent").length;
    const excused = records.filter((record) => record.status === "excused").length;
    const weighted = records.reduce((sum, record) => sum + statusMeta[record.status].weight, 0);
    return {
      student,
      total: records.length,
      present,
      late,
      absent,
      excused,
      rate: percent(weighted, records.length),
    };
  });
}

function normalizeNotificationTarget(input: NotificationInput): NotificationInput {
  if (input.audience === "all") {
    return { ...input, groupId: null, userId: null };
  }
  if (input.audience === "group") {
    if (!input.groupId) throw new Error("Выберите группу.");
    return { ...input, userId: null };
  }
  if (!input.userId) throw new Error("Выберите пользователя.");
  return { ...input, groupId: null };
}
