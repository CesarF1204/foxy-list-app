# Foxy List — task manager frontend

React + Vite frontend for the task-manager app.

## Environment variables

Configuration lives in environment variables, never in the source. `.env` is gitignored and must never be committed. The variable names it needs are
listed in the table below, and every value is set by you. On a fresh clone:

```bash
# create web-frontend/.env and set the VITE_MOCK_SAMPLE_* values listed below
npm run dev
```

Every value in `.env` is yours to choose, and so is the code: there is no
hardcoded credential anywhere in `src/`. If a variable is missing, the app says
which one it needs instead of silently falling back to a default.

| Variable | Used by | Required |
| --- | --- | --- |
| `VITE_MOCK_SAMPLE_FIRST_NAME` | `src/mock/sampleData.js` | yes, for the mock |
| `VITE_MOCK_SAMPLE_LAST_NAME` | `src/mock/sampleData.js` | yes, for the mock |
| `VITE_MOCK_SAMPLE_EMAIL` | `src/mock/sampleData.js` | yes, for the mock |
| `VITE_MOCK_SAMPLE_PASSWORD` | `src/mock/sampleData.js` | yes, for the mock |
| `VITE_MOCK_SAMPLE_ADMIN_FIRST_NAME` | `src/mock/sampleData.js` | yes, to reach `/admin` |
| `VITE_MOCK_SAMPLE_ADMIN_LAST_NAME` | `src/mock/sampleData.js` | yes, to reach `/admin` |
| `VITE_MOCK_SAMPLE_ADMIN_EMAIL` | `src/mock/sampleData.js` | yes, to reach `/admin` |
| `VITE_MOCK_SAMPLE_ADMIN_PASSWORD` | `src/mock/sampleData.js` | yes, to reach `/admin` |
| `VITE_API_BASE_URL` | `src/api-client/client.js` | only when `MOCK_MODE` is off |

### Never put a secret in a `VITE_` variable

Vite inlines every `VITE_*` value into the JavaScript bundle at build time, so
anything so named ships to the browser and is readable by anyone who loads the
page. `VITE_API_BASE_URL` is safe because a URL is not a credential.

No API key, access token, secret key, database credential, password, auth
secret, private key or client secret belongs in this file or anywhere in the
client code. The app authenticates with an httpOnly cookie set by the backend,
so the frontend never needs to hold a credential. If a server-side secret is
ever needed, it belongs in `web-backend/.env` and must never be `VITE_`-prefixed
or sent to the browser.

## Running it

```bash
npm install
npm run dev
```

No backend is needed. The app runs on local mock data out of the box.

### Sample logins

The mock seeds two accounts, and the sign-in page shows both with a button that
fills the form in. Their values come from `.env` via the `VITE_MOCK_SAMPLE_*` and
`VITE_MOCK_SAMPLE_ADMIN_*` variables above, so check your own `.env` for them.
Invent throwaway local accounts - never point these at real ones.

| Account | Role | Reaches |
| --- | --- | --- |
| **Sample admin** | `admin` | The board **and** `/admin` |
| **Sample user** | `user` | The board only |

The administrator is seeded rather than registered, because the register endpoint
gives every new account the `user` role - exactly as a real deployment would need
a migration or a bootstrap step to create its first admin. It has a few tasks of
its own, so its row in the users table is not all zeroes.

If `/admin` refuses you while signed in as the sample admin, the browser is
holding a mock database seeded before roles existed. That is handled: the mock
fills in the missing `role` and `status` fields on the next load. To start over
instead, run `resetMockData()` from the console, or clear the
`foxylist:mock:*` keys in localStorage.

## The mock layer (temporary)

`src/mock/` is a **temporary** frontend-only mock, so the UI and the Tasks
feature can be tested end-to-end without a backend. It signs in, and serves and
mutates tasks, entirely in the browser.

| File | Role |
| --- | --- |
| `src/mock/index.js` | The `MOCK_MODE` switch and the public entry point |
| `src/mock/sampleData.js` | The sample account and the sample task board |
| `src/mock/mockStore.js` | The in-browser stand-in for the REST API |
| `src/mock/SampleCredentialsHint.jsx` | The sample-credentials hint on the sign-in page |

The switch lives in one place, `MOCK_MODE` in `src/mock/index.js`, and it is
honoured in a single bypass at the top of `apiRequest` in
`src/api-client/client.js`. The real `fetch` call below that bypass is
untouched.

### Sample tasks

