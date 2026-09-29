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

### Sample login

The mock's sample account is defined entirely in `.env` via the
`VITE_MOCK_SAMPLE_*` variables above, so check your own `.env` for the values.
The sign-in page displays them on screen, with a button to fill them in, so
there is nothing to memorise. Invent a throwaway local account - never point
these at a real one.

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
