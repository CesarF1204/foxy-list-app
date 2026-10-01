# Foxy List — task manager frontend

React + Vite frontend for the task-manager app.

## Environment variables

Configuration lives in environment variables, never in the source. `.env` is gitignored and must never be committed. The variable names it needs are
listed in the table below, and every value is set by you. On a fresh clone:

```bash
# create web-frontend/.env and set VITE_API_BASE_URL
npm run dev
```

The value is yours to choose, and so is the code: there is no hardcoded
credential or API address anywhere in `src/`. If the variable is missing the app
says so, rather than silently answering with fake data.

| Variable | Used by | Required |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `src/api-client/client.js` | yes |

It is the single place the backend's address is defined. Every request in the
app is made against it, so pointing the app at another environment is a one
line change here and nothing else.

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

The app needs the backend running, because every screen reads from it.

```bash
# terminal 1 - the API
cd ../web-backend && npm start

# terminal 2 - this app
npm install
npm run dev
```

There is no in-browser stand-in for the API any more. If the backend is down,
requests fail and the app says so; it never invents data to fill a screen.

### Accounts

Create one through **Register** on the sign-in screen. The register endpoint
gives every new account the `user` role, so it reaches the board but not
`/admin`.

The **first account created on an empty database** is promoted to `admin`
automatically, which is how a fresh deployment gets its first administrator.
On a database that already has users, promote one deliberately:

```bash
cd ../web-backend && npm run seed:admin you@example.com
```

If `/admin` refuses you while signed in as an administrator, check the account's
role in the database rather than in the browser: the frontend holds no copy of
anything.

## Talking to the API

Every request goes through `src/api-client/client.js`. It holds the base URL,
adds the session cookie, parses the response and turns a failure into one
readable message. Components never call `fetch`.

| File | Calls |
| --- | --- |
| `client.js` | The one request function every other file goes through |
| `auth.js` | `validate_token` |
| `users.js` | Register, sign in, sign out, password recovery |
| `tasks.js` | The board: list, create, move, edit, delete |
| `admin.js` | Stats, the users table, and every user management action |
| `docs.js` | The backend's OpenAPI document, for the API viewer |

Failures arrive as an `ApiRequestError` carrying both a message written for the
user and the HTTP status, so a caller can tell "you are signed out" (401) from
"not allowed" (403) without parsing text. Validation errors arrive as a list,
one entry per field, and are joined for the toast.

## The API viewer

`/api-docs` renders the backend's OpenAPI specification inside the app. It is a
developer page, and it is deliberately **read-only**: it describes the API, it
does not call it. Swagger UI at `http://localhost:5000/api-docs` is the place to
try requests out.

The page fetches `/openapi.json` from the same `VITE_API_BASE_URL` every other
screen uses, and renders whatever the document says. No endpoint is written into
the component: a new endpoint appears because the backend documented it, not
because this app was changed. That is also why the component has nothing task- or
user-shaped in it, and why it would render a document from any other backend.

```
components/ApiDocumentation/
├── ApiDocumentation.jsx  fetches the spec, owns the filter and the open row
├── ApiGroup.jsx          one tag's heading and its endpoints
├── ApiEndpoint.jsx       one collapsible row
├── EndpointDetail.jsx    the expanded panel: auth, parameters, body, responses
├── FieldTable.jsx        the table used for both parameters and request bodies
├── MethodBadge.jsx       the coloured, always-spelled-out verb
└── Chip.jsx              the small labelled pill
```

One endpoint is open at a time. That is a claim about the whole list rather than
about each row, so the open row is held by `ApiDocumentation` and passed down;
opening one row closes whichever was open before it, in this group or any other.
A row given no `onToggle` keeps its own state, so it still works on its own. The
CRT mascot sits beside the heading in the page header - decoration only, and the
fox already has the navbar.

The filter box is debounced, and uses the same `useDebouncedValue` hook and the
same `SEARCH_DEBOUNCE_MS` as the users table, so both search boxes behave
identically. The box is bound to the immediate value and stays responsive while
the list waits for typing to pause.

| File | Role |
| --- | --- |
| `helpers/openapiSchemas.js` | Resolves `$ref` and flattens `allOf` |
| `helpers/openapiOperations.js` | Reads parameters, request bodies and responses |
| `helpers/openapiHelper.js` | Groups operations by tag, reads the header, names each operation |

