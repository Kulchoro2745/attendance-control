# AttendIQ

Веб-приложение для учета посещаемости с ролями, расписанием, журналом, отчетами и уведомлениями. Проект сделан под тему ВКР: "Веб-приложение для учета посещаемости с функцией уведомлений".

## Возможности

- регистрация и авторизация через Supabase Auth;
- роли: администратор, преподаватель, пользователь/студент;
- справочник пользователей и групп;
- расписание занятий;
- журнал посещаемости по дате, группе и занятию;
- автоматическое уведомление при пропуске;
- статусы доставок уведомлений: доставлено, прочитано, ожидает, ошибка;
- отчеты по группе и периоду с экспортом CSV;
- отправка отчетов в Telegram через Supabase Edge Functions с кнопкой подтверждения просмотра;
- демо-режим без Supabase ключей для защиты и локальной проверки.

## Технологии

- React + TypeScript + Vite;
- Supabase Auth, Postgres, Row Level Security;
- lucide-react для интерфейсных иконок;
- адаптивный CSS без UI-kit зависимости.

## Запуск

```bash
npm install
npm run dev
```

Локальный адрес: `http://127.0.0.1:5173`.

Без `.env.local` приложение запускается в демо-режиме. Для реального Supabase подключения создайте `.env.local`:

```bash
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_your_key_or_anon_key"
```

## Supabase

1. Создайте проект в Supabase.
2. Выполните SQL из файла `supabase/migrations/20260424190000_attendance_platform.sql`.
3. Вставьте URL и publishable/anon key в `.env.local`.
4. Зарегистрируйте первого пользователя через интерфейс.
5. Назначьте ему роль администратора в SQL Editor:

```sql
update public.profiles
set role = 'admin', position = 'Администратор учебной части'
where email = 'your-email@example.com';
```

Миграция включает RLS-политики для всех публичных таблиц. Служебные security definer функции вынесены в приватную схему `app_private`.

## Telegram bot

Интеграция реализована через две Supabase Edge Functions:

- `telegram-webhook` принимает `/start` и `/stop` от Telegram;
- `send-attendance-report` отправляет отчет активным подписчикам.

В Supabase Edge Function Secrets должны быть заданы:

```bash
TELEGRAM_BOT_TOKEN="token-from-botfather"
TELEGRAM_WEBHOOK_SECRET="random-secret"
TELEGRAM_ALLOWED_USERNAMES="Choke2745,Adilkan_dev"
```

После деплоя webhook нужно зарегистрировать в Telegram:

```bash
https://api.telegram.org/bot<token>/setWebhook?url=https://kwnliopkbeotibzkrbki.supabase.co/functions/v1/telegram-webhook&secret_token=<random-secret>
```

Пользователи `@Choke2745` и `@Adilkan_dev` должны открыть бота и нажать `/start`. После этого кнопка `Telegram` в разделе отчетов отправит им отчет.

Каждый Telegram-отчет сохраняет отдельные доставки в `telegram_report_deliveries`.
Статусы: `pending`, `sent`, `read`, `failed`. Статус `read` фиксируется кнопкой
`Прочитано` внутри Telegram-сообщения.

## GitHub Pages

Workflow для деплоя находится в `.github/workflows/pages.yml`. Он собирает Vite-приложение с Supabase URL и publishable key и публикует `dist` в GitHub Pages.

## Проверка

```bash
npm run build
```

Скриншоты локальной проверки лежат в `output/playwright/`.
