"use strict";

const STORAGE_KEY = "uhealth-alert-demo-v1";
const ACCOUNTS_STORAGE_KEY = "uhealth-alert-demo-accounts-v1";
const roles = {
  student: { label: "Student", name: "Kato Moses", email: "km275497@students.cavebndish.ac.ug" },
  health: { label: "Health Officer", name: "Dr. Sarah Namutebi", email: "health.officer@cavebndish.ac.ug" },
  safety: { label: "Safety Team", name: "Mr. Peter Okello", email: "safety@cavebndish.ac.ug" },
  welfare: { label: "Welfare Officer", name: "Ms. Grace Ayebare", email: "welfare@cavebndish.ac.ug" },
  admin: { label: "Administrator", name: "System Administrator", email: "admin@cavebndish.ac.ug" }
};
const demoAccounts = [
  { role: "student", email: "km275497@students.cavebndish.ac.ug", password: "student123", passwordHash: "sha256$703b0a3d6ad75b649a28adde7d83c6251da457549263bc7ff45ec709b0a8448b" },
  { role: "health", email: "health.officer@cavebndish.ac.ug", password: "health123", passwordHash: "sha256$0f126bc0014eec6416c352d385282c5d91585af18728553c84c23e9fa11fa275" },
  { role: "safety", email: "safety@cavebndish.ac.ug", password: "safety123", passwordHash: "sha256$9a72c3f322b7c34eef4c4558f6114664956bbcd448da5fa4377185a188b6a4ce" },
  { role: "welfare", email: "welfare@cavebndish.ac.ug", password: "welfare123", passwordHash: "sha256$91110f3a1aaed669224cdb5619a5d7ad031b1c106d0e8a0dfc86d4137ce7df7e" },
  { role: "admin", email: "admin@cavebndish.ac.ug", password: "admin123", passwordHash: "sha256$240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9" }
];
const studentEmailDomain = "@students.cavebndish.ac.ug";
const passwordIterations = 120000;

const initialState = {
  alerts: [
    { id: 1, title: "Cholera outbreak reported near Hall B", description: "Three suspected cholera cases were reported around Hall B. Boil drinking water, wash hands frequently and report any diarrhoea to the campus clinic immediately.", category: "Epidemic", severity: "Critical", createdBy: "Dr. Sarah Namutebi", createdAt: hoursAgo(6), expiresAt: daysFromNow(7) },
    { id: 2, title: "Flu vaccination drive - Main Hall", description: "Free influenza vaccination on Friday 09:00-16:00 at the Main Hall. Bring your student ID.", category: "Vaccination", severity: "Moderate", createdBy: "Dr. Sarah Namutebi", createdAt: daysAgo(1), expiresAt: daysFromNow(10) },
    { id: 3, title: "Wellness quote of the day", description: "\"Take care of your body. It's the only place you have to live.\" — Jim Rohn", category: "Wellness Quote", severity: "Low", createdBy: "Campus Health Office", createdAt: hoursAgo(2), expiresAt: daysFromNow(1) }
  ],
  reports: [],
  notifications: [
    { id: 1, title: "Welcome to UHealth Alert", message: "Your demo account is ready. This browser-only version does not send real notifications.", createdAt: daysAgo(1), read: false }
  ]
};

function hoursAgo(hours) { return new Date(Date.now() - hours * 3600000).toISOString(); }
function daysAgo(days) { return new Date(Date.now() - days * 86400000).toISOString(); }
function daysFromNow(days) { return new Date(Date.now() + days * 86400000).toISOString(); }

