# Routine — University Timetable & Planner

A Django site for managing your weekly class schedule, gym routine, and events,
with per-user accounts, an alternating Week A/Week B pattern that works for
**any past or future week**, a live "next up" timeline, a scratchpad, and
JSON backup/restore.

## Stack

- Django 6 (server-rendered pages + a small JSON API for the interactive grid)
- SQLite for local dev, Postgres-ready for production (`DATABASE_URL`)
- Whitenoise for serving static files in production (no separate CDN needed)
- No frontend build step — plain CSS/JS in `static/`

## Local setup

```bash
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env              # then edit values if you want

python manage.py migrate
python manage.py createsuperuser  # optional, for /admin
python manage.py runserver
```

Visit `http://127.0.0.1:8000/accounts/signup/` to create your account — a
starter schedule (a couple of classes, a gym slot, an event) is seeded
automatically so the app isn't empty on first login.

## How the Week A / Week B pattern works

Each user has a `Profile.week_a_anchor` date (defaults to a Monday in the
settings) that acts as the reference point. Every displayed week's type is
computed by counting how many weeks it is from that anchor — even or odd —
so navigating forward or backward with the `‹` / `›` arrows always shows the
correct pattern, indefinitely into the future or past. If your university's
rotation ever skips a week (holiday, reading week, etc.), click the Week A/B
toggle in the header to manually pin that one week — it's remembered as an
override without disturbing the automatic pattern for every other week.

## Project layout

```
config/       Django project settings, root URLs
accounts/     signup/login/logout
planner/      models, views, JSON API for events/tasks/settings
templates/    base + accounts + planner templates
static/       styles.css, app.js (grid rendering + modals), icons.js
```

## Deploying

The app reads its configuration from environment variables (see
`.env.example`), so the same code runs locally and in production.

1. Set `DJANGO_SECRET_KEY` to a long random value.
2. Set `DJANGO_DEBUG=False`.
3. Set `DJANGO_ALLOWED_HOSTS` to your domain (comma-separated).
4. Set `DJANGO_CSRF_TRUSTED_ORIGINS` to `https://yourdomain.com`.
5. Set `DATABASE_URL` to a Postgres connection string (most hosts provision
   this for you automatically) — otherwise it falls back to SQLite.

Any host that runs a `Procfile` (Railway, Heroku-compatible platforms, etc.)
can use this repo as-is:

```
release: python manage.py migrate
web: gunicorn config.wsgi --log-file -
```

On a plain VM, run the same two commands yourself, then front gunicorn with
nginx and run `python manage.py collectstatic` before starting the process
(Whitenoise serves the collected files directly, no nginx static config
needed).

## Pushing to GitHub

```bash
git init                 # already done for you in this project
git add .
git commit -m "Initial commit"
git remote add origin git@github.com:<you>/<repo>.git
git push -u origin main
```

`db.sqlite3`, `venv/`, and `.env` are already git-ignored — never commit
real secrets or your local database.
