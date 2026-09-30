# Foxy List API

The backend for the Foxy List todo board: accounts, a three-board task list,
and an admin dashboard. Express 5, MongoDB (Mongoose) and Zod, no build step.

## Running it

```bash
npm install
cp .env.example .env     # then fill in MONGODB_URI and JWT_SECRET
npm run dev              # or: npm start
```

The API listens on `PORT` (default 5000) and refuses to start without a
database connection, so it is never reachable with nothing behind it.

## Testing

The suite drives a real server over HTTP, because what it verifies is the
contract a browser actually meets: status codes, cookies and JSON shapes.

```bash
npm start                # in one terminal
npm test                 # in another
```

`npm test` creates its own throwaway accounts and cleans up after itself. The
first account created on an **empty** database is promoted to admin
automatically; on a database that already has users, the suite promotes its own
account with the same helper `npm run seed:admin` uses:

```bash
npm run seed:admin someone@example.com
```

| Script | What it covers |
| --- | --- |
| `npm test` | Everything below, in order |
| `npm run test:auth` | Registration, sign in/out, sessions, password recovery |
| `npm run test:tasks` | Task CRUD, board ordering, ownership, refusals |
| `npm run test:admin` | Admin authorization, the users table, every action |
| `npm run test:integration` | The exact contract `web-frontend` reads |

## Architecture

```
server.js              process: env, database, listen, graceful shutdown
app.js                 the Express app: middleware, routes, 404, error handler
config/                db.js (connection + required env), cookies.js
constants/             boards.js, roles.js - the single definition of each list
schemas/               userSchema.js, taskSchema.js - Mongoose models
models/                userModel.js, taskModel.js - every database query
services/              authService, taskService, adminService - business rules
controllers/           one per resource: validate, call the service, respond
routes/                api.routes.js mounts auth, users, tasks, admin
middleware/            authMiddleware, adminMiddleware, errorMiddleware
helpers/               errorHelper, validationHelper, queryHelper
utils/                 validationSchemas.js - all Zod request schemas
tests/                 helpers, four suites, seed-admin
```

A request flows **route → controller → service → model → database**, and each
layer only knows about the one below it:

- **Routes** attach middleware and name the endpoints. Nothing else.
- **Controllers** validate the request, call one service function, and pick a
  status code. No business rules, no queries.

## The API

Auth is cookie based. The session JWT is set as an httpOnly `session` cookie and
is also returned in the sign-in body for non-browser clients. Every response
carries `message` on failure, which is what `client.js` in the frontend reads.

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/users/register` | - | Create an account (always a plain user) |
| POST | `/api/users/sign_in` | - | Sign in, receive the session cookie |
| POST | `/api/users/logout` | - | Clear the cookie |
| POST | `/api/users/forgot_password` | - | Start recovery (same answer either way) |
| PUT | `/api/users/reset_password` | - | Set a new password |
| GET | `/api/auth/validate_token` | user | The current session's user |
| GET | `/api/tasks` | user | The caller's board |
| POST | `/api/tasks` | user | Create a task (always on To Do) |
| GET | `/api/tasks/:id` | owner | One task |
| PATCH | `/api/tasks/:id` | owner | Rename or re-describe |
| DELETE | `/api/tasks/:id` | owner | Remove, and close the gap |
| PUT | `/api/tasks/move` | owner | Change board and/or position |
| GET | `/api/admin/stats` | admin | Dashboard totals |
| GET | `/api/admin/users` | admin | One page: search, filters, sort, paging |
| GET | `/api/admin/users/:id` | admin | One user with task counts |
| PATCH | `/api/admin/users/:id` | admin | Profile fields only |
| PUT | `/api/admin/users/:id/role` | admin | Change role |
| PUT | `/api/admin/users/:id/status` | admin | Block or unblock |
| PUT | `/api/admin/users/:id/password` | admin | Set a new password |
| DELETE | `/api/admin/users/:id` | admin | Delete the account and its tasks |

Profile, role, status and password are separate endpoints on purpose, so a
rename can never carry a privilege change with it. The schemas enforce that: a
`role` sent to the profile endpoint is refused with a 400, not ignored.

## Security

- **Passwords** are bcrypt hashed. `password` is `select: false` on the schema,
  so no query returns a hash unless it explicitly asks for one, which only the
  login path does.
- **No endpoint returns a password.** User objects are built in one place
  (`toPublicUser`), and the password endpoint answers with a message only.
- **Ownership** is enforced in the service, by scoping every task query to the
  caller's id. A task belonging to somebody else reads as 404, not 403, so the
  API does not confirm that an id exists.
- **The admin boundary is server side.** `requireAdmin` runs on the whole admin
  router, before any target is read, so a non-admin gets a 403 whether or not
  the account exists. Hiding a button in React is a usability measure only.
- **Blocks take effect immediately.** The account is re-read on every request, so
  a blocked user is refused on their next call, not at their next sign-in.
- **Self-lockouts** are refused: an admin cannot demote, block or delete
  themselves, which would leave the dashboard unreachable.
- **Input is validated** by Zod at the boundary, and ids are checked before they
  reach Mongo. Search terms are escaped before becoming a regex, and a page
  size is capped.
- **Secrets come from the environment.** `.env` is gitignored; `.env.example`
  documents every variable. No secret is committed.
- **Internal errors never reach the client.** Unexpected faults are logged in
  full and answered with a generic 500.

## Notes

- `COOKIE_SECURE` must only be `true` over HTTPS. Enabling it over plain HTTP
  makes the browser silently drop the cookie, which looks exactly like a failed
  login.
- Passwords must be at least 6 characters, matching `PASSWORD_MIN_LENGTH` in the
  frontend. The two must agree, or the server rejects passwords the form allows.
- Task counts on the admin table are computed in one aggregation rather than
  stored, so `total = todo + ongoing + done` always holds and a task created a
  moment ago is counted a moment later.

- **Services** hold the rules: ownership, self-lockouts, board ordering,
  password hashing, cookie handling. They call models, never Mongoose directly.
- **Models** are the only place a database query is written. A service never
  builds a filter.
- **Middleware** handles what is true across many routes: authentication,
  the admin boundary, and turning any error into a response.
