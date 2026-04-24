import {
  ArrowRight,
  BadgeCheck,
  Database,
  GraduationCap,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { FormEvent, useState } from "react";
import type { Profile, SessionUser } from "../types";
import { getInitials, roleLabels } from "../utils";
import { isSupabaseConfigured } from "../lib/supabase";

interface AuthScreenProps {
  profiles: Profile[];
  loading: boolean;
  authError: string | null;
  onDemoLogin: (profile: Profile) => void;
  onSupabaseLogin: (email: string, password: string) => Promise<void>;
  onSupabaseSignUp: (name: string, email: string, password: string) => Promise<void>;
  restoredUser: SessionUser | null;
}

const roleIcons = {
  admin: ShieldCheck,
  teacher: BadgeCheck,
  student: GraduationCap,
};

export function AuthScreen({
  profiles,
  loading,
  authError,
  onDemoLogin,
  onSupabaseLogin,
  onSupabaseSignUp,
  restoredUser,
}: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("admin@attendiq.local");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("Новый пользователь");

  const demoUsers = profiles.filter((profile) =>
    ["demo_admin", "teacher_askar", "student_azamat"].includes(profile.id),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "login") {
      await onSupabaseLogin(email, password);
      return;
    }
    await onSupabaseSignUp(name, email, password);
  }

  return (
    <main className="auth-page">
      <section className="auth-copy">
        <div className="brand-mark">
          <Database size={24} />
          <span>AttendIQ</span>
        </div>
        <h1>Учет посещаемости для колледжа</h1>
        <p>
          Журнал посещаемости, расписание, роли, отчеты и уведомления в одном рабочем
          интерфейсе.
        </p>
        <div className="auth-metrics" aria-label="Ключевые возможности">
          <span>RLS</span>
          <span>Supabase Auth</span>
          <span>React SPA</span>
        </div>
      </section>

      <section className="auth-panel" aria-label="Вход в систему">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Быстрый старт</p>
            <h2>Выберите роль</h2>
          </div>
          {restoredUser ? <span className="soft-badge">Сессия активна</span> : null}
        </div>

        <div className="demo-grid">
          {demoUsers.map((profile) => {
            const Icon = roleIcons[profile.role];
            return (
              <button
                className="demo-user"
                key={profile.id}
                type="button"
                onClick={() => onDemoLogin(profile)}
              >
                <span className="avatar" style={{ background: profile.avatarTone }}>
                  {getInitials(profile.fullName)}
                </span>
                <span>
                  <strong>{roleLabels[profile.role]}</strong>
                  <small>{profile.fullName}</small>
                </span>
                <Icon size={18} />
              </button>
            );
          })}
        </div>

        <div className="divider">
          <span>или Supabase</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="segmented">
            <button
              className={mode === "login" ? "active" : ""}
              type="button"
              onClick={() => setMode("login")}
            >
              Вход
            </button>
            <button
              className={mode === "signup" ? "active" : ""}
              type="button"
              onClick={() => setMode("signup")}
            >
              Регистрация
            </button>
          </div>

          {mode === "signup" ? (
            <label>
              <span>Ф.И.О.</span>
              <div className="input-shell">
                <UserRound size={18} />
                <input value={name} onChange={(event) => setName(event.target.value)} required />
              </div>
            </label>
          ) : null}

          <label>
            <span>Email</span>
            <div className="input-shell">
              <Mail size={18} />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </label>

          <label>
            <span>Пароль</span>
            <div className="input-shell">
              <LockKeyhole size={18} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
            </div>
          </label>

          {!isSupabaseConfigured ? (
            <p className="inline-note">
              Supabase ключи не заданы, поэтому форма реального входа отключена. Демо-режим
              полностью работает локально.
            </p>
          ) : null}

          {authError ? <p className="form-error">{authError}</p> : null}

          <button className="primary-btn" type="submit" disabled={loading || !isSupabaseConfigured}>
            <span>{mode === "login" ? "Войти через Supabase" : "Создать аккаунт"}</span>
            <ArrowRight size={18} />
          </button>
        </form>
      </section>
    </main>
  );
}
