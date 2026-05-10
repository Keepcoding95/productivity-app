# Flow · Productivity app

A **learning-friendly, production-minded** task workspace: **Laravel 12** JSON API, **Vue 3** SPA (Vite), **Tailwind CSS**, **Laravel Sanctum** bearer tokens, PHPUnit coverage, and GitHub Actions CI.

---

## Features

- **Auth**: register, login, logout, email verification, forgot/reset password  
- **Projects** and **tasks** (CRUD, pagination, filters, energy tags, due date/time)  
- **Views**: list, Kanban (batch reorder API), calendar with mobile week strip + agenda  
- **Notifications**: deadline reminders via scheduler command  
- **UX**: dark/light theme, responsive layout, safe-area aware HUDs  

---

## Requirements

| Tool | Version / notes |
|------|------------------|
| PHP | ^8.2 |
| Composer | 2.x |
| Node.js | 20.x (matches CI) |
| Database | SQLite (default dev) or MySQL/PostgreSQL |

---

## Quick start (local)

```bash
git clone <your-repo-url> productivity-app
cd productivity-app
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite   # if using SQLite (see DATABASE_URL in .env)
php artisan migrate
npm ci
npm run build
php artisan serve
```

Open the URL Laravel prints (often `http://127.0.0.1:8000`). Register a user and use the UI.

**Split dev server** (Vite on another host/port): set `VITE_API_URL` in `.env` to your Laravel `/api` base (see `.env.example` comment).

---

## Configuration highlights

| Variable | Purpose |
|----------|---------|
| `APP_URL` | Must match the site URL (verification redirect, signed URLs). |
| `APP_ENV=local` | With `VerifyEmailUnlessLocal`, API **does not** require verified email locally — convenient on Laragon without mail. |
| `MAIL_*` | Needed for verification and password reset in **production**. |
| `VITE_API_URL` | Optional; when using `npm run dev` against another origin. |

Never commit `.env`. Copy from `.env.example` only.

---

## Email verification

In **production** (and in tests), task/project APIs require a **verified** email. Locally (`APP_ENV=local`), verification is relaxed so you can learn without configuring mail.

---

## Scheduler (deadline reminders)

Registered in `bootstrap/app.php` — daily command `notifications:send-deadline-reminders`. On a real server, Cron must call Laravel every minute:

```cron
* * * * * cd /path-to-your-app && php artisan schedule:run >> /dev/null 2>&1
```

---

## API rate limits (HTTP 429)

Throttle middleware on selected routes, per IP:

| Endpoint group | Default limit |
|----------------|----------------|
| `POST /api/login`, `POST /api/register` | 12 requests / minute |
| `POST /api/forgot-password`, `POST /api/reset-password` | 6 / minute |
| `POST /api/email/verification-notification` | 6 / minute |

Adjust in `routes/api.php` if your deployment needs different numbers.

---

## Quality checks

```bash
php artisan test      # PHPUnit
npm run lint          # ESLint (JS)
npm run build         # Vite production build
```

CI runs **`composer install` → `php artisan test`** and **`npm ci` → `npm run build`** (see `.github/workflows/ci.yml`).

---

## Security

See [SECURITY.md](SECURITY.md). Run `composer audit` and `npm audit` regularly before deploying.

---

## License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE).

---

## Acknowledgements

**How this was built:** Much of the project came together through **vibe coding** — iterative, exploratory development paired with AI assistance — using **[Cursor](https://cursor.com)** as the main editor. The sections above still describe a normal Laravel/Vue app: setup, security, rate limits, and CI apply whether you use Cursor or not.

**Stack:** Built with [Laravel](https://laravel.com), [Vue](https://vuejs.org), [Vite](https://vitejs.dev), and [Tailwind CSS](https://tailwindcss.com).
