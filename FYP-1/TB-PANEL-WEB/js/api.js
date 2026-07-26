/* ==========================================================================
   api.js — pure client-side "backend" for the TB Outcome Panel.

   Everything (accounts, sessions, saved patients, predictions) lives in
   this browser's localStorage. There is no server to run, so there's
   nothing to start and nothing that can be "unreachable" — just open
   index.html (or serve the folder) and it works.

   The public shape (TBApi.predict, TBApi.signin, TBApi.listPatients, ...)
   matches what every page already calls, so no other file needed to
   change to switch from the old Flask version to this one.

   NOTE: this is a demo, not a security model — passwords sit in
   localStorage in plain text. Fine for a FYP demo on one machine;
   don't reuse a real password when signing up.
   ========================================================================== */

const TBApi = (() => {
  const LS_USERS = 'tb_users';
  const LS_PATIENTS = 'tb_patients';
  const LS_SEQ = 'tb_seq';
  const LS_SESSION = 'tb_session';

  // ---------------- storage helpers (localStorage, with an in-memory
  // fallback for browsers/modes that block it — e.g. Safari and some
  // locked-down Chrome profiles refuse localStorage on file:// pages).
  // Every call is wrapped so a blocked store can NEVER throw and break
  // page load; worst case it just doesn't persist across page loads. ----
  const memoryStore = {};
  let storageOK = true;
  try {
    // Some browsers throw just touching `localStorage`, not only on use.
    const t = '__tb_probe__';
    localStorage.setItem(t, '1');
    localStorage.removeItem(t);
  } catch (_) {
    storageOK = false;
  }

  function read(key, fallback) {
    try {
      const raw = storageOK ? localStorage.getItem(key) : (key in memoryStore ? memoryStore[key] : null);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }
  function write(key, value) {
    const raw = JSON.stringify(value);
    try {
      if (storageOK) {
        localStorage.setItem(key, raw);
      } else {
        memoryStore[key] = raw;
      }
    } catch (_) {
      // Quota exceeded or storage revoked mid-session — fall back to
      // memory instead of crashing the caller.
      storageOK = false;
      memoryStore[key] = raw;
    }
  }
  function nextId(kind) {
    const seq = read(LS_SEQ, { users: 0, patients: 0 });
    seq[kind] += 1;
    write(LS_SEQ, seq);
    return seq[kind];
  }
  function err(message, status) {
    const e = new Error(message);
    if (status) e.status = status;
    return e;
  }
  function delay() {
    // tiny artificial delay so loading states / spinners still feel real
    return new Promise((res) => setTimeout(res, 120));
  }

  // ---------------- seed data on first run ----------------
  function ensureSeeded() {
    let users = read(LS_USERS, null);
    if (!users) {
      users = [
        {
          id: nextId('users'),
          name: 'Admin',
          email: 'admin@tbpanel.local',
          password: 'ChangeMe123!',
          role: 'admin',
        },
      ];
      write(LS_USERS, users);
    }
    if (read(LS_PATIENTS, null) === null) write(LS_PATIENTS, []);
  }
  ensureSeeded();

  function currentUser() {
    const session = read(LS_SESSION, null);
    if (!session) return null;
    const users = read(LS_USERS, []);
    return users.find((u) => u.id === session.userId) || null;
  }
  function requireUser(roles) {
    const user = currentUser();
    if (!user) throw err('Not signed in.', 401);
    if (roles && !roles.includes(user.role)) throw err('Not authorized for this action.', 403);
    return user;
  }
  function publicUser(u) {
    if (!u) return u;
    const { password, ...rest } = u;
    return rest;
  }

  // ---------------- prediction heuristic ----------------
  // Weighted-sum approximation calibrated (loosely) from the SHAP feature
  // importances shown on explainability.html. Educational demo only — not
  // for clinical use. mid/scale are typical-adult reference midpoints and
  // spreads for each marker (see js/main.js BIOMARKERS for the same ranges).
  const FEATURES = {
    nt5: { label: "5′-Nucleotidase", mid: 8, scale: 6, weight: 0.16 },
    uricAcid: { label: 'Uric Acid', mid: 5.5, scale: 2.5, weight: 0.16 },
    globulin: { label: 'Globulin', mid: 28, scale: 7, weight: 0.12 },
    cystatinC: { label: 'Cystatin C', mid: 0.8, scale: 0.3, weight: 0.03 },
    creatinine: { label: 'Creatinine', mid: 80, scale: 35, weight: 0.03 },
    ast: { label: 'AST', mid: 28, scale: 20, weight: 0.03 },
  };
  const BASE_RATE = 0.44; // overall treatment-failure rate reported in the source cohort
  const BASE_LOGIT = Math.log(BASE_RATE / (1 - BASE_RATE));

  function heuristicPredict(values) {
    let logit = BASE_LOGIT;
    const contributions = [];
    Object.keys(FEATURES).forEach((key) => {
      const spec = FEATURES[key];
      const raw = values ? values[key] : null;
      const num = raw === null || raw === undefined || raw === '' || Number.isNaN(Number(raw))
        ? spec.mid
        : Number(raw);
      const dev = Math.max(-2, Math.min(2, (num - spec.mid) / spec.scale));
      const contribution = Math.round(spec.weight * dev * 3 * 1000) / 1000;
      logit += contribution;
      contributions.push({ label: spec.label, contribution });
    });
    contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
    const probability_failure = 1 / (1 + Math.exp(-logit));
    const risk_level = probability_failure >= 0.6 ? 'high' : probability_failure >= 0.35 ? 'moderate' : 'low';
    const prediction = probability_failure >= 0.5 ? 'treatment_failure' : 'cured';
    return {
      prediction,
      probability_failure: Math.round(probability_failure * 1000) / 1000,
      risk_level,
      contributions,
    };
  }

  // ---------------- static reference data (mirrors each page's own fallback) ----------------
  const MODEL_PERFORMANCE = [
    { rank: 1, features: 6, classifier: 'KNN', selection: 'MI', test: { auc: 0.87, acc: 0.82, sensitivity: 0.69, specificity: 0.92 }, selected: true },
    { rank: 2, features: 5, classifier: 'SVM', selection: 'MI', test: { auc: 0.87, acc: 0.79, sensitivity: 0.56, specificity: 0.97 }, selected: false },
    { rank: 3, features: 10, classifier: 'Random Forest', selection: 'MI', test: { auc: 0.87, acc: 0.79, sensitivity: 0.59, specificity: 0.94 }, selected: false },
    { rank: 4, features: 7, classifier: 'SVM', selection: 'MI', test: { auc: 0.86, acc: 0.79, sensitivity: 0.68, specificity: 0.88 }, selected: false },
    { rank: 5, features: 8, classifier: 'Bagging', selection: 'MI', test: { auc: 0.86, acc: 0.78, sensitivity: 0.65, specificity: 0.89 }, selected: false },
  ];
  const DATASET_STATS = {
    flow: { initial: 2520, excluded: 434, after_exclusion: 1990, lost_to_follow_up: 904, cured: 607, treatment_failure: 479, final_modelled: 1086 },
    outcome_distribution: [
      { label: 'Cured', value: 607, color: '#2F6F62' },
      { label: 'Treatment failure', value: 479, color: '#B5482F' },
    ],
    discontinuation_reasons: [
      { label: 'Thrombocytopenia', value: 321 },
      { label: 'Liver dysfunction', value: 245 },
      { label: 'Hyperuricemia', value: 133 },
      { label: 'Rash', value: 14 },
    ],
    sex: { cured: { male: 406, female: 201 }, failure: { male: 319, female: 160 } },
    comorbidities_pvalues: [
      { label: 'Diabetes', p: 0.001, significant: true },
      { label: 'Hypertension', p: 0.001, significant: true },
      { label: 'History of TB', p: 0.012, significant: true },
      { label: 'Cancer', p: 0.044, significant: true },
      { label: 'Other respiratory disease', p: 0.082, significant: false },
      { label: 'Digestive disease', p: 0.120, significant: false },
    ],
    treatment_regimen: [
      { label: 'HRZE', cured: 362, failure: 340 },
      { label: 'Other regimens', cured: 245, failure: 139 },
    ],
  };

  return {
    // ---- reachability (always "ok" — there's no server) ----
    async ping() {
      await delay();
      return { status: 'ok' };
    },

    // ---- prediction / study data ----
    async predict(values) {
      requireUser();
      await delay();
      return heuristicPredict(values);
    },
    async modelPerformance() {
      requireUser();
      await delay();
      return MODEL_PERFORMANCE;
    },
    async datasetStats() {
      requireUser();
      await delay();
      return DATASET_STATS;
    },

    // ---- auth ----
    async signup({ name, email, password, role }) {
      await delay();
      if (!name || !email || !password) throw err('Name, email, and password are required.', 400);
      if (!['doctor', 'patient'].includes(role)) throw err('Role must be doctor or patient.', 400);
      const users = read(LS_USERS, []);
      if (users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
        throw err('An account with that email already exists.', 409);
      }
      const user = { id: nextId('users'), name, email, password, role };
      users.push(user);
      write(LS_USERS, users);
      write(LS_SESSION, { userId: user.id });
      return { user: publicUser(user) };
    },
    async signin({ email, password }) {
      await delay();
      const users = read(LS_USERS, []);
      const user = users.find((u) => u.email.toLowerCase() === String(email || '').toLowerCase());
      if (!user || user.password !== password) throw err('Incorrect email or password.', 401);
      write(LS_SESSION, { userId: user.id });
      return { user: publicUser(user) };
    },
    async logout() {
      await delay();
      write(LS_SESSION, null);
      return null;
    },
    async me() {
      await delay();
      const user = currentUser();
      if (!user) throw err('Not signed in.', 401);
      return { user: publicUser(user) };
    },

    // ---- patient registration (doctor/admin) ----
    async createPatient(payload) {
      const owner = requireUser(['doctor', 'admin']);
      await delay();
      if (!payload || !payload.patient_ref) throw err('patient_ref is required.', 400);
      const biomarkers = {
        nt5: payload.nt5, uricAcid: payload.uricAcid, globulin: payload.globulin,
        creatinine: payload.creatinine, cystatinC: payload.cystatinC, ast: payload.ast,
      };
      const prediction = heuristicPredict(biomarkers);
      const patients = read(LS_PATIENTS, []);
      const record = {
        id: nextId('patients'),
        doctor_id: owner.id,
        patient_ref: payload.patient_ref,
        patient_email: payload.patient_email || null,
        age: payload.age || null,
        sex: payload.sex || null,
        biomarkers,
        prediction,
        created_at: new Date().toISOString(),
      };
      patients.push(record);
      write(LS_PATIENTS, patients);
      return record;
    },
    async listPatients() {
      const user = requireUser(['doctor', 'admin']);
      await delay();
      return read(LS_PATIENTS, [])
        .filter((p) => p.doctor_id === user.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
    async deletePatient(id) {
      const user = requireUser(['doctor', 'admin']);
      await delay();
      const patients = read(LS_PATIENTS, []);
      const idx = patients.findIndex((p) => p.id === id && p.doctor_id === user.id);
      if (idx === -1) throw err('Patient record not found.', 404);
      patients.splice(idx, 1);
      write(LS_PATIENTS, patients);
      return null;
    },
    async patientHistory(patientRef) {
      const user = requireUser(['doctor', 'admin']);
      await delay();
      return read(LS_PATIENTS, [])
        .filter((p) => p.doctor_id === user.id && p.patient_ref === patientRef)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },

    // ---- patient's own records ----
    async myRecords() {
      const user = requireUser(['patient']);
      await delay();
      return read(LS_PATIENTS, [])
        .filter((p) => p.patient_email && p.patient_email.toLowerCase() === user.email.toLowerCase())
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },

    // ---- admin ----
    async adminStats() {
      requireUser(['admin']);
      await delay();
      const users = read(LS_USERS, []);
      const patients = read(LS_PATIENTS, []);
      return {
        total_doctors: users.filter((u) => u.role === 'doctor').length,
        total_patient_accounts: users.filter((u) => u.role === 'patient').length,
        total_records: patients.length,
        high_risk_records: patients.filter((p) => p.prediction && p.prediction.risk_level === 'high').length,
      };
    },
    async adminUsers() {
      requireUser(['admin']);
      await delay();
      const users = read(LS_USERS, []);
      const patients = read(LS_PATIENTS, []);
      return users.map((u) => ({
        ...publicUser(u),
        patient_count: patients.filter((p) => p.doctor_id === u.id).length,
      }));
    },
    async adminDeleteUser(id) {
      requireUser(['admin']);
      await delay();
      let users = read(LS_USERS, []);
      const target = users.find((u) => u.id === id);
      if (!target) throw err('Account not found.', 404);
      if (target.role === 'admin') throw err('Cannot remove an admin account.', 400);
      users = users.filter((u) => u.id !== id);
      write(LS_USERS, users);
      const patients = read(LS_PATIENTS, []).filter((p) => p.doctor_id !== id);
      write(LS_PATIENTS, patients);
      return null;
    },
    async adminAllPatients() {
      requireUser(['admin']);
      await delay();
      const users = read(LS_USERS, []);
      return read(LS_PATIENTS, [])
        .map((p) => ({
          ...p,
          doctor_name: (users.find((u) => u.id === p.doctor_id) || {}).name || 'Unknown',
        }))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
  };
})();

window.TBApi = TBApi;