Those three are the only place in the app that knows what an OpenAPI document
looks like. Everything below them receives plain data - a method, a path, a list
of fields - which is what keeps the components reusable and is why adding an
endpoint needs no frontend change.

`allOf` is flattened rather than ignored: `AdminUser` is a `User` plus its task
counts, and a renderer that only read `properties` would show it as having no
fields at all.

The document is cached hard and never refetched behind your back - it is
generated from the server's own code, so it cannot change while that server runs.
After restarting the API, press **Reload spec** on the page.

The page is reachable signed out, on purpose: someone integrating against this API
needs to read what sign-in *is* before they have a session.

## Routes

| Path | Screen |
| --- | --- |
| `/` | The site entry point; redirects to `/dashboard` |
| `/dashboard` | The signed-in task board |
| `/api-docs` | The API reference, rendered from the backend's OpenAPI document |
| `/admin` | The admin area's index; redirects to `/admin/overview` |
| `/admin/overview` | Totals for registered, active and blocked users; totals and a distribution chart for the three boards |
| `/admin/users` | The users table with search, filters, sorting and paging, and every management action |

From the `md` breakpoint up the navbar itself carries the Dashboard, and the
admin screens, which it only offers to an administrator, so a desktop reaches
both directly. Below that breakpoint the same two links move into the account
menu behind the avatar, keeping a phone's navbar to the brand alone - never
both at once, and never neither. The Dashboard sits above Admin Overview
wherever the pair appears. An administrator is offered these links; a plain user
is not. The entry names the admin *section*, not the single overview screen, so
it stays filled and marked current on both `/admin/overview` and
`/admin/users`; the Overview and Users tabs below it are what move within that
section. See [Accounts](#accounts) for how to get an administrator account.

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
link tidy, and **the API is the boundary that holds**: `requireAdmin` in
`web-backend/middleware/adminMiddleware.js` guards the whole admin router.

- Every admin request re-checks the caller's role and account status. A missing
  session is a `401`, a signed-in non-admin is a `403`, and a blocked account is
  refused on its very next request rather than at its next sign-in.
- Roles and statuses are validated against the supported lists, so a crafted
  request cannot invent a role or grant itself one.
- An email must be well formed and unique, case-insensitively.
- An admin cannot demote, block or delete their own account.
- Passwords are never returned by any endpoint. The API hashes them with bcrypt
  and stores nothing else.
- Passwords may not contain spaces, and a new one may not equal the current one.
  Both rules are enforced by the API as well - the forms apply the space rule up
  front so the user hears about it immediately, and the API is what actually
  holds. The "must differ" rule can only be checked server-side, by comparing
  against the stored hash, so the current password is never sent or displayed.

The task counts are computed from the real task records on every request, and
only the three real boards are counted, so `total = todo + ongoing + done` always
holds.

### Searching, filtering, paging

All three happen in the API: the browser sends a query string and receives one
page of rows, so the table behaves the same with ten users and with ten thousand.
The search box is debounced; changing a filter returns to page 1. The table shows
ten rows per page to begin with, which is `DEFAULT_PAGE_SIZE` here and the same
constant in the API - the picker renders the `pageSize` the API reported, so the
two defaults have to agree.

Every one of those triggers - the debounced search, either filter, a sort and a
page change - shows the same circular indicator *inside* the table while its
request is in flight. The rows, the filters and the pager stay on screen and stay
put, dimmed under the overlay, because the table is updating rather than the page
loading. Each filter state is its own query key, so a slow earlier response can
never land on top of a newer one, and React Query aborts the request that has
been superseded.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Starts the dev server |
| `npm run build` | Builds for production |
| `npm run lint` | Runs ESLint |
| `npm test` | Runs the Vitest suite |
| `npm run verify` | Checks the drag-and-drop ordering maths |
| `npm run verify:tasks` | Checks the task board's ordering rules in Node |

## Notes

- The app keeps no copy of the data. Users, tasks and statistics all come from
  the API on demand, and the query cache is cleared on sign out so the next
  person starts clean.
- React Query still caches in memory while a session lasts. That is a cache, not
  a source of truth: every mutation invalidates the affected queries and the
  board re-reads from the API.

---

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