19 tasks across the three boards, with all four priorities, and due dates
spread over overdue, due today, upcoming and undated. Due dates are generated
relative to the day you open the app, so the board is never stale. The mix
includes long and short titles, long and empty descriptions, and tasks
belonging only to the sample user.

### Going back to the real API

1. Set `MOCK_MODE = false` in `src/mock/index.js`.
2. Uncomment `VITE_API_BASE_URL` in `.env`.

That is all. Nothing else changes: `api-client`, the queries, the mutations and
every component already talk to the real API contract. Deleting `src/mock/`
outright, plus its one import in `client.js` and the two imports in
`src/pages/Auth.jsx`, works too.

## Routes

| Path | Screen |
| --- | --- |
| `/` | The site entry point; redirects to `/dashboard` |
| `/dashboard` | The signed-in task board |
| `/admin` | The admin area's index; redirects to `/admin/overview` |
| `/admin/overview` | Totals for registered, active and blocked users; totals and a distribution chart for the three boards |
| `/admin/users` | The users table with search, filters, sorting and paging, and every management action |

From the `md` breakpoint up the navbar itself carries the Dashboard, and the
admin screens, which it only offers to an administrator, so a desktop reaches
both directly. Below that breakpoint the same two links move into the account
menu behind the avatar, keeping a phone's navbar to the brand alone - never
both at once, and never neither. The Dashboard sits above Admin Overview
wherever the pair appears.
Signing in with the mock's **sample admin** account does so - see
[Sample logins](#sample-logins).

### Managing a user

Opening a row shows a drawer with the account's details and its task counts, and
every change is a confirmed action on its own endpoint:

| Action | Endpoint |
| --- | --- |
| Edit first name, last name, email | `PATCH /api/admin/users/:id` |
| Change role | `PUT /api/admin/users/:id/role` |
| Block or unblock | `PUT /api/admin/users/:id/status` |
| Set a new password | `PUT /api/admin/users/:id/password` |
| Delete the account and its tasks | `DELETE /api/admin/users/:id` |

They are separate endpoints on purpose, so a rename can never carry a privilege
change with it.

### Where the authorization lives

`RequireAdmin` in `src/components/RouteGuards.jsx` keeps the routes and the navbar
link tidy, and **the API is the boundary that holds**: `src/api-client/adminApi.js`
defines the rules once, and both fake API layers call into it.

- Every admin request re-checks the caller's role and account status. A missing
  session is a `401`, a signed-in non-admin is a `403`, and a blocked account is
  refused on its very next request rather than at its next sign-in.
- Roles and statuses are validated against the supported lists, so a crafted
  request cannot invent a role or grant itself one.
- An email must be well formed and unique, case-insensitively.
- An admin cannot demote, block or delete their own account.
- Passwords are never returned by any endpoint, and the mock stores its
  throwaway plaintext copy only because a browser stand-in has no hashing to do.
  A real API hashes there and stores nothing else.

The task counts are computed from the real task records on every request, and
only the three real boards are counted, so `total = todo + ongoing + done` always
holds.

### Searching, filtering, paging

All three happen in the API: the browser sends a query string and receives one
page of rows, so the table behaves the same with ten users and with ten thousand.
The search box is debounced; changing a filter returns to page 1.

Every one of those triggers - the debounced search, either filter, a sort and a
page change - shows the same circular indicator *inside* the table while its
request is in flight. The rows, the filters and the pager stay on screen and stay
put, dimmed under the overlay, because the table is updating rather than the page
loading. Each filter state is its own query key, so a slow earlier response can
never land on top of a newer one, and React Query aborts the request that has
been superseded.

### The mock data

The mock seeds a sample admin and a sample user, plus twelve extra accounts, with
a mix of roles, one blocked account and a few tasks each, so the table, the
filters, the pager and the statistics have something real to act on.
`npm run verify:mock` exercises all of it end to end, including the refusals above
and the migration that upgrades a database seeded before roles existed.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Starts the dev server |
| `npm run build` | Builds for production |
| `npm run lint` | Runs ESLint |
| `npm run verify` | Checks the drag-and-drop ordering maths |
| `npm run verify:mock` | End-to-end checks of the mock layer's auth and task flows |

## Notes

- Mock data is stored in `localStorage` under `foxylist:mock:*`, so it survives a
  reload but is namespaced away from anything a real backend would use. It
  re-seeds with the sample account on first load; deleting or editing a sample
  task sticks.
- `resetMockData()` in `src/mock/mockStore.js` wipes the mock database and
  session, so the next read re-seeds a fresh sample board.

---

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
