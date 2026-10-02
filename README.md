# Foxy List — Task Manager Platform

A full-stack, two-application task manager: a **React + Vite** single-page frontend and an **Express + MongoDB** REST backend. Users sign in, manage tasks on a three-board drag-and-drop board, and administrators manage every account on the platform. The backend documents itself with an OpenAPI specification that the frontend renders as an in-app API reference.

| | |
| --- | --- |
| **Applications** | [`web-frontend/`](web-frontend/) · [`web-backend/`](web-backend/) |
| **Frontend** | React 19, Vite 8, React Router 7, TanStack Query 5, Tailwind CSS 4 |
| **Backend** | Node.js, Express 5, Mongoose 9, Zod 4, JSON Web Tokens, Cloudinary |
| **Database** | MongoDB (Atlas or local) |
| **Frontend port** | `5173` (dev server, set by Vite) |
| **Backend port** | `5000` (default, set by `PORT`) |
| **API docs (Swagger UI)** | `http://localhost:5000/api-docs` |
| **API docs (in-app)** | `http://localhost:5173/api-docs` |

---

## Table of contents

- [Platform overview](#platform-overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Available commands](#available-commands)
- [Project structure](#project-structure)
- [Backend API](#backend-api)
- [Frontend routes](#frontend-routes)
- [Authentication and authorization](#authentication-and-authorization)
- [Database](#database)
- [External services](#external-services)
- [Key data flows](#key-data-flows)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Security notes](#security-notes)

---

## Platform overview

Foxy List is a task manager built as two independent applications that live side by side in this repository. There is no root `package.json` and no workspace tooling — each app is installed, run, and built on its own.

### What the platform does

- **Accounts** — register, sign in, sign out, and password recovery, with a session that is a JWT held in an `httpOnly` cookie.
- **A three-board task list** — every user has their own board of `To Do`, `Ongoing` and `Done` columns. Cards are dragged between columns and reordered within them.
- **An admin area** — totals for users and tasks, plus a searchable, filterable, sortable, paginated users table with management actions (rename, change role, block/unblock, set a password, replace a profile picture, delete).
- **Profile pictures** — uploaded as images and stored in Cloudinary; only the resulting URL is kept in MongoDB.
- **Self-documenting API** — the backend builds an OpenAPI 3.0.3 document from its own code and serves it at `/openapi.json`, and the frontend renders that same document as a read-only reference page at `/api-docs`.

### The two applications

| | `web-frontend` | `web-backend` |
| --- | --- | --- |
| Purpose | The user interface | The REST API and the database |
| Entry point | `index.html` → `src/main.jsx` | `server.js` |
| Runs on | The browser | A Node.js server |
| Dev command | `npm run dev` | `npm run dev` (or `npm start`) |
| Build step | Yes — Vite bundles to `dist/` | None — plain ES modules |
| Reads config from | `web-frontend/.env` | `web-backend/.env` |
| Own README | [web-frontend/README.md](web-frontend/README.md) | [web-backend/README.md](web-backend/README.md) |

---

## Architecture

### How the two applications fit together

The browser only ever talks to **one origin**. That is deliberate and it is the single most important architectural fact about the platform.

```
   Browser
      │
      │  All requests are same-origin, cookies included
      ▼
┌──────────────────────────────────────────────┐
│  web-frontend  (Vite dev server :5173)       │
│  or  Vercel (static build)                   │
│                                              │
│  React SPA ── proxies /api/*  ──────────┐    │
└──────────────────────────────┬───────────┼────┘
                               │           │
       /openapi.json ──────────┘           │
                               │           ▼
                               │   ┌───────────────────────────────┐
                               │   │  web-backend  (Express :5000)  │
                               │   │                               │
                               │   │  routes → controllers →        │
                               │   │  services → models → MongoDB   │
                               │   │                               │
                               │   │  /openapi.json  (OpenAPI doc)  │
                               │   │  /api-docs     (Swagger UI)    │
                               │   └───────────────┬───────────────┘
                               │                   │
                               ▼                   ▼
                          Cloudinary          MongoDB
                        (profile pictures)
```

**In development**, `vite.config.js` proxies two paths to the backend on `http://localhost:5000`:

| Proxied path | Target |
| --- | --- |
| `^/api/` | `http://localhost:5000` |
| `^/openapi\.json$` | `http://localhost:5000` |

Those keys are **regular expressions**, and they have to be. Vite matches a plain key such as `/api` with `url.startsWith(key)`, which would also match `/api-docs` — the app's own API reference page, which must render the React route rather than the backend's Swagger UI. The trailing slash and the anchors keep the proxy on real API paths only.

**In production**, `web-frontend/vercel.json` does the same job with Vercel rewrites, forwarding `/api/*` and `/openapi.json` to the deployed backend.

The consequence in both cases: `VITE_API_BASE_URL` is left **empty**, so every request goes to the origin the page was served from. The session cookie is therefore a **first-party** cookie, which is what makes it survive at all — browsers are increasingly unwilling to carry a session cookie cross-site. Setting `VITE_API_BASE_URL` to an absolute URL is supported, but it makes every request cross-site and requires the backend cookie to be `SameSite=None; Secure`.

### Backend layering

A request flows **route → controller → service → model → database**, and each layer only knows about the one below it.

| Layer | Responsibility | Must not |
| --- | --- | --- |
| **Routes** | Attach middleware, name the endpoints | Contain anything else |
| **Controllers** | Validate the request with Zod, call one service function, pick a status code | Hold business rules or queries |
| **Services** | The rules: ownership, self-lockouts, board ordering, hashing, cookies | Call Mongoose directly, or build a filter |
| **Models** | The only place a database query is written | Contain business rules |
| **Middleware** | What is true across many routes: auth, the admin boundary, error shaping | — |

### Frontend layering

Components never call `fetch`. Every request goes through `src/api-client/`, and every server read is a TanStack Query query:

```
Components / Pages
      │
      ▼
Hooks  (useTasks, useAdminActions, useAvatarUpload, …)
      │
      ▼
Query options  (queryOptions/ — one module per resource)
      │
      ▼
api-client  (auth, users, tasks, admin, docs)  →  client.js
      │
      ▼
fetch  — always with credentials: "include"
```

`client.js` holds the base URL, adds the session cookie, parses the response, and turns any failure into a single readable `ApiRequestError` carrying both a user-facing message and the HTTP status — so a caller can tell "you are signed out" (401) from "not allowed" (403) without parsing text.

## Prerequisites

| Requirement | Version / notes |
| --- | --- |
| **Node.js** | 18 or newer (developed and verified on v22). Required by both apps — neither declares an `engines` field, so use a current LTS. |
| **npm** | 9 or newer (ships with Node 18+). Both apps have a committed `package-lock.json`; `npm ci` is the reproducible install. |
| **MongoDB** | Any reachable instance — local `mongod`, Docker, or MongoDB Atlas. The backend uses `mongoose.connect`, so any MongoDB the driver supports works. |
| **A Cloudinary account** | Only needed to upload profile pictures. The three `CLOUDINARY_*` variables are required by the backend at first upload. |
| **A browser** | Any current browser. The dev experience was verified on Chromium-based browsers. |

No global CLI tools are needed. The backend has no build step and no compiler — it runs as plain ES modules.

---

## Getting started

From a fresh clone, with no configuration in place.

### 1. Install the backend dependencies

```bash
cd web-backend
npm install
```

### 2. Create the backend `.env`

```bash
cp .env.example .env      # macOS / Linux
copy .env.example .env    # Windows PowerShell / cmd
```

Then fill in the values. `.env.example` documents every variable; the minimum needed to boot is:

| Variable | What to put there |
| --- | --- |
| `MONGODB_URI` | Your MongoDB connection string, e.g. `mongodb://127.0.0.1:27017/foxylist` or your Atlas URI. |
| `JWT_SECRET` | A long random string used to sign session tokens. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | From your Cloudinary dashboard. |

> `.env` is gitignored in both applications. **Never commit it.** See [Environment variables](#environment-variables) for the full table.

### 3. Start the backend

```bash
npm run dev        # nodemon, restarts on change  — use this while developing
# or
npm start          # plain `node server.js`       — use this for tests
```

The server **connects to the database before it starts listening**, so it is never reachable with nothing behind it. On success you will see:

```
Database connection successful (<host>)
Server running on port 5000
[cors] allowed origins: http://localhost:5173
```

Check it is alive:

```bash
curl http://localhost:5000
# → { "message": "Foxy List API is running" }
```

### 4. Install the frontend dependencies

In a second terminal:

```bash
cd web-frontend
npm install
```

### 5. Create the frontend `.env`

```bash
cp .env            # if a .env is not already present, create it
```

The frontend needs exactly one variable:

```dotenv
VITE_API_BASE_URL=
```

Leave it **empty** for local development. That means "same origin as this page", which is what the Vite dev proxy is for. Do not point it at `http://localhost:5000` — that would make every request cross-site, and the session cookie would stop working.

> Vite reads `.env` **only at startup**. Restart the dev server after changing it.

### 6. Start the frontend

```bash
npm run dev
```

Open <http://localhost:5173>.

### 7. Create your first account

Click **Register** and create an account. Then sign in.

- **On an empty database**, the very first account created is automatically promoted to `admin`, and `/admin` becomes reachable. That is how a fresh deployment gets its first administrator.
- **On a database that already has users**, every new account is a plain `user`. Promote one deliberately:

```bash
cd web-backend
npm run seed:admin you@example.com      # accepts an email address or a user id
```

### Running both at once

Two terminals, from the repository root:

```bash
# Terminal 1 — the API on :5000
cd web-backend && npm run dev

# Terminal 2 — the app on :5173
cd web-frontend && npm run dev
```

### Useful URLs once running

| URL | What it is |
| --- | --- |
| <http://localhost:5173> | The application |
| <http://localhost:5173/dashboard> | The signed-in task board |
| <http://localhost:5173/admin/overview> | Admin dashboard totals |
| <http://localhost:5173/admin/users> | The admin users table |
| <http://localhost:5173/api-docs> | The API reference, rendered inside the app |
| <http://localhost:5000/api-docs> | Swagger UI — the place to actually try requests |
| <http://localhost:5000/openapi.json> | The raw OpenAPI 3.0.3 document |

---
## Environment variables

Configuration lives in environment variables, never in the source. Both applications keep their configuration in their own `.env`, and **both `.env` files are gitignored** — no secret in this repository is ever committed.

### `web-backend/.env`

Copy `web-backend/.env.example` to `web-backend/.env` and fill it in. Every variable below is listed in that example file.

| Variable | Required | Default | Used by | Purpose |
| --- | --- | --- | --- | --- |
| `PORT` | No | `5000` | `server.js` | The port the API listens on. Also used by the test suite to find the server. |
| `MONGODB_URI` | **Yes** | — | `config/db.js` | The MongoDB connection string. `requireEnv` throws and the process exits if it is unset, so the API is never reachable with no database behind it. |
| `FRONTEND_URL` | No | `http://localhost:5173` | `server.js`, `config/cookies.js`, `swagger/openapi.js` | Comma-separated list of origins allowed by CORS. Also decides the cookie's `SameSite`. Malformed entries are reported once at startup. |
| `BCRYPT_SALT_ROUNDS` | No | `12` | `services/authService.js` | The bcrypt cost factor. Lower it only in tests. |
| `JWT_SECRET` | **Yes** | — | `services/authService.js`, `middleware/authMiddleware.js` | Signs and verifies the session token. Read through `requireEnv`, so the process refuses to start without it. |
| `JWT_EXPIRES_IN` | No | `1d` | `services/authService.js`, `config/cookies.js` | The token's lifetime, as a number plus `s`/`m`/`h`/`d`. The cookie's `maxAge` is derived from this same value. |
| `COOKIE_SECURE` | No | derived | `config/cookies.js` | Forces the cookie's `Secure` flag on or off. Leave unset and it is derived: on when `SameSite=None` or `NODE_ENV=production`. **Only set `true` over HTTPS** — over plain HTTP the browser silently drops the cookie, which looks exactly like a failed login. |
| `COOKIE_SAME_SITE` | No | derived | `config/cookies.js` | An explicit `lax` / `strict` / `none` always wins. Otherwise it follows the deployment's shape: `lax` when every allowed origin is local, `none` in production. |
| `CLOUDINARY_CLOUD_NAME` | **Yes** for uploads | — | `config/cloudinary.js` | Your Cloudinary cloud name. Read on first upload, not at import time. |
| `CLOUDINARY_API_KEY` | **Yes** for uploads | — | `config/cloudinary.js` | Your Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | **Yes** for uploads | — | `config/cloudinary.js` | Your Cloudinary API secret. |

Variables read by the **test suite** rather than the server:

| Variable | Default | Purpose |
| --- | --- | --- |
| `BASE_URL` | `http://localhost:${PORT \|\| 5000}` | Where the tests look for a running server. Set it to point the suite at a non-default host or port. |

#### How the cookie settings resolve

`config/cookies.js` reads the environment **at call time**, not at module load — `server.js` calls `dotenv.config()` *after* the imports are evaluated, so a top-level read would always see `undefined` and silently fall back to the defaults.

| Condition | Resulting cookie |
| --- | --- |
| `COOKIE_SAME_SITE` set | That value verbatim |
| Every `FRONTEND_URL` origin is `localhost` / `127.0.0.1` / `0.0.0.0` / `[::1]` | `SameSite=lax`, `Secure` off |
| Any public origin in `FRONTEND_URL` (production) | `SameSite=none`, `Secure` forced **on** |
| `COOKIE_SECURE` set | That value wins over the derived one |

`Secure` is derived rather than trusted because a `SameSite=None` cookie without `Secure` is rejected outright by Safari and Chrome, and the failure looks like a failed login rather than a configuration mistake.
## Available commands

### Backend — `web-backend/package.json`

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the server under `nodemon`, restarting on file changes. |
| `npm start` | Starts the server with plain `node server.js`. Use this when running the tests. |
| `npm test` | Runs **every** suite in order against a server that is already listening. |
| `npm run test:auth` | Registration, sign in/out, sessions, password recovery. |
| `npm run test:tasks` | Task CRUD, board ordering, ownership, refusals. |
| `npm run test:admin` | Admin authorization, the users table, every management action. |
| `npm run test:integration` | The exact contract `web-frontend` reads. |
| `npm run test:docs` | The OpenAPI spec, and that it still matches the routes. |
| `npm run seed:admin <email-or-id>` | Promotes one account to `admin`. |

There is **no build command and no lint command** on the backend — it has no build step and no ESLint configuration.

### Frontend — `web-frontend/package.json`

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the Vite dev server on port `5173`, with the API proxy active. |
| `npm run build` | Builds the production bundle into `dist/`. |
| `npm run preview` | Serves the built `dist/` locally to check the production output. |
| `npm run lint` | Runs ESLint (`eslint.config.js`, flat config). |
| `npm test` | Runs the Vitest suite once (`vitest run`). |
| `npm run test:watch` | Runs Vitest in watch mode. |
| `npm run verify` | Checks the drag-and-drop ordering arithmetic in Node. |
| `npm run verify:tasks` | Checks the task-creation flow and the board's ordering rules. |
| `npm run verify:mascot` | Checks the mascot mood and reaction helpers. |
| `npm run verify:toast` | Checks the toasts raised when a task changes board. |
| `npm run verify:comments` | Checks `src` for JSX comment leaks. |

There is **no format command** in either application — no Prettier or equivalent is configured.

### Recommended order before opening a pull request

```bash
# backend — a server must already be listening for the suites
cd web-backend && npm test

# frontend
cd web-frontend && npm run lint && npm test
cd web-frontend && npm run verify:tasks && npm run verify
```

---

### `web-frontend/.env`

One variable, read by `src/api-client/client.js`.

| Variable | Required | Used by | Purpose |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | No (empty is correct) | `src/api-client/client.js` | The API's address. **Empty means "same origin as this page"**, which is both the deployed setup and the correct local setup behind the Vite proxy. Set an absolute `https://` URL only if the API is served from a different site. |

A trailing slash is stripped, and a value that is neither empty nor an absolute `http(s)` URL is rejected at request time with an explanatory error rather than being silently accepted.

> **Never put a secret in a `VITE_` variable.** Vite inlines every `VITE_*` value into the JavaScript bundle at build time, so anything so named ships to the browser and is readable by anyone who loads the page. `VITE_API_BASE_URL` is safe because a URL is not a credential. The frontend needs no credential at all: it authenticates with an `httpOnly` cookie set by the backend. Any server-side secret belongs in `web-backend/.env`.

---
## Project structure

```
task-manager-todo-app/
├── .gitignore              Shared ignores for the whole workspace
├── README.md               This file
│
├── web-backend/            The REST API  (Express + MongoDB)
│   ├── server.js           The single entry point: env, app, middleware, routes,
│   │                       404, error handler, database, listen, graceful shutdown
│   ├── .env.example        Template documenting every backend variable
│   ├── config/             db.js (connection + required env), cookies.js, cloudinary.js
│   ├── constants/          boards, roles, http, messages, pagination,
│   │                       uploads, validation — the single definition of each list
│   ├── schemas/            userSchema.js, taskSchema.js — the Mongoose models
│   ├── models/             userModel.js, taskModel.js — every database query
│   ├── services/           authService, taskService, adminService, avatarService
│   │                       — the business rules
│   ├── controllers/        authController, taskController, userController,
│   │                       adminController — validate, call a service, respond
│   ├── routes/             api.routes.js mounts auth, users, tasks, admin
│   ├── middleware/         authMiddleware, adminMiddleware, errorMiddleware,
│   │                       uploadMiddleware
│   ├── helpers/            errorHelper, validationHelper, queryHelper
│   ├── utils/              validationSchemas.js — all Zod request schemas
│   ├── swagger/            openapi.js, swaggerRoutes.js, schemas/, paths/
│   ├── tests/              helpers, five suites, the runner, seed-admin
│   └── package.json
│
└── web-frontend/           The user interface  (React + Vite)
    ├── index.html          The Vite entry document
    ├── vite.config.js      React + Tailwind plugins, and the /api dev proxy
    ├── vitest.config.js    jsdom environment, tests/**/*.test.{js,jsx}
    ├── eslint.config.js    Flat config: js recommended + react-hooks + react-refresh
    ├── vercel.json         Production rewrites: /api and /openapi.json → the API
    ├── .env                VITE_API_BASE_URL (gitignored)
    ├── public/             favicon.png, icons.svg, mascots/ sprite sheets
    ├── scripts/            verify.mjs and the other standalone Node checks
    ├── tests/              12 Vitest suites plus setup.js
    └── src/
        ├── main.jsx        createRoot, QueryClientProvider, AppContextProvider
        ├── App.jsx         The router and the route guards
        ├── api-client/     client.js, auth.js, users.js, tasks.js, admin.js, docs.js
        ├── components/     AppShell, RouteGuards, Toast, Modal, Drawer, Feedback,
        │                   FormField, PasswordField, ErrorBoundary,
        │                   Tasks/, User/, Admin/, ApiDocumentation/, icons/
        ├── pages/          Auth, Dashboard, RecoverPassword, NotFound, ApiDocs,
        │                   AdminOverview, AdminUsers
        ├── contexts/       AppContext.jsx, appContextObject.js, useAppContext.js
        ├── hooks/           useTasks, useAdminActions, useOwnAccountActions,
        │                   useAvatarUpload, useUserFilters, useDebouncedValue,
        │                   useMediaQuery, useMascotReaction, useAuthMascotMood
        ├── queryOptions/   sessionQueryOptions, tasksQueryOptions,
        │                   docsQueryOptions
        ├── constants/      routes, boards, roles, queryKeys, validation, user,
        │                   tasks, admin, mascot, toast, icons, apiDocs, styles
        ├── helpers/        globalHelper, footerRoutes, mascotMood, taskToasts,
        │                   openapiHelper, openapiOperations, openapiSchemas
        └── index.css       Tailwind entry and the CSS custom properties
```

### Notable responsibilities

| Directory | Responsibility |
| --- | --- |
| `web-backend/constants/` | Each list is defined **once**. The frontend mirrors several of these (`constants/boards.js`, `constants/roles.js`, `constants/user.js`) and the two must be kept in agreement by hand — the comments in those files say so. |
| `web-backend/swagger/` | `paths/` mirrors `routes/` file for file, so a route and its documentation sit side by side and a new route has an obvious home for its entry. |
| `web-frontend/src/api-client/` | The only place in the app that knows how to reach the API. |
| `web-frontend/src/queryOptions/` | One module per resource, holding the query keys and options, so no two modules invent different keys for the same data. |
| `web-frontend/src/helpers/openapi*.js` | The only place in the app that knows what an OpenAPI document looks like. Everything below it receives plain data, which is why adding an endpoint needs no frontend change. |

---
## Backend API

### Conventions

- **Auth is cookie based.** The session JWT is set as an `httpOnly` `session` cookie by `POST /api/users/sign_in`, and every guarded route reads that cookie. The sign-in response also carries the raw token for clients that cannot hold cookies.
- **Every failure is `{ "message": ... }`**, and a validation failure carries one message per field as an array. The frontend reads that one field and nothing else.
- **Unknown `/api` routes answer with JSON**, never the default HTML error page.
- The JSON body limit is **1 MB**.
- A CORS refusal is a real **403**, not a 500 — a configuration mistake should not be reported as a server fault.

### Routes

#### Authentication and accounts — `/api`

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/users/register` | — | Create an account (always a plain user) |
| POST | `/api/users/sign_in` | — | Sign in, receive the session cookie |
| POST | `/api/users/logout` | — | Clear the cookie |
| POST | `/api/users/forgot_password` | — | Start recovery (the same answer either way) |
| PUT | `/api/users/reset_password` | — | Set a new password |
| GET | `/api/auth/validate_token` | user | The current session's user |
| PATCH | `/api/users/profile` | user | Update the signed-in user's own name and email |
| PUT | `/api/users/password` | user | Set a new password on your own account |
| POST | `/api/users/avatar` | user | Replace your own profile picture (multipart, field `avatar`) |

The self-service routes act on the account behind the verified cookie and take **no id** from the request — so neither can be pointed at another account.

#### Tasks — `/api/tasks`

Every route in this router is behind `authMiddleware`, and every query is scoped to the caller.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/tasks` | The caller's board |
| POST | `/api/tasks` | Create a task (always lands on **To Do**) |
| GET | `/api/tasks/:id` | One task |
| PATCH | `/api/tasks/:id` | Rename or re-describe |
| DELETE | `/api/tasks/:id` | Remove, and close the gap it leaves |
| PUT | `/api/tasks/move` | Change board and/or position |

`PUT /move` is declared **before** `/:id`, so the literal string `move` is never captured as an id.

Boards are `todo`, `ongoing` and `done`.

#### Admin — `/api/admin`

Both middlewares guard the whole router: a session, then an admin role.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/admin/stats` | Dashboard totals |
| GET | `/api/admin/users` | One page: search, filters, sort, paging |
| GET | `/api/admin/users/:id` | One user with task counts |
| PATCH | `/api/admin/users/:id` | Profile fields only |
| PUT | `/api/admin/users/:id/role` | Change role |
| PUT | `/api/admin/users/:id/status` | Block or unblock |
| PUT | `/api/admin/users/:id/password` | Set a new password |
| POST | `/api/admin/users/:id/avatar` | Replace the profile picture (multipart) |
| DELETE | `/api/admin/users/:id` | Delete the account and its tasks |

Profile, role, status and password are **separate endpoints on purpose**, so a rename can never carry a privilege change with it. The Zod schemas enforce it: a `role` sent to the profile endpoint is refused with a 400, not ignored.

**Query parameters** for `GET /api/admin/users`:

| Parameter | Values | Default |
| --- | --- | --- |
| `search` | Free text over name and email, regex-escaped | empty |
| `role` | `user` \| `admin` | no filter |
| `status` | `active` \| `blocked` | no filter |
| `sortBy` | `name`, `email`, `role`, `status`, `totalTasks`, `createdAt` | `createdAt` |
| `sortDir` | `asc` \| `desc` | `desc` |
| `page` | 1 or more | `1` |
| `pageSize` | 1–100 | `10` |

#### System

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/` | — | Liveness probe — `{ "message": "Foxy List API is running" }` |
| GET | `/openapi.json` | — | The OpenAPI 3.0.3 document |
| GET | `/api-docs` | — | Swagger UI rendering that document |

None of the three documentation routes is guarded. Documentation that requires a session is documentation nobody can read while setting a session up, and the document describes shapes rather than data.

### The API reference page

The backend builds its OpenAPI document **from its own code** and serves it. There is no spec file on disk to keep in sync and nothing to forget to commit; the one thing that can drift is a route changing without its documentation changing, and `npm run test:docs` exists to catch exactly that.

The frontend fetches `/openapi.json` and renders whatever it finds. **No endpoint is written into the component** — a new endpoint appears because the backend documented it, not because the frontend changed. The in-app viewer is deliberately **read-only**; use Swagger UI to actually try requests.

The spec is cached hard (`staleTime: Infinity`, `gcTime: Infinity`) and never refetched behind your back, because the document cannot change while that server is running. After restarting the API, press **Reload spec** on the page.

**Adding an endpoint:**

1. Add the route in `web-backend/routes/`, as usual.
2. Add its path to the matching file in `web-backend/swagger/paths/`, with a summary, a description that says *why* it exists, its parameters, its request body, and every status it can answer with — including the 401 and 403 the middleware raises, which `authResponses()` writes for you.
3. Run `npm run test:docs`. It fails until the two agree.

### The mascot

The UI carries an animated fox mascot from the `page-mascot` package (`ControlledMascot.jsx` extends it with a `reaction` prop so a parent can pin its expression). Its mood follows the app's state — the auth screen's mood tracks form errors, and the toasts raise reactions on a task changing board. The mascot is decoration only: no behaviour depends on it.

---
## Frontend routes

Defined in one place, `src/constants/routes.js`, so a path is spelled once.

| Path | Screen | Guard |
| --- | --- | --- |
| `/` | Redirects to `/dashboard` | `RequireAuth` |
| `/dashboard` | The signed-in task board | `RequireAuth` |
| `/login` | Sign in | `RequireGuest` |
| `/register` | Register | `RequireGuest` |
| `/recover-password` | Password recovery | `RequireGuest` |
| `/admin` | Redirects to `/admin/overview` | — |
| `/admin/overview` | Totals for users and the three boards | `RequireAuth` + `RequireAdmin` |
| `/admin/users` | The users table and every management action | `RequireAuth` + `RequireAdmin` |
| `/api-docs` | The API reference, from the backend's OpenAPI document | **none, deliberately** |
| `/404` | Not found | — |
| `*` | Not found, with a query-cache reset | — |

`/login` and `/register` are the two modes of **one** page (`pages/Auth.jsx`); the screen reads the current location to decide which form to show.

The three guards live in `src/components/RouteGuards.jsx`:

| Guard | Behaviour |
| --- | --- |
| `RequireAuth` | Waits for the session check, then redirects to `/login` with the attempted location in state. |
| `RequireGuest` | Redirects a signed-in user away from the auth screens to `/dashboard`. |
| `RequireAdmin` | Waits as `RequireAuth` does, then shows an "Administrators only" state instead of the screen. |

**These guards are a usability measure only.** Hiding a button or a route in React does not protect anything — `requireAdmin` in `web-backend/middleware/adminMiddleware.js` is the boundary that actually holds.

`AppShell` frames every routed page in a full-height column and pins the footer to the bottom, for an allowlist of paths. The error boundary sits *inside* the shell, so a crashed page keeps its footer.

---

## Authentication and authorization

### The session

1. `POST /api/users/sign_in` verifies the bcrypt hash, checks the account is active, signs a JWT carrying **only** the user's id (`{ sub: <id> }`), and sets it as an `httpOnly` `session` cookie.
2. Every guarded request is read by `authMiddleware`, which verifies the token, loads the user from the database, and attaches them as `req.user`.
3. `GET /api/auth/validate_token` returns that user. The frontend runs it through `sessionQueryOptions` with `staleTime: Infinity`, so the session is fetched once and only re-fetched when the app asks.

**The user is re-read on every request.** That is what makes a block bite immediately rather than at the user's next sign-in.

| Situation | Response |
| --- | --- |
| No cookie | `401` |
| Bad or expired token | `401` |
| The account no longer exists | `401` |
| The account is blocked | `403` |
| Signed in, but not an admin | `403` |

### Password rules

Enforced by Zod on the backend, and mirrored in `src/constants/validation.js` on the frontend. **Both copies must agree**, or the server rejects passwords the form allows.

| Rule | Value |
| --- | --- |
| Minimum length | 6 characters (`PASSWORD_MIN_LENGTH` in both apps) |
| Maximum length | 128 characters |
| Whitespace | Forbidden anywhere — leading, trailing or internal |
| Must differ from the current one | Checked server-side with `bcrypt.compare` against the stored hash |
| Characters | Letters, digits and symbols are all fine; only whitespace disqualifies a password |

The whitespace rule is a **rejection, not a trim**, deliberately: trimming would store a different secret from the one the user believes they typed, and `"password "` versus `"password"` is exactly the sort of difference that only shows up as a failed sign-in on another device.

The "must differ" rule lives on the server because the server is the only side holding the hash — which also means the current password is never sent by the client and never echoed back. It covers reset, the self-service route, and the admin's set-password route.

## Database

MongoDB, accessed through Mongoose 9. Two collections.

### `users`

| Field | Type | Notes |
| --- | --- | --- |
| `firstName` | String | Required, trimmed, max 60 |
| `lastName` | String | Required, trimmed, max 60 |
| `email` | String | Required, **unique**, lowercased, trimmed |
| `password` | String | The bcrypt hash. `select: false` — no query returns it unless it explicitly asks |
| `role` | String | Enum `user` \| `admin`, defaults to `user` |
| `status` | String | Enum `active` \| `blocked`, defaults to `active` |
| `avatar` | String | The Cloudinary secure URL, or `''`. Max 2048 |
| `createdAt` / `updatedAt` | Date | Automatic (`timestamps: true`) |

`userSchema.statics.findForLogin` is the one query that opts back into the password hash, and only the login and password-change paths use it.

### `tasks`

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | ObjectId → `User` | Required and **indexed** — every task query is scoped to one owner |
| `title` | String | Required, trimmed, 1–200 characters |
| `description` | String | Trimmed, defaults to `''`, max 2000 |
| `status` | String | Enum `todo` \| `ongoing` \| `done`, defaults to `todo`, **indexed** |
| `order` | Number | Position within the board, defaults to 0, cannot be negative |
| `createdAt` / `updatedAt` | Date | Automatic |

A compound index `{ userId: 1, status: 1, order: 1 }` backs the query that loads one user's board in display order.

### Aggregations

Two reports are computed with a single pipeline rather than stored, so they can never drift:

- **Admin stats** — user counts by status and role in one `$group`, and task counts per board in another.
- **The users table** — one pipeline with a `$lookup` into `tasks`, an `$addFields` that computes per-board counts and a concatenated `fullName`, and a `$facet` that returns the page and the matching total together.

Only the three real boards are counted, so `total = todo + ongoing + done` always holds.

### Connection

`config/db.js` connects **before** `app.listen`, so the API is never reachable with nothing behind it. A failed connection logs the reason and exits with code `1`. `SIGINT` and `SIGTERM` close the server and the database connection cleanly.

---

## External services

### Cloudinary — profile pictures

The only third-party service. Images are **not** stored in MongoDB or on disk; Cloudinary holds the file and the database keeps only the returned secure URL.

| Aspect | Detail |
| --- | --- |
| Upload path | `middleware/uploadMiddleware.js` (`parseAvatarUpload`) → `services/avatarService.js` (`uploadAvatarImage`) |
| Storage | Multer **memory** storage — nothing is written to disk, so there is no temp file to clean up |
| Folder | `foxy-list/avatars` |
| Public id | The account's id, with `overwrite` and `invalidate`, so a re-upload replaces the old image instead of piling up |
| Formats | `.jpg`, `.jpeg`, `.png` — checked by **both** extension and MIME type |
| Max size | **5 MB**, enforced by Multer as the stream is read |
| Field name | `avatar`, one file per request |
| Failure | Logged in full server-side, answered with a generic message; the stored avatar is left untouched |

Both the extension and the MIME type are checked because a browser reports whatever type the operating system gave the file, so either check alone can be fooled by a rename.

Cloudinary runs **before** the database write, so a failed upload never leaves a half-updated account.

The frontend mirrors the format and size rules in `src/constants/user.js` as a **courtesy** — the client check gives immediate feedback, and the server check is the boundary. The two constants must match exactly; both files say so in comments.

### Email

**Not integrated.** `POST /api/users/forgot_password` always returns the same message — *"If that email exists, a reset link is on its way"* — and performs no lookup result check, no token generation and no sending. `POST`/reset flow exists, but no mail is dispatched; a `.env` may carry commented-out `EMAIL_USER` / `EMAIL_PASS` notes from an earlier experiment, and **no mail library is in `package.json`**.

Treat password recovery as a UI flow only. Completing it requires knowing the account's email address.

---
### Roles and statuses

| Concept | Values | Default |
| --- | --- | --- |
| `role` | `user`, `admin` | `user` |
| `status` | `active`, `blocked` | `active` |

The **first account created on an empty database is promoted to `admin`** automatically — that is how a fresh deployment gets its first administrator. Every later account is a plain user, and promotion is deliberate via `npm run seed:admin`.

### Self-lockouts

An administrator cannot demote, block, delete or password-change **their own** account — each of those would leave the dashboard unreachable. The guard is `assertNotSelfLockOut` in `adminMiddleware.js`. Replacing a profile picture is the one admin action with no such guard, because a picture carries no privilege.

### Self-service is deliberately narrower than admin

The self-service profile and password routes take **no id**: the account is the one behind the verified session, never one named in a body or a path. `role` and `status` are refused outright by `updateUserProfileSchema`, so a crafted body cannot promote an account even through its own endpoint.

---
## Key data flows

### Signing in

```
Auth.jsx (react-hook-form)
  → api-client/users.js  signIn()
  → client.js  apiRequest("/api/users/sign_in", credentials: "include")
  → Vite proxy → POST localhost:5000/api/users/sign_in
  → authMiddleware is skipped (public route)
  → authController.signIn  → Zod signInSchema
  → authService.signIn  → bcrypt.compare → issueToken → setSessionCookie
  ← { message, token, user }
  → confirmSession(queryClient)   forces a network re-read with staleTime: 0
  → GET /api/auth/validate_token   proves the browser kept the cookie
  → queryClient.setQueryData        session written
  → navigate to /dashboard
```

That extra `validate_token` round trip is the important step. The sign-in answer says the password was right, but it does not prove the browser kept the cookie it was handed — only the API can answer that, by reading the cookie back.

### Moving a card between boards

```
Task.jsx  (DragDropContext onDragEnd)
  → useTasks.js  computes the new board and index, renumbers both boards densely
  → api-client/tasks.js  moveTask({ taskId, newStatus, newIndex })
  → PUT /api/tasks/move
  → taskController.moveTask  → Zod moveTaskSchema
  → taskService.moveTask
  → taskModel.moveTask  → rewriteBoardOrder on the destination,
                          then the source if the card changed board
  ← the moved task
  → queryClient.setQueryData(["tasks"])   optimistic local state reconciled
  → a toast is raised, and the mascot reacts
```

`PUT /move` is declared before `/:id` in the router so the literal `move` is never swallowed as an id. The frontend applies the move optimistically and the server is the authority that renumbers both boards into a dense `0..n-1` sequence.

### Uploading a profile picture

```
AvatarUploader.jsx  validateAvatarFile()  — courtesy check, before any bytes go out
  → api-client/users.js  uploadAvatar(file, onProgress)
  → client.js  apiUpload()  — XMLHttpRequest, because fetch cannot report upload progress
  → POST /api/users/avatar  (multipart, field "avatar")
  → authMiddleware → parseAvatarUpload (Multer: size, count, type)
  → authController.uploadAvatar
  → avatarService.uploadAvatarImage  → Cloudinary
  → authService.setOwnAvatar        → stores the URL
  ← { message, avatar, user }
  → cacheSessionUser()  the navbar, greeting and every avatar update at once
```

`Content-Type` is deliberately unset on the upload so the browser can add its own multipart boundary. The whole account comes back, so the client writes it into its session cache and every avatar follows without a refetch or a reload.

### Admin searching, filtering and paging

All three happen **in the API** — the browser sends a query string and receives one page of rows, so the table behaves the same with ten users and with ten thousand.

```
AdminUsers.jsx
  → useUserFilters + useDebouncedValue (the same debounce as the API viewer)
  → useAdminActions / adminUsersKey(params)
  → GET /api/admin/users?search=&role=&status=&sortBy=&sortDir=&page=&pageSize=
  → adminController.listUsers
  → adminService.listUsers  → parseUserQuery → buildUserFilter
  → userModel.queryUsersPage  → one aggregation ($lookup + $addFields + $facet)
  ← { rows, total, page, pageSize, ... }
```

Each filter state is its own query key, so a slow earlier response can never land on top of a newer one, and React Query aborts the superseded request. Every trigger — the debounced search, either filter, a sort, a page change — shows an indicator *inside* the table while its request is in flight, leaving the rows, filters and pager on screen.

### Reading the API reference

```
ApiDocs.jsx
  → ApiDocumentation.jsx
## Testing

### Backend

The suite drives a **real server over HTTP**, because what it verifies is the contract a browser actually meets: status codes, cookies and JSON shapes. There is no mocking and no in-process server.

```bash
cd web-backend
npm start        # terminal 1 — a server must be listening
npm test         # terminal 2 — every suite, in order
```

`npm test` creates its own throwaway accounts and cleans up after itself, using unique `@foxylist.test` addresses. Each actor keeps its own cookie jar, so an admin session and a user session coexist.

The runner promotes its own account to admin, so it works on both a fresh database and an existing one. Suites run in a deliberate order — the docs suite runs **last** and reads and writes nothing, so every refusal it sees is one a cold client would also see.

| Script | What it covers |
| --- | --- |
| `npm test` | Everything below, in order |
| `npm run test:auth` | Registration, sign in/out, sessions, password recovery |
| `npm run test:tasks` | Task CRUD, board ordering, ownership, refusals |
| `npm run test:admin` | Admin authorization, the users table, every action |
| `npm run test:integration` | The exact contract `web-frontend` reads |
| `npm run test:docs` | The OpenAPI spec, and that it still matches the routes |

The runner prints a tally and exits non-zero on any failure. Set `BASE_URL` to point the suite at a non-default host or port.

### Frontend

Vitest with the jsdom environment, over `tests/**/*.test.{js,jsx}`.

```bash
cd web-frontend
npm test           # run once
npm run test:watch # watch mode
```

| Suite | Covers |
| --- | --- |
| `appShell.test.jsx` | The shell, the footer allowlist, the layout frame |
| `navbar.test.jsx` | The navbar, the account menu, responsive link placement |
| `passwordField.test.jsx` / `passwordValidation.test.jsx` | The visibility toggle and the shared password rules |
| `addTaskComposer.test.jsx` | Composing a task; that one create action leaves one task |
| `taskToasts.test.jsx` | The toasts raised by board changes |
| `adminDashboard.test.jsx` | The overview totals and the distribution chart |
| `avatarUpload.test.jsx` | The client-side file rules and the upload progress |
| `profileSidebar.test.jsx` | The profile drawer and its actions |
| `apiDocumentation.test.jsx` | The OpenAPI viewer, against `apiDocsFixture.js` |
| `debounce.test.jsx` | `useDebouncedValue` |
| `stacking.test.jsx` | Layering and stacking behaviour |

`tests/setup.js` loads the jest-dom matchers and stubs `window.matchMedia`. The stub answers **width** queries against the real `innerWidth` and everything else with `false` — a capability query such as `prefers-reduced-motion` has no honest answer in a headless browser, but a width query does, and returning `false` there would silently take the mobile branch under test.

### Standalone Node checks

Neither suite covers everything; these `scripts/` checks exercise the pure helpers directly.

| Command | Checks |
| --- | --- |
| `npm run verify` | The drag-and-drop ordering arithmetic |
| `npm run verify:tasks` | The task-creation flow and board ordering |
| `npm run verify:mascot` | The mascot mood and reaction helpers |
| `npm run verify:toast` | The toasts raised when a task changes board |
| `npm run verify:comments` | `src` for JSX comment leaks |

---
  → docsQueryOptions  (staleTime: Infinity, gcTime: Infinity)
  → api-client/docs.js  getOpenApiSpec()
  → GET /openapi.json  (proxied in dev, rewritten in production)
  → swagger/openapi.js  buildOpenApiSpec()
  ← the whole document, returned as-is
  → openapiSchemas (resolves $ref, flattens allOf)
  → openapiOperations / openapiHelper
  → ApiGroup → ApiEndpoint → EndpointDetail → FieldTable
```

`allOf` is flattened rather than ignored, because `AdminUser` is a `User` plus its task counts, and a renderer that only read `properties` would show it as having no fields at all.

---
## Deployment

The repository contains **no** `Dockerfile`, `docker-compose.yml`, `render.yaml`, `netlify.toml`, `Procfile`, or CI workflow. Deployment is therefore configured outside the codebase. What the repo *does* pin down is the shape of the deployed setup and, for the frontend, the rewrites that implement it.

### The deployed shape

```
Browser  →  Vercel (static, serves web-frontend/dist)
              │
              ├─ /api/*        ──rewrite──▶  Render (web-backend)
              ├─ /openapi.json ──rewrite──▶  Render (web-backend)
              └─ /*            ──▶          /index.html   (SPA fallback)
```

`web-frontend/vercel.json` is the whole frontend deployment configuration:

```json
{
  "rewrites": [
    { "source": "/api/(.*)",      "destination": "https://foxy-list-app.onrender.com/api/$1" },
    { "source": "/openapi.json",  "destination": "https://foxy-list-app.onrender.com/openapi.json" },
    { "source": "/(.*)",          "destination": "/index.html" }
  ]
}
```

Vercel's `rewrites` match whole path segments, so `/api/(.*)` never collides with `/api-docs` — which is exactly the problem the regex keys in the dev proxy exist to solve.

> **If you deploy somewhere other than the backend this file names, update `vercel.json`.** Leaving it pointing at the old host sends every API request to someone else's server.

### Building the frontend for production

```bash
cd web-frontend
npm run build      # → dist/
npm run preview    # serve dist/ locally to check the output
```

`npm run build` produces a fully static bundle in `dist/`, which any static host can serve. Set `VITE_API_BASE_URL=` (empty) at build time unless the API is on a different site — and remember Vite inlines it, so changing it means rebuilding.

The SPA fallback (`/(.*)` → `/index.html`) is required: without it, a hard refresh or a deep link like `/admin/users` would 404 on the host instead of reaching React Router.

### Deploying the backend

The backend has **no build step**. It is plain ES modules, so deploying means installing production dependencies and running `node server.js`.

```bash
npm install --omit=dev     # nodemon is a devDependency and is not needed in production
npm start
```

Configure the [environment variables](#environment-variables) in the host's dashboard — **not** in a committed file. `MONGODB_URI`, `JWT_SECRET` and the three `CLOUDINARY_*` values are the required ones.

### Two deployment-specific settings

| Variable | What to set it to in production, and why |
| --- | --- |
| `FRONTEND_URL` | The deployed frontend origin, comma-separated. This is the CORS allowlist. **Origins are matched literally**, so a Vercel *preview* deployment must be listed under the hash it was given — and that hash changes on every push. The running list is printed at startup, and every refusal names the origin it turned away, so the value to add is never a guess. |
| `COOKIE_SAME_SITE` | Usually leave it unset. Because `vercel.app` and `onrender.com` are different sites, the cookie is third-party and the code resolves to `none` with `Secure` forced on. A same-site custom-domain deployment (`app.example.com` + `api.example.com`) cannot be detected by comparing hostnames, so set `COOKIE_SAME_SITE=lax` explicitly. |
## Troubleshooting

### The backend will not start

| Symptom | Cause and fix |
| --- | --- |
| `[config] MONGODB_URI is not set` | No `.env`, or the variable is empty. Copy `.env.example` to `.env` and fill it in. |
| `Failed to connect to database` then exit | The URI is wrong, or MongoDB is not reachable. The process exits with code `1` by design. |
| The process exits immediately with no message | `JWT_SECRET` is missing — it is read through `requireEnv`, which throws. |

### Requests fail in the browser

| Symptom | Cause and fix |
| --- | --- |
| **"Unable to reach the server. Please check your connection."** | The backend is not running, or the Vite proxy cannot reach it. The client raises this on any network-level failure, including a CORS block. |
| **A bare CORS error in the console** | Usually a refused origin. The backend logs `[cors] refused <origin>` and answers **403**. Add that exact origin to `FRONTEND_URL` on the API host — with no trailing slash and no path, because a browser's `Origin` header never carries one. A value pasted with a trailing slash would never match, and the refusal looks like the origin had been left out entirely. |
| `[cors] ignoring "<value>"` at startup | A malformed `FRONTEND_URL` entry. Only bare `http`/`https` origins are accepted. |
| Every browser request is refused, and the startup list is empty | `FRONTEND_URL` is set to something the code discarded. Check the `[cors] allowed origins:` line. |
| 404 on `/api-docs` in the app | The dev proxy regex should prevent this. If you changed the proxy keys, restore `^/api/` — a plain `/api` key also matches `/api-docs`. |

### Authentication problems

| Symptom | Cause and fix |
| --- | --- |
| **Signed in, but every request is 401** | The cookie is not coming back. Check that `VITE_API_BASE_URL` is **empty** — pointing it at `http://localhost:5000` makes every request cross-site and the cookie stops working. |
| **Sign-in "fails" but the credentials are right** | Usually `COOKIE_SECURE=true` over plain HTTP. The browser silently drops the cookie, which looks exactly like a failed login. Leave it unset locally so it is derived. |
| Signed out after a refresh in production | `SameSite` is stricter than the deployment needs. With `vercel.app` + `onrender.com` the cookie is third-party, so it must be `SameSite=None; Secure`. |
| Works on desktop, fails on mobile | The same `SameSite` problem, which browsers enforce most strictly on mobile Safari. |
| Redirected to `/login` on a route you are allowed on | The session query has not resolved yet. If it persists, the backend is unreachable — see above. |

### Roles and the admin area

| Symptom | Cause and fix |
| --- | --- |
| `/admin` says "Administrators only" while signed in as an admin | Check the account's `role` **in the database**, not in the browser — the frontend holds no copy of it. |
| Cannot reach `/admin` on a fresh database | Only the **first** account created on an empty database is promoted. Register the very first account, or run `npm run seed:admin you@example.com`. |
| An admin cannot change their own role, status or password, or delete themselves | Deliberate — each would lock the dashboard out. |

### Validation errors

| Symptom | Cause and fix |
| --- | --- |
| The form accepts a password the API refuses | `PASSWORD_MIN_LENGTH` or `PASSWORD_NO_SPACES_PATTERN` has drifted between `web-frontend/src/constants/validation.js` and `web-backend/constants/validation.js`. They must match exactly. |
| "Password cannot contain spaces" on a password with none | The frontend passed the whitespace **detector** as a react-hook-form `pattern`. A `pattern` rule passes only when the value *matches* the regex, so that would accept only passwords containing a space. Use the `validate` rule instead — `newPasswordRules()` already does. |
| "Password must be different" | A new password may not equal the current one. The check is `bcrypt.compare` against the stored hash, so the current password is never sent by the client. |
| A 400 saying a field "cannot be set here" | A crafted request sent `role` or `status` to an endpoint that refuses them. That is the schema working. |

### Uploads

| Symptom | Cause and fix |
| --- | --- |
| "That file is not an image" / "too large" | Client-side courtesy check. Accepted: `.jpg`, `.jpeg`, `.png`, under **5 MB**. Both the extension and the MIME type are checked, so a renamed file can still be refused. |
| A 500 on upload | The `CLOUDINARY_*` variables are unset or wrong. They are read on first upload, so the server starts fine without them. |
| Uploads rejected right after a size change | `AVATAR_MAX_SIZE_BYTES` in `web-frontend/src/constants/user.js` and `IMAGE_MAX_SIZE_BYTES` in `web-backend/constants/uploads.js` must match exactly. |

### API documentation

| Symptom | Cause and fix |
| --- | --- |
| The `/api-docs` page looks stale | The spec is cached hard on purpose. Restart the API and press **Reload spec**. |
| A new endpoint does not appear in the page | It has no entry in `web-backend/swagger/paths/`. Add one, then run `npm run test:docs`, which fails until the spec and the routes agree. |
| `npm run test:docs` fails after adding a route | The route and its documentation disagree — that is the suite working. |

### Development workflow

| Symptom | Cause and fix |
| --- | --- |
| The backend tests cannot reach the API | A server must already be listening. Start it with `npm start` in another terminal first. |
| `npm test` fails only on an existing database | The suite creates its own accounts, but check `BASE_URL` if the server is not on the default port. |
| The dev server did not pick up a `.env` change | Vite reads `.env` only at startup. Restart it. |

---

The backend also prints `[cors] allowed origins: …` on startup. An empty list there is the usual reason every browser request is refused.

---

## Security notes

**Secrets**

- Both `.env` files are gitignored; `.env.example` documents every variable and holds no values.
- No secret is committed to this repository, and none appears in this README.
- Never put a secret in a `VITE_` variable — it is inlined into the browser bundle.

**Passwords**

- Hashed with bcrypt at `BCRYPT_SALT_ROUNDS` (default 12).
- `password` is `select: false` on the schema, so no query returns a hash unless it explicitly asks — only the login path does.
- **No endpoint returns a password.** User objects are built in one place, `toPublicUser`, and the password endpoints answer with a message only.
- A new password may not equal the current one, checked with `bcrypt.compare` so the current password is never transmitted.

**Authorization**

- Ownership is enforced in the service layer, by scoping every task query to the caller's id. A task belonging to somebody else reads as **404, not 403**, so the API does not confirm that an id exists.
- The admin boundary is server side. `requireAdmin` runs on the whole admin router, before any target is read, so a non-admin gets a 403 whether or not the account exists.
- Blocks take effect immediately — the account is re-read on every request.
- Self-lockouts are refused: an admin cannot demote, block, delete or re-password their own account.

**Input**

- Validated by Zod at the boundary; ids are checked as 24-character hex before they reach Mongo.
- Search terms are regex-escaped before becoming a query, and page size is capped at 100.
- Uploads are checked by both extension and MIME type, size-capped by Multer as the stream is read, and stored in memory so nothing touches disk.

**Errors**

- Unexpected faults are logged in full server-side and answered with a generic 500. A stack trace or a database error never reaches the client.
- `ApiError` is the one error type the application throws, and `errorMiddleware` is the single place it becomes a response.

---

## License

`web-backend/package.json` declares `ISC`. `web-frontend` is marked `private` with no license field.

Health checks should target `GET /`, which returns `{ "message": "Foxy List API is running" }` without touching the database or requiring a session.

---
---