let state = loadState();
let activeRole = null;
let signedInUser = null;
let currentPage = "dashboard";
let authView = "signin";
let toastTimer;

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return structuredClone(initialState);
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed.alerts) || !Array.isArray(parsed.reports) || !Array.isArray(parsed.notifications)) {
      throw new Error("Saved demo data has an unexpected format.");
    }
    return parsed;
  } catch (error) {
    console.error("Could not load UHealth demo data:", error);
    return structuredClone(initialState);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error("Could not save UHealth demo data:", error);
    showToast("Changes could not be saved in this browser. Check storage settings.");
    return false;
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function formattedDate(value, options = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) {
  return new Date(value).toLocaleString(undefined, options);
}

function activeAlerts() {
  const now = Date.now();
  return state.alerts
    .filter(alert => !alert.expiresAt || new Date(alert.expiresAt).getTime() > now)
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

function severityRank(value) {
  return ({ Critical: 4, High: 3, Moderate: 2, Low: 1 })[value] || 0;
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
}

function render() {
  const root = document.querySelector("#app");
  if (!activeRole) {
    root.innerHTML = renderLogin();
    root.querySelector("#login-form")?.addEventListener("submit", handleSignIn);
    root.querySelector("#register-form")?.addEventListener("submit", handleRegister);
    root.querySelectorAll("[data-auth-view]").forEach(button => button.addEventListener("click", () => {
      authView = button.dataset.authView;
      render();
    }));
    return;
  }
  root.innerHTML = renderShell();
  root.querySelector("[data-logout]")?.addEventListener("click", logout);
  bindPageActions();
}

function renderLogin() {
  const isRegister = authView === "register";
  return `<main class="login-wrap">
    <section class="login-panel" aria-labelledby="welcome-title">
      <div class="login-top">
        <div class="brand"><div class="brand-mark" aria-hidden="true">+</div><div><div class="brand-name">UHealth Alert</div><div class="brand-caption">Campus health & student support</div></div></div>
        <p class="eyebrow">UNIVERSITY HEALTH INFORMATION</p>
        <h1 id="welcome-title">Wellbeing support, connected to campus.</h1>
        <p class="subtitle">A simple place to check campus health alerts, find student support resources, and coordinate staff response.</p>
      </div>
      ${isRegister ? renderRegisterForm() : renderSignInForm()}
      <section class="demo-credentials" aria-labelledby="demo-credentials-title">
        <h2 id="demo-credentials-title">Sample demo logins</h2>
        <p>Use these accounts to try the student and staff dashboards.</p>
        <div class="table-wrap"><table><thead><tr><th>Role</th><th>Email</th><th>Password</th></tr></thead><tbody>
          ${demoAccounts.map(account => `<tr><td>${escapeHtml(roles[account.role].label)}</td><td>${escapeHtml(account.email)}</td><td><code>${escapeHtml(account.password)}</code></td></tr>`).join("")}
        </tbody></table></div>
      </section>
      <div class="login-bottom"><div class="callout warning"><strong>Demo only — not real authentication.</strong> New accounts are saved in this browser only. GitHub Pages has no server, so accounts cannot be shared across devices and browser-side checks can be bypassed. Do not enter real credentials or sensitive data.</div></div>
    </section>
  </main>`;
}

function renderSignInForm() {
  return `<form class="login-form" id="login-form">
    <div class="card-heading"><h2>Sign in</h2></div>
    <div class="form-grid">
      <div class="field full"><label for="login-role">Account type</label><select id="login-role" required><option value="student">Student</option><option value="staff">Staff</option></select></div>
      <div class="field full"><label for="login-email">University email</label><input id="login-email" type="email" autocomplete="username" required placeholder="you@university.edu"></div>
      <div class="field full"><label for="login-password">Password</label><input id="login-password" type="password" autocomplete="current-password" required placeholder="Enter your password"></div>
    </div>
    <p id="login-error" class="login-error" role="alert" aria-live="assertive" hidden></p>
    <div class="form-actions"><button class="button" type="submit">Sign in</button></div>
    <p class="auth-switch">New student? <button class="text-button" type="button" data-auth-view="register">Create a student account</button></p>
  </form>`;
}

function renderRegisterForm() {
  return `<form class="login-form" id="register-form">
    <div class="card-heading"><h2>Create a student account</h2></div>
    <div class="form-grid">
      <div class="field full"><label for="register-name">Full name</label><input id="register-name" autocomplete="name" maxlength="80" required></div>
      <div class="field full"><label for="register-email">University student email</label><input id="register-email" type="email" autocomplete="email" required placeholder="name@students.cavebndish.ac.ug"><small class="field-hint">Use an address ending in ${studentEmailDomain}</small></div>
      <div class="field full"><label for="register-password">Password</label><input id="register-password" type="password" autocomplete="new-password" minlength="8" required><small class="field-hint">At least 8 characters.</small></div>
      <div class="field full"><label for="register-confirm">Confirm password</label><input id="register-confirm" type="password" autocomplete="new-password" minlength="8" required></div>
    </div>
    <p id="register-error" class="login-error" role="alert" aria-live="assertive" hidden></p>
    <p id="register-success" class="login-success" role="status" aria-live="polite" hidden></p>
    <div class="form-actions"><button class="button" type="submit">Create account</button></div>
    <p class="auth-switch">Already registered? <button class="text-button" type="button" data-auth-view="signin">Sign in</button></p>
  </form>`;
}

function renderShell() {
  const nav = activeRole === "student"
    ? [["dashboard", "⌂", "Overview"], ["alerts", "◉", "Health alerts"], ["wellbeing", "♡", "Wellbeing"], ["reports", "＋", "Get support"]]
    : [["dashboard", "⌂", "Overview"], ["alerts", "◉", "Health alerts"], ["reports", "▤", "Reports"], ["students", "♧", "Students"]];
  const person = signedInUser || roles[activeRole];
  const pageTitle = pageTitles()[currentPage] || "Overview";
  return `<div class="app-shell">
    <aside class="sidebar">
      <div class="brand"><div class="brand-mark" aria-hidden="true">+</div><div><div class="brand-name">UHealth Alert</div><div class="brand-caption">Campus health & safety</div></div></div>
      <div class="nav-label">Workspace</div>
      <nav class="nav-list" aria-label="Main navigation">
        ${nav.map(([page, icon, label]) => `<button class="nav-link ${currentPage === page ? "active" : ""}" type="button" data-page="${page}" ${currentPage === page ? 'aria-current="page"' : ""}><span class="nav-icon" aria-hidden="true">${icon}</span><span>${label}</span></button>`).join("")}
        ${activeRole === "admin" ? `<button class="nav-link ${currentPage === "audit" ? "active" : ""}" type="button" data-page="audit"><span class="nav-icon" aria-hidden="true">◷</span><span>Activity log</span></button>` : ""}
      </nav>
      <div class="sidebar-bottom">
        <div class="demo-note"><strong>Demo environment</strong>Do not enter real health, emergency, or identifying information. Data stays in this browser.</div>
        <div class="account"><div class="avatar" aria-hidden="true">${escapeHtml(person.name.split(" ").map(part => part[0]).slice(0, 2).join(""))}</div><div><div class="account-name">${escapeHtml(person.name)}</div><div class="account-role">${escapeHtml(person.label)}</div></div></div>
      </div>
    </aside>
    <div class="main-area">
      <header class="topbar"><div><div class="eyebrow">UHEALTH ALERT / ${escapeHtml(person.label.toUpperCase())}</div><div class="topbar-title">${escapeHtml(pageTitle)}</div></div><div class="topbar-right"><span class="date-label">${new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span><button class="button secondary small" type="button" data-logout>Switch role</button></div></header>
      <main class="content" id="main">${renderPage()}</main>
    </div>
  </div><div id="toast" class="toast" role="status" aria-live="polite" hidden></div>`;
}

function pageTitles() {
  return { dashboard: "Overview", alerts: "Campus health alerts", wellbeing: "Student wellbeing", reports: activeRole === "student" ? "Get support" : "Emergency reports", students: "Student directory", audit: "Activity log" };
}

function renderPage() {
  switch (currentPage) {
    case "alerts": return renderAlerts();
    case "wellbeing": return renderWellbeing();
    case "reports": return activeRole === "student" ? renderSupport() : renderReports();
    case "students": return renderStudents();
    case "audit": return renderAudit();
    default: return activeRole === "student" ? renderStudentDashboard() : renderStaffDashboard();
  }
}

function renderStudentDashboard() {
  const alerts = activeAlerts();
  const recent = alerts.slice(0, 2);
  const student = signedInUser || roles.student;
  return `<div class="page-heading"><div><p class="eyebrow">YOUR CAMPUS, AT A GLANCE</p><h1>Good day, ${escapeHtml(student.name.split(" ")[0])}.</h1><p class="subtitle">Stay informed and find support when you need it.</p></div><button class="button" type="button" data-page="alerts">View all alerts <span aria-hidden="true">→</span></button></div>
    <div class="grid grid-3">
      ${statCard("Active health alerts", alerts.length, "◉")}
      ${statCard("Support requests", state.reports.filter(report => report.reporter === student.email).length, "＋")}
      ${statCard("Wellbeing resources", 4, "♡")}
    </div>
    <section class="section-space"><div class="card-heading"><h2>Latest campus alerts</h2><button class="text-button" type="button" data-page="alerts">See all</button></div><div class="grid grid-2">${recent.length ? recent.map(alertCard).join("") : emptyState("No active alerts", "There are no current health alerts.")}</div></section>
    <section class="section-space grid grid-2">
      <div class="card"><div class="card-heading"><h2>Need a hand?</h2><span class="resource-icon" aria-hidden="true">♡</span></div><p class="subtitle">Explore counselling information or send a demo request to campus support.</p><div class="form-actions"><button class="button secondary" type="button" data-page="wellbeing">Explore wellbeing</button><button class="button" type="button" data-page="reports">Get support</button></div></div>
      <div class="card"><div class="card-heading"><h2>Today’s wellbeing note</h2><span class="resource-icon" aria-hidden="true">✦</span></div><p class="subtitle">Take a short break between study sessions. A little rest can help you return with more focus.</p></div>
    </section>`;
}

function renderStaffDashboard() {
  const openReports = state.reports.filter(report => report.status === "Open");
  const alerts = activeAlerts();
  return `<div class="page-heading"><div><p class="eyebrow">STAFF WORKSPACE</p><h1>Campus overview</h1><p class="subtitle">Review demo health alerts and support requests.</p></div>${canPublish() ? `<button class="button" type="button" data-action="show-alert-form">＋ Publish alert</button>` : ""}</div>
    <div class="grid grid-3">${statCard("Active alerts", alerts.length, "◉")}${statCard("Open reports", openReports.length, "＋")}${statCard("Demo students", 3, "♧")}</div>
    ${canPublish() ? `<section id="alert-form-area" class="section-space" hidden>${renderAlertForm()}</section>` : ""}
    <section class="section-space grid grid-2">
      <div class="card"><div class="card-heading"><h2>Latest alerts</h2><button class="text-button" type="button" data-page="alerts">View all</button></div><div class="stack">${alerts.slice(0, 3).map(alertRow).join("") || emptyState("No active alerts", "Publish an alert to share a campus update.")}</div></div>
      <div class="card"><div class="card-heading"><h2>Open support reports</h2><button class="text-button" type="button" data-page="reports">Review queue</button></div><div class="stack">${openReports.slice(0, 4).map(reportRow).join("") || emptyState("Nothing waiting", "New demo requests will appear here.")}</div></div>
    </section>
    <div class="section-space callout warning"><strong>Privacy reminder:</strong> This static demo has no real authentication, backend access control, or secure health-data storage. Never use it to manage actual student records.</div>`;
}

function renderAlerts() {
  const alerts = activeAlerts();
  return `<div class="page-heading"><div><p class="eyebrow">CAMPUS UPDATES</p><h1>Health alerts</h1><p class="subtitle">Current announcements shared with the campus community.</p></div>${activeRole !== "student" && canPublish() ? `<button class="button" type="button" data-action="show-alert-form">＋ Publish alert</button>` : ""}</div>
    ${activeRole !== "student" && canPublish() ? `<section id="alert-form-area" class="section-space" hidden>${renderAlertForm()}</section>` : ""}
    <div class="grid grid-2">${alerts.length ? alerts.map(alertCard).join("") : emptyState("No active alerts", "There are no current health alerts.")}</div>`;
}

function alertCard(alert) {
  return `<article class="card alert-card severity-${escapeHtml(alert.severity.toLowerCase())}">
    <div class="alert-meta"><span class="badge ${escapeHtml(alert.severity.toLowerCase())}">${escapeHtml(alert.severity)}</span><span>${escapeHtml(alert.category)}</span><span>·</span><span>${escapeHtml(formattedDate(alert.createdAt))}</span></div>
    <h3>${escapeHtml(alert.title)}</h3><p>${escapeHtml(alert.description)}</p>
    <div class="alert-meta section-space"><span>Shared by ${escapeHtml(alert.createdBy)}</span><span>·</span><span>Expires ${escapeHtml(formattedDate(alert.expiresAt, { month: "short", day: "numeric" }))}</span></div>
  </article>`;
}

function renderWellbeing() {
  return `<div class="page-heading"><div><p class="eyebrow">SUPPORT FOR YOU</p><h1>Wellbeing resources</h1><p class="subtitle">A starting point for finding support and taking care of yourself.</p></div></div>
    <div class="callout"><strong>If you or someone else is in immediate danger, contact local emergency services or campus staff directly.</strong> This website is a demo and is not monitored for emergencies.</div>
    <section class="section-space grid grid-2">
      ${resourceCard("☏", "University Counselling Centre", "Free, confidential sessions. Block C, Room 12. Monday–Friday, 08:00–17:00.")}
      ${resourceCard("♡", "24/7 Crisis Line", "Call +256 800 200 300 any time, day or night.")}
      ${resourceCard("☻", "Anonymous Peer Support Chat", "Anonymous peer supporters are online 18:00–23:00 daily.")}
      ${resourceCard("✦", "Exam Stress Toolkit", "Try 25-minute focus blocks, keep a regular sleep routine, and take real breaks.")}
    </section>
    <section class="section-space card"><div class="card-heading"><h2>Confidential self-check</h2><span class="badge">Private demo</span></div><p class="subtitle">This non-diagnostic check-in is processed only in this page and is not saved. It cannot replace advice from a qualified professional.</p>
      <form id="self-check-form" class="section-space"><div class="form-grid">${["Feeling nervous, anxious or on edge", "Not being able to stop or control worrying", "Little interest or pleasure in doing things", "Feeling down, depressed or hopeless", "Trouble falling or staying asleep"].map((question, index) => `<div class="field"><label for="check-${index}">${question}</label><select id="check-${index}" required><option value="">Select…</option><option value="0">0 — Not at all</option><option value="1">1 — Several days</option><option value="2">2 — More than half the days</option><option value="3">3 — Nearly every day</option></select></div>`).join("")}</div><div class="form-actions"><button class="button" type="submit">See information</button></div></form><div id="self-check-result" class="section-space" aria-live="polite"></div>
    </section>`;
}

function resourceCard(icon, title, copy) {
  return `<article class="card resource-row"><span class="resource-icon" aria-hidden="true">${icon}</span><div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(copy)}</p></div></article>`;
}

function renderSupport() {
  const student = signedInUser || roles.student;
  const mine = state.reports.filter(report => report.reporter === student.email);
  return `<div class="page-heading"><div><p class="eyebrow">STUDENT SUPPORT</p><h1>Get support</h1><p class="subtitle">Send a demo request to the campus team or review the wellbeing resources.</p></div></div>
    <div class="callout urgent"><strong>For emergencies, call your local emergency number or contact campus staff now.</strong> This demo is not monitored and cannot dispatch help.</div>
    <section class="section-space grid grid-2">
      <div class="card"><div class="card-heading"><h2>Send a support request</h2></div><form id="report-form"><div class="form-grid"><div class="field full"><label for="report-type">What do you need help with?</label><select id="report-type" required><option value="">Choose a category</option><option>Health concern</option><option>Safety concern</option><option>Wellbeing support</option><option>Other</option></select></div><div class="field full"><label for="report-message">Brief description (demo only)</label><textarea id="report-message" maxlength="500" required placeholder="Do not include sensitive or identifying information."></textarea></div></div><div class="form-actions"><button class="button" type="submit">Submit demo request</button></div></form></div>
      <div class="card"><div class="card-heading"><h2>Your demo requests</h2></div><div class="stack">${mine.length ? mine.slice().reverse().map(reportRow).join("") : emptyState("No requests yet", "Requests you submit in this browser will appear here.")}</div></div>
    </section>`;
}

function renderReports() {
  const reports = state.reports.slice().reverse();
  return `<div class="page-heading"><div><p class="eyebrow">STAFF RESPONSE</p><h1>Support reports</h1><p class="subtitle">Demo queue of student-submitted requests. No real notifications are sent.</p></div></div>
    <div class="callout warning"><strong>Demo data only.</strong> Do not use this queue to handle emergencies or actual student health information.</div>
    <section class="section-space card"><div class="card-heading"><h2>All requests <span class="badge">${reports.length}</span></h2></div><div class="stack">${reports.length ? reports.map(reportRow).join("") : emptyState("No reports submitted", "New demo student requests will appear here.")}</div></section>`;
}

function reportRow(report) {
  return `<div class="list-row"><div class="list-main"><div class="list-title">${escapeHtml(report.type || "Support request")} <span class="badge ${report.status === "Open" ? "open" : "resolved"}">${escapeHtml(report.status)}</span></div><p class="list-copy">${escapeHtml(report.message)}</p><p class="list-copy">Submitted by ${escapeHtml(report.reporterName || "Student demo")} · ${escapeHtml(formattedDate(report.createdAt))}${report.resolution ? `<br>Resolution: ${escapeHtml(report.resolution)}` : ""}</p></div>${report.status === "Open" && activeRole !== "student" ? `<button class="button secondary small" type="button" data-resolve="${escapeHtml(report.id)}">Mark resolved</button>` : ""}</div>`;
}

function renderStudents() {
  if (activeRole === "student") return renderStudentDashboard();
  const students = [
    ["Kato Moses", "km275497@students.cavebndish.ac.ug", "Faculty of Science & Technology", "Year 2"],
    ["Achieng Betty", "ab298114@students.cavebndish.ac.ug", "Faculty of Health Sciences", "Year 3"],
    ["Nsubuga Ivan", "ni301245@students.cavebndish.ac.ug", "Faculty of Business", "Year 1"]
  ];
  return `<div class="page-heading"><div><p class="eyebrow">DEMO DIRECTORY</p><h1>Students</h1><p class="subtitle">Sample records only; no live student database is connected.</p></div></div>
    <div class="callout warning"><strong>Sample data:</strong> These names and records are for demonstration. Do not treat this static page as a student information system.</div>
    <section class="section-space card"><div class="table-wrap"><table><thead><tr><th>Name</th><th>University email</th><th>Faculty</th><th>Study year</th></tr></thead><tbody>${students.map(student => `<tr>${student.map(value => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>`;
}

function renderAudit() {
  return `<div class="page-heading"><div><p class="eyebrow">ADMIN VIEW</p><h1>Activity log</h1><p class="subtitle">This static demonstration does not implement a secure audit trail.</p></div></div>
    <div class="callout warning"><strong>No real audit logging is available.</strong> Browser storage can be edited or deleted by the user and must not be used to audit access to sensitive information.</div>`;
}

function renderAlertForm() {
  return `<div class="card"><div class="card-heading"><h2>Publish a campus health alert</h2></div><form id="alert-form"><div class="form-grid">
    <div class="field full"><label for="alert-title">Title</label><input id="alert-title" required maxlength="120" placeholder="Short, clear announcement"></div>
    <div class="field full"><label for="alert-description">Description</label><textarea id="alert-description" required maxlength="1000" placeholder="Share useful information with the campus community"></textarea></div>
    <div class="field"><label for="alert-category">Category</label><select id="alert-category"><option>Epidemic</option><option>Pandemic</option><option>Mental Health</option><option>University Health</option><option>Health News</option><option>Vaccination</option><option>Wellness Quote</option><option>Public Health Innovation</option></select></div>
    <div class="field"><label for="alert-severity">Severity</label><select id="alert-severity"><option>Low</option><option>Moderate</option><option>High</option><option>Critical</option></select></div>
    <div class="field"><label for="alert-days">Expires after (days)</label><input id="alert-days" type="number" min="1" max="365" value="7" required></div>
  </div><div class="form-actions"><button class="button secondary" type="button" data-action="hide-alert-form">Cancel</button><button class="button" type="submit">Publish alert</button></div></form></div>`;
}

function statCard(label, value, icon) {
  return `<div class="card stat-card"><div><div class="stat-label">${escapeHtml(label)}</div><div class="stat-value">${escapeHtml(value)}</div></div><div class="stat-icon" aria-hidden="true">${icon}</div></div>`;
}

function alertRow(alert) {
  return `<div class="list-row"><div class="list-main"><div class="list-title">${escapeHtml(alert.title)}</div><p class="list-copy">${escapeHtml(alert.category)} · ${escapeHtml(alert.createdBy)}</p></div><span class="badge ${escapeHtml(alert.severity.toLowerCase())}">${escapeHtml(alert.severity)}</span></div>`;
}

function emptyState(title, message) {
  return `<div class="empty-state"><div class="empty-icon" aria-hidden="true">✦</div><strong>${escapeHtml(title)}</strong><div class="section-space">${escapeHtml(message)}</div></div>`;
}

function canPublish() { return activeRole === "health" || activeRole === "admin"; }

async function handleSignIn(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const error = form.querySelector("#login-error");
  const accountType = form.querySelector("#login-role").value;
  const email = form.querySelector("#login-email").value.trim().toLowerCase();
  const password = form.querySelector("#login-password").value;
  const submitButton = form.querySelector("[type='submit']");
  submitButton.disabled = true;
  error.hidden = true;
  try {
    const accounts = loadRegisteredAccounts();
    const demoAccount = demoAccounts.find(item => item.email === email);
    const registeredAccount = accounts.find(item => item.email === email);
    const account = demoAccount || registeredAccount;
    const correctRole = accountType === "student"
      ? account?.role === "student"
      : account?.role !== "student";
    const passwordMatches = account && await verifyPassword(password, account.passwordHash);

    if (!correctRole || !passwordMatches) {
      error.textContent = "Email, password, or account type is incorrect. Check the sample accounts below or create a student account.";
      error.hidden = false;
      form.querySelector("#login-password").value = "";
      return;
    }

    const profile = roles[account.role];
    signedInUser = {
      ...profile,
      name: account.fullName || profile.name,
      email: account.email
    };
    activeRole = account.role;
    currentPage = "dashboard";
    render();
  } catch (exception) {
    error.textContent = exception.message || "Sign-in failed. Please try again.";
    error.hidden = false;
  } finally {
    submitButton.disabled = false;
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const error = form.querySelector("#register-error");
  const success = form.querySelector("#register-success");
  const name = form.querySelector("#register-name").value.trim();
  const email = form.querySelector("#register-email").value.trim().toLowerCase();
  const password = form.querySelector("#register-password").value;
  const confirmation = form.querySelector("#register-confirm").value;
  const submitButton = form.querySelector("[type='submit']");
  error.hidden = true;
  success.hidden = true;

  if (name.length < 2) {
    error.textContent = "Enter your full name (at least 2 characters).";
    error.hidden = false;
    return;
  }
  if (!email.endsWith(studentEmailDomain)) {
    error.textContent = `Use a student email ending in ${studentEmailDomain}.`;
    error.hidden = false;
    return;
  }
  if (password.length < 8) {
    error.textContent = "Choose a password with at least 8 characters.";
    error.hidden = false;
    return;
  }
  if (password !== confirmation) {
    error.textContent = "The passwords do not match.";
    error.hidden = false;
    return;
  }

  submitButton.disabled = true;
  try {
    const accounts = loadRegisteredAccounts();
    if (demoAccounts.some(account => account.email === email) || accounts.some(account => account.email === email)) {
      error.textContent = "An account with this email already exists. Sign in instead.";
      error.hidden = false;
      return;
    }
    accounts.push({
      role: "student",
      email,
      fullName: name,
      passwordHash: await hashPassword(password),
      createdAt: new Date().toISOString()
    });
    saveRegisteredAccounts(accounts);
    form.reset();
    form.querySelector("#register-success").textContent = "Account created on this device. You can now sign in with your university email and password.";
    success.hidden = false;
  } catch (exception) {
    error.textContent = exception.message || "Account creation failed. Please try again.";
    error.hidden = false;
  } finally {
    submitButton.disabled = false;
  }
}

function loadRegisteredAccounts() {
  let saved;
  try {
    saved = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
  } catch (exception) {
    throw new Error("Browser storage is unavailable. Enable site storage and try again.");
  }
  if (!saved) return [];
  let accounts;
  try {
    accounts = JSON.parse(saved);
  } catch (exception) {
    throw new Error("Saved accounts are damaged. Clear this site's demo data and create the account again.");
  }
  if (!Array.isArray(accounts) || accounts.some(account =>
    !account || account.role !== "student" || typeof account.email !== "string" ||
    typeof account.fullName !== "string" || typeof account.passwordHash !== "string" ||
    !account.passwordHash.startsWith("pbkdf2$")
  )) {
    throw new Error("Saved accounts have an invalid format. Clear this site's demo data before continuing.");
  }
  return accounts;
}

function saveRegisteredAccounts(accounts) {
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch (exception) {
    throw new Error("Could not save your account in this browser. Check available storage and try again.");
  }
}

async function hashPassword(password) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Secure password hashing is unavailable. Open the site using HTTPS or localhost.");
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: passwordIterations, hash: "SHA-256" }, key, 256);
  return `pbkdf2$${passwordIterations}$${bytesToBase64(salt)}$${bytesToBase64(new Uint8Array(bits))}`;
}

async function verifyPassword(password, storedHash) {
  if (storedHash.startsWith("sha256$")) {
    if (!globalThis.crypto?.subtle) {
      throw new Error("Secure password checking is unavailable. Open the site using HTTPS or localhost.");
    }
    const key = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
    return bytesToHex(new Uint8Array(key)) === storedHash.slice("sha256$".length);
  }
  const [, iterationsText, saltText, expectedHash] = storedHash.split("$");
  const iterations = Number(iterationsText);
  if (!Number.isInteger(iterations) || iterations < 100000 || iterations > 500000 ||
      !saltText || !expectedHash || !globalThis.crypto?.subtle) {
    throw new Error("The saved password data is invalid. Please recreate the account.");
  }
  const salt = base64ToBytes(saltText);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256);
  return bytesToBase64(new Uint8Array(bits)) === expectedHash;
}

function bytesToHex(bytes) {
  return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToBytes(value) {
  try {
    return Uint8Array.from(atob(value), char => char.charCodeAt(0));
  } catch (exception) {
    throw new Error("The saved password data is invalid. Please recreate the account.");
  }
}

function logout() {
  activeRole = null;
  signedInUser = null;
  currentPage = "dashboard";
  authView = "signin";
  render();
}

function navigate(page) {
  currentPage = page;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindPageActions() {
  document.querySelectorAll("[data-action='show-alert-form']").forEach(button => button.addEventListener("click", () => {
    const area = document.querySelector("#alert-form-area");
    if (area) { area.hidden = false; area.scrollIntoView({ behavior: "smooth", block: "start" }); }
  }));
  document.querySelectorAll("[data-action='hide-alert-form']").forEach(button => button.addEventListener("click", () => {
    const area = document.querySelector("#alert-form-area");
    if (area) area.hidden = true;
  }));
  document.querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.page)));
  document.querySelectorAll("[data-resolve]").forEach(button => button.addEventListener("click", () => resolveReport(button.dataset.resolve)));
  document.querySelector("#alert-form")?.addEventListener("submit", publishAlert);
  document.querySelector("#report-form")?.addEventListener("submit", submitReport);
  document.querySelector("#self-check-form")?.addEventListener("submit", selfCheck);
}

function publishAlert(event) {
  event.preventDefault();
  if (!canPublish()) return;
  const form = event.currentTarget;
  const title = form.querySelector("#alert-title").value.trim();
  const description = form.querySelector("#alert-description").value.trim();
  const days = Number(form.querySelector("#alert-days").value);
  if (!title || !description || !Number.isInteger(days) || days < 1 || days > 365) {
    showToast("Enter a title, description, and expiry between 1 and 365 days.");
    return;
  }
  state.alerts.push({
    id: Date.now(),
    title,
    description,
    category: form.querySelector("#alert-category").value,
    severity: form.querySelector("#alert-severity").value,
    createdBy: roles[activeRole].name,
    createdAt: new Date().toISOString(),
    expiresAt: daysFromNow(days)
  });
  if (saveState()) {
    render();
    showToast("Demo alert published in this browser.");
  }
}

function submitReport(event) {
  event.preventDefault();
  if (activeRole !== "student") return;
  const form = event.currentTarget;
  const type = form.querySelector("#report-type").value;
  const message = form.querySelector("#report-message").value.trim();
  const student = signedInUser || roles.student;
  if (!type || !message) {
    showToast("Choose a request category and enter a short description.");
    return;
  }
  state.reports.push({
    id: Date.now(),
    type,
    message,
    reporter: student.email,
    reporterName: student.name,
    createdAt: new Date().toISOString(),
    status: "Open"
  });
  if (saveState()) {
    render();
    showToast("Demo support request saved in this browser.");
  }
}

function resolveReport(id) {
  const report = state.reports.find(item => String(item.id) === String(id));
  if (!report || activeRole === "student") return;
  report.status = "Resolved";
  report.resolution = "Marked resolved in demo.";
  if (saveState()) {
    render();
    showToast("Demo request marked resolved.");
  }
}

function selfCheck(event) {
  event.preventDefault();
  const values = [...event.currentTarget.querySelectorAll("select")].map(select => Number(select.value));
  if (values.some(value => !Number.isInteger(value) || value < 0 || value > 3)) {
    showToast("Answer all five questions to see the information.");
    return;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  let message = "Your score suggests few symptoms in this brief check-in. If you have concerns, consider speaking with a professional.";
  if (total >= 10) message = "Your answers suggest you may be experiencing significant symptoms. Consider contacting a qualified health professional or the counselling centre.";
  else if (total >= 5) message = "Your answers suggest some symptoms. It may help to speak with someone you trust or contact the counselling centre.";
  const result = document.querySelector("#self-check-result");
  result.innerHTML = `<div class="callout">${escapeHtml(message)} This is not a diagnosis. If you are in immediate danger, seek urgent help.</div>`;
}

render();
