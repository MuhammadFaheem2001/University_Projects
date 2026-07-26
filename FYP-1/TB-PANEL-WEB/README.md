# TB Outcome Panel

A responsive, pure HTML/CSS/JS site (no frameworks, no build step, no
backend server, no localhost) built around the biomarker panel from:

> Wang et al. "Prediction of tuberculosis treatment outcomes using
> biochemical markers with machine learning." *BMC Infectious Diseases*
> (2025) 25:229.

## How to open it

Just double-click `index.html` (or any page). That's it — nothing to
install, nothing to start, no server, no port.

## How it works

There is no server. `js/api.js` is a self-contained client-side
"backend" — accounts, sessions, saved patients, and predictions all live
in the browser (via `localStorage` where the browser allows it, falling
back automatically to in-memory storage for the current page if it
doesn't — some browsers restrict `localStorage` on double-clicked
`file://` pages, so this keeps the site working either way). Everything
that used to be a `fetch()` call to Flask is now a same-named local
function (`TBApi.predict`, `TBApi.signin`, `TBApi.listPatients`, ...),
so every page works with nothing to configure and no "network error"
possible.

**Data is per-browser, and may be per-tab if your browser blocks
file:// storage** (in that case, accounts/patients created won't
survive closing the tab — expected trade-off for a zero-setup demo).
This is the frontend-only stage; a real backend/database can replace
`js/api.js`'s internals later without touching any HTML page, since
every other page only ever calls `TBApi.*`.

## Access model — everything requires sign-in

**Every page except `signin.html` and `signup.html` is gated.** Opening
`index.html` (or any other page) without a session immediately redirects
to `signin.html?next=<page>`.

A demo admin account is seeded automatically:
```
admin@tbpanel.local / ChangeMe123!
```
You can also sign up as a **Doctor** or **Patient** from `signup.html`.

### Roles

- **Doctor** — registers patients (`register.html`), sees only patients
  *they* registered (`dashboard.html`), can pull up a patient's full
  visit history by re-using the same Patient ID on a follow-up visit.
- **Patient** — sees only the visits a doctor explicitly linked to their
  account email via the optional "patient's account email" field on
  `register.html` (`patient-dashboard.html`). Sees nothing else.
- **Admin** — sees every account and every patient record platform-wide
  (`admin.html`), can remove accounts (cascades their patient records).

## Pages

| Page                     | Purpose                                                            |
|---------------------------|---------------------------------------------------------------------|
| `index.html`             | Landing page, key stats, live gauge preview                       |
| `about.html`             | Study background, why the project matters                         |
| `predict.html`           | Enter 6 biomarkers → get risk score + SHAP-style explanation       |
| `insights.html`          | Cohort charts: flow, outcomes, comorbidities, regimen              |
| `performance.html`       | Top-5 model comparison table, ROC curve, confusion matrix          |
| `explainability.html`    | Global SHAP feature importance, worked example                    |
| `methodology.html`       | Pipeline steps, metrics explained, stated limitations              |
| `contact.html`           | Contact form (demo — wire to a real endpoint) + author emails      |
| `signup.html`            | Create an account as **Doctor** or **Patient**, with a strength meter |
| `signin.html`            | Sign in; honors `?next=` to return to the page that required auth |
| `register.html`          | **Doctor/admin only.** Register a patient's admission panel (with an optional patient email to link accounts); auto-scores and saves it |
| `dashboard.html`         | **Doctor/admin only.** Lists patients you've registered; "History" opens every past visit for one patient + a risk trend line |
| `patient-dashboard.html` | **Patient only.** Your own visits (matched by the email a doctor linked to the record), with a risk-over-time chart |
| `admin.html`             | **Admin only.** Platform-wide stats, every account (with delete), every patient record across all doctors, searchable |

## The prediction itself

`js/api.js` computes a risk score with a transparent weighted-sum
heuristic, loosely calibrated from the SHAP feature importances shown on
`explainability.html` (5′-NT, uric acid, and globulin weighted highest;
cystatin C, creatinine, and AST lower). It's good for demoing the
interface end-to-end — it is **not** a trained model and must not be
used for real treatment decisions. See `methodology.html` for the
stated limitations of the source study, and the `heuristicPredict()`
function near the top of `js/api.js` for where a real trained model
(or a real backend) would eventually plug in.

## Folder structure

```
tb-frontend/
├── signin.html, signup.html          — the only two public pages
├── index.html, about.html, predict.html, insights.html,
│   performance.html, explainability.html, methodology.html, contact.html
├── register.html, dashboard.html      — doctor/admin only
├── patient-dashboard.html             — patient only
├── admin.html                         — admin only
├── css/style.css        — design tokens + all page styling, responsive, colorful accents
└── js/
    ├── main.js           — nav toggle, biomarker gauge component, auth-nav rendering, requireAuth() guard
    ├── charts.js          — hand-built SVG bar/line/donut/waterfall charts
    ├── config.js           — no-op stub, kept only so existing <script> tags have something to load
    └── api.js               — client-side "backend": auth, roles, predict, patients, admin (localStorage, with an in-memory fallback if storage is blocked)
```

## Disclaimer

This is a research/educational demonstration. It is not a validated
diagnostic device and must not be used for real treatment decisions.
