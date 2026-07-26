/* ==========================================================================
   main.js — nav behaviour, biomarker reference ranges, gauge rendering
   Shared across every page.
   ========================================================================== */

// ---- mobile nav ----
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      links.classList.remove('open');
    }));
  }
  const y = document.querySelector('#year');
  if (y) y.textContent = new Date().getFullYear();
});

/* ---------------------------------------------------------------------
   Reference ranges for the six admission biomarkers identified by the
   MI + KNN model. Ranges are typical adult clinical reference intervals,
   included here for gauge display purposes only — not diagnostic.
--------------------------------------------------------------------- */
const BIOMARKERS = {
  nt5: { label: "5'-Nucleotidase", unit: 'U/L', min: 0, max: 20, low: 0, high: 11, key: 'nt5' },
  uricAcid: { label: 'Uric Acid', unit: 'mg/dL', min: 1, max: 12, low: 3.5, high: 7.2, key: 'uricAcid' },
  globulin: { label: 'Globulin', unit: 'g/L', min: 10, max: 50, low: 20, high: 35, key: 'globulin' },
  creatinine: { label: 'Creatinine', unit: 'µmol/L', min: 20, max: 200, low: 44, high: 133, key: 'creatinine' },
  cystatinC: { label: 'Cystatin C', unit: 'mg/L', min: 0.2, max: 2.5, low: 0.51, high: 1.09, key: 'cystatinC' },
  ast: { label: 'AST', unit: 'U/L', min: 0, max: 100, low: 8, high: 40, key: 'ast' },
};

const BIOMARKER_ORDER = ['nt5', 'uricAcid', 'globulin', 'creatinine', 'cystatinC', 'ast'];

/**
 * Render (or refresh) a strip of gauges into a container element.
 * `values` — object keyed by biomarker key, value = number or null.
 */
function renderGaugeStrip(container, values = {}) {
  if (!container) return;
  container.innerHTML = '';
  BIOMARKER_ORDER.forEach(key => {
    const spec = BIOMARKERS[key];
    const val = values[key];
    const gauge = document.createElement('div');
    gauge.className = 'gauge';
    gauge.dataset.key = key;

    const pct = val == null ? 0 : clampPct((val - spec.min) / (spec.max - spec.min));
    let state = 'ok';
    if (val != null) {
      if (val > spec.high * 1.15 || val < spec.low * 0.6) state = 'flag';
      else if (val > spec.high || val < spec.low) state = 'watch';
    }
    if (state === 'flag') gauge.classList.add('flag');
    if (state === 'watch') gauge.classList.add('watch');

    const markerPct = clampPct((spec.high - spec.min) / (spec.max - spec.min)) * 100;

    gauge.innerHTML = `
      <span class="g-label">${spec.label}</span>
      <span class="g-value">${val == null ? '—' : val}<span style="font-size:.68em;color:var(--muted);font-weight:400;"> ${spec.unit}</span></span>
      <div class="g-track">
        <div class="g-fill" style="width:${pct * 100}%"></div>
        <div class="g-marker" style="left:${markerPct}%"></div>
      </div>
    `;
    container.appendChild(gauge);
  });
}

function clampPct(v) { return Math.max(0, Math.min(1, v)); }

// Expose globally for pages that need it
window.BIOMARKERS = BIOMARKERS;
window.BIOMARKER_ORDER = BIOMARKER_ORDER;
window.renderGaugeStrip = renderGaugeStrip;

/* ---------------------------------------------------------------------
   Auth-aware nav slot. Every page includes:
     <li class="auth-item" id="nav-auth-slot"></li>
   as the last item in .nav-links. On load we ask the API who's signed
   in and swap that slot between "Sign in / Sign up" and a user chip
   with a Dashboard link + Logout button.
--------------------------------------------------------------------- */
async function renderAuthNav() {
  const slot = document.getElementById('nav-auth-slot');
  if (!slot || !window.TBApi) return;

  // No sign-in/sign-up buttons are shown anywhere except the auth pages
  // themselves — every other page is gated and bounces guests to
  // signin.html before they ever see the nav rendered with content.
  const signedOutHTML = '';

  const destinationFor = (role) => {
    if (role === 'admin') return 'admin.html';
    if (role === 'patient') return 'patient-dashboard.html';
    return 'dashboard.html';
  };

  try {
    const { user } = await TBApi.me();
    const initials = (user.name || user.email || '?').trim().slice(0, 1).toUpperCase();
    const dest = destinationFor(user.role);
    slot.innerHTML = `
      <div class="nav-auth">
        <a href="${dest}" class="user-chip">
          <span class="avatar">${initials}</span>
          <span class="chip-name">${user.name || user.email}</span>
          ${user.role && user.role !== 'doctor' ? `<span class="badge badge-muted" style="margin-left:2px;">${user.role}</span>` : ''}
        </a>
        <button class="pill-btn" id="nav-logout-btn" type="button">Log out</button>
      </div>`;
    const logoutBtn = document.getElementById('nav-logout-btn');
    logoutBtn.addEventListener('click', async () => {
      try { await TBApi.logout(); } catch (_) {}
      window.location.href = 'index.html';
    });
  } catch (_) {
    slot.innerHTML = signedOutHTML;
  }
}

document.addEventListener('DOMContentLoaded', renderAuthNav);

/**
 * Guard a page that requires authentication, optionally restricted to
 * one or more roles. Call at the top of a protected page's inline
 * script. Redirects to signin.html (preserving a `next` param) if
 * nobody is signed in, or to that user's own dashboard if they're
 * signed in but hold the wrong role. Resolves with the user object
 * (role included) when access is allowed.
 */
async function requireAuth(allowedRoles) {
  let user;
  try {
    ({ user } = await TBApi.me());
  } catch (_) {
    const next = encodeURIComponent(window.location.pathname.split('/').pop());
    window.location.href = `signin.html?next=${next}`;
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const dest = user.role === 'admin' ? 'admin.html' : user.role === 'patient' ? 'patient-dashboard.html' : 'dashboard.html';
    window.location.href = dest;
    return null;
  }
  return user;
}
window.requireAuth = requireAuth;
