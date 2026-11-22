/* KEYFRAME platform prototype — in-memory demo data + developer/broker workspaces. No backend. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const D = window.KF_I18N;
  const ROLE = document.body.dataset.app; // "developer" | "broker"
  let lang = "en";
  const t = (k, v) => { let s = (D[lang] || D.en)[k] || D.en[k] || k; if (v) for (const x in v) s = s.split("{" + x + "}").join(v[x]); return s; };
  const nf = (n) => new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-US").format(n);
  const egp = (n) => (lang === "ar" ? nf(n) + " ج.م" : "EGP " + nf(n));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- Demo data ---------- */
  const IMGS = ["viewing", "retreat", "skyline", "kitchen-keys", "balcony", "shadows"];
  const BROKERS = { b1: "Youssef K.", b2: "Nour H.", b3: "Omar T.", b4: "Mariam S.", b5: "Salma R." };
  const ME = ROLE === "developer" ? { name: "Hana M.", initials: "HM", org: "Nile Crest Developments" } : { id: "b1", name: "Youssef K.", initials: "YK" };
  const PROJECT = "Palm Residences";
  const units = [];
  const plan = { // floor -> statuses A..F  (v verified, a assigned, o open, c conflict)
    16: "vvavov", 15: "caovav", 14: "vvvaov", 13: "avvova", 12: "vaovvv", 11: "vavoav",
  };
  const holders = ["b2", "b4", "b5", "b3"];
  let hi = 0;
  Object.entries(plan).forEach(([floor, row]) => {
    [...row].forEach((code, i) => {
      const id = floor + "ABCDEF"[i];
      const beds = [2, 3, 3, 2, 4, 3][i];
      const st = { v: "verified", a: "assigned", o: "open", c: "conflict" }[code];
      let holder = null;
      if (st === "verified" || st === "assigned") { holder = holders[hi++ % holders.length]; }
      if (["14B", "12A", "16C", "13A"].includes(id)) holder = "b1";
      units.push({
        id, floor: +floor, beds, area: [128, 182, 165, 131, 214, 176][i], price: Math.round(([5.9, 8.4, 7.6, 6.1, 10.2, 8.1][i] + (floor - 11) * 0.12) * 1e6 / 10000) * 10000,
        status: st, holder, conds: [st === "verified" || st === "assigned", st === "verified" || st === "assigned", st === "verified"],
        leads: st === "open" ? 0 : (i * 3 + +floor) % 7 + 1, img: IMGS[(i + +floor) % IMGS.length],
      });
    });
  });
  // the broker's own portfolio
  const U = (id) => units.find((u) => u.id === id);
  let reqs = [
    { id: "r1", unit: "15C", broker: "b2", leads: 3, status: "pending" },
    { id: "r2", unit: "15C", broker: "b3", leads: 1, status: "pending" },
    { id: "r3", unit: "12C", broker: "b5", leads: 2, status: "pending" },
    { id: "r4", unit: "13D", broker: "b4", leads: 2, status: "pending" },
    { id: "r5", unit: "11D", broker: "b1", leads: 1, status: "pending" },
  ];
  let leads = [
    { id: "l1", unit: "14B", broker: "b1", name: "Ahmed S.", budget: 8500000, status: "qualified", d: 1 },
    { id: "l2", unit: "14B", broker: "b1", name: "Laila M.", budget: 8200000, status: "qualified", d: 2 },
    { id: "l3", unit: "13A", broker: "b1", name: "Karim F.", budget: 5800000, status: "checking", d: 0 },
    { id: "l4", unit: "16A", broker: "b2", name: "Mona R.", budget: 6400000, status: "qualified", d: 3 },
    { id: "l5", unit: "13B", broker: "b4", name: "Tarek H.", budget: 8000000, status: "qualified", d: 4 },
  ];
  const transfers = [
    { unit: "14B", broker: "b1", price: 8400000, step: 3, dates: ["12 Nov", "14 Nov", "17 Nov"] },
    { unit: "13A", broker: "b1", price: 5960000, step: 2, dates: ["15 Nov", "18 Nov"] },
    { unit: "16A", broker: "b2", price: 6560000, step: 1, dates: ["18 Nov"] },
  ];

  /* ---------- Language ---------- */
  function setLang(l) {
    lang = l;
    document.documentElement.lang = l; document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    $$("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$("[data-lang-toggle]").forEach((b) => { b.textContent = t("lang.btn"); b.setAttribute("aria-label", t("lang.aria")); });
    try { localStorage.setItem("kf-lang", l); } catch (e) { /* no storage */ }
    if (typeof render === "function" && ROLE) render();
  }
  $$("[data-lang-toggle]").forEach((b) => b.addEventListener("click", () => setLang(lang === "en" ? "ar" : "en")));
  let saved = null; try { saved = localStorage.getItem("kf-lang"); } catch (e) { saved = null; }

  /* ---------- Sign-in page ---------- */
  const signForm = $("#signForm");
  if (signForm) {
    setLang(saved === "ar" ? "ar" : "en");
    const rules = [["siEmail", "siEmailErr", (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), "err.email"], ["siPass", "siPassErr", (v) => v.length > 0, "err.pass"]];
    rules.forEach(([id, e]) => $("#" + id).addEventListener("input", () => { $("#" + e).textContent = ""; $("#" + id).removeAttribute("aria-invalid"); }));
    signForm.addEventListener("submit", (ev) => {
      ev.preventDefault();
      let bad = null;
      rules.forEach(([id, e, ok, msg]) => { const el = $("#" + id), g = ok(el.value); $("#" + e).textContent = g ? "" : t(msg); if (g) el.removeAttribute("aria-invalid"); else el.setAttribute("aria-invalid", "true"); if (!g && !bad) bad = el; });
      if (bad) { bad.focus(); return; }
      $("#siPass").value = ""; // never keep the typed value around
      const role = $('input[name="role"]:checked').value;
      location.href = role === "broker" ? "app-broker.html#overview" : "app-developer.html#overview";
    });
    return;
  }

  /* ---------- Shell ---------- */
  const view = $("#view"), title = $("#pageTitle");
  const side = $(".ka-side");
  $(".ka-menu").addEventListener("click", () => side.classList.toggle("open"));
  $(".ka-signout").addEventListener("click", () => { location.href = "signin.html"; });
  $("#meName").textContent = ME.name; $("#meInit").textContent = ME.initials;

  const toasts = $(".ka-toasts");
  function toast(msg, undo) {
    const el = document.createElement("div"); el.className = "ka-toast"; el.setAttribute("role", "status");
    el.innerHTML = `<span>${esc(msg)}</span>` + (undo ? `<button type="button">${t("undo")}</button>` : "");
    if (undo) $("button", el).addEventListener("click", () => { undo(); el.remove(); });
    toasts.appendChild(el); setTimeout(() => el.remove(), 5000);
  }

  /* status helpers */
  const st = (s) => `<span class="ka-st ka-st--${s}">${t("st." + s)}</span>`;
  const seg = (c) => `<span class="ka-seg${c.every(Boolean) ? " all" : ""}" aria-label="${c.filter(Boolean).length}/3">${c.map((x) => `<i class="${x ? "on" : ""}"></i>`).join("")}</span>`;
  const kpi = (label, n, cls = "") => `<div class="ka-kpi ${cls}"><small>${label}</small><b>${nf(n)}</b></div>`;
  const recompute = (u) => {
    if (u.status === "conflict") return;
    u.status = u.conds.every(Boolean) ? "verified" : u.holder ? "assigned" : "open";
  };

  /* ---------- Drawer (unit record) ---------- */
  const scrim = $(".ka-scrim"), drawer = $(".ka-drawer");
  let lastFocus = null;
  function closeDrawer() { drawer.classList.remove("open"); scrim.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); if (lastFocus) lastFocus.focus(); }
  scrim.addEventListener("click", closeDrawer);
  addEventListener("keydown", (e) => { if (e.key === "Escape" && drawer.classList.contains("open")) closeDrawer(); });
  function openUnit(id) {
    const u = U(id); if (!u) return;
    lastFocus = document.activeElement;
    const all = u.conds.every(Boolean);
    const openReqs = reqs.filter((r) => r.unit === u.id && r.status === "pending").length;
    let note = u.status === "verified" ? t("u.verifiedNote") : u.status === "conflict" ? t("u.conflictNote") : !u.holder ? t("u.openNote") : "";
    let actions = "";
    if (ROLE === "developer") {
      if (u.status === "conflict") actions += `<button class="ka-btn" data-act="recheck">${t("u.resolve")}</button>`;
      if (u.holder && u.status !== "verified") actions += `<button class="ka-btn ka-btn--danger" data-act="revoke">${t("u.revoke")}</button>`;
      if (openReqs) actions += `<button class="ka-btn ka-btn--ghost" data-act="reqs">${t("u.toreqs")}</button>`;
    }
    drawer.innerHTML = `<div class="ka-drawer__img"><img src="assets/img/${u.img}.webp" alt=""></div>
      <div class="ka-drawer__body">
        <div class="ka-drawer__head"><div><small class="ka-note">${PROJECT} · ${t("t.floor")} ${nf(u.floor)}</small><h3 id="drwT">${t("t.unit")} ${u.id}</h3></div><button class="ka-close" type="button" aria-label="Close">×</button></div>
        <div>${st(u.status)}</div>
        ${u.status === "conflict" ? `<div class="ka-alert" role="note">${note}</div>` : note ? `<p class="ka-note">${note}</p>` : ""}
        <ul class="ka-checks${all ? " all" : ""}">${["u.cond1", "u.cond2", "u.cond3"].map((k, i) => `<li class="${u.conds[i] ? "on" : ""}">${t(k)}</li>`).join("")}</ul>
        <dl class="ka-dl">
          <div><dt>${t("t.holder")}</dt><dd>${u.holder ? BROKERS[u.holder] : t("u.none")}</dd></div>
          <div><dt>${t("t.type")}</dt><dd>${t("beds", { n: nf(u.beds) })} · ${t("sqm", { n: nf(u.area) })}</dd></div>
          <div><dt>${t("t.price")}</dt><dd>${egp(u.price)}</dd></div>
          <div><dt>${t("u.leads")}</dt><dd>${nf(u.leads)}</dd></div>
          ${ROLE === "developer" ? `<div><dt>${t("u.reqs")}</dt><dd>${nf(openReqs)}</dd></div>` : ""}
        </dl>
        ${actions ? `<div class="ka-btnrow">${actions}</div>` : ""}
      </div>`;
    drawer.setAttribute("aria-labelledby", "drwT"); drawer.setAttribute("aria-hidden", "false");
    drawer.classList.add("open"); scrim.classList.add("open");
    $(".ka-close", drawer).addEventListener("click", closeDrawer); $(".ka-close", drawer).focus();
    $$("[data-act]", drawer).forEach((b) => b.addEventListener("click", () => {
      const a = b.dataset.act;
      if (a === "reqs") { closeDrawer(); location.hash = "requests"; }
      if (a === "recheck") { u.status = "open"; u.conds = [false, false, false]; recompute(u); toast(t("toast.recheck", { u: u.id })); render(); openUnit(u.id); }
      if (a === "revoke") confirmRevoke(u);
    }));
  }
  const dlg = $("#kaDialog");
  function confirmRevoke(u) {
    $("#dlgH").textContent = t("dlg.revoke.h", { u: u.id });
    $("#dlgP").textContent = t("dlg.revoke.p", { b: BROKERS[u.holder] });
    $("#dlgOk").textContent = t("dlg.revoke.ok"); $("#dlgCancel").textContent = t("dlg.cancel");
    dlg.showModal(); $("#dlgCancel").focus();
    $("#dlgOk").onclick = () => {
      dlg.close(); const prev = { holder: u.holder, conds: [...u.conds], status: u.status };
      u.holder = null; u.conds = [false, false, false]; recompute(u); render(); openUnit(u.id);
      toast(t("toast.revoked", { u: u.id }), () => { Object.assign(u, prev); render(); });
    };
    $("#dlgCancel").onclick = () => dlg.close();
  }

  /* ---------- Developer views ---------- */
  const filters = { status: "all", q: "" };
  const counts = () => ({ total: units.length, verified: units.filter((u) => u.status === "verified").length, assigned: units.filter((u) => u.status === "assigned").length, open: units.filter((u) => u.status === "open").length, conflict: units.filter((u) => u.status === "conflict").length });
  function building(clickable = true) {
    const floors = [...new Set(units.filter((u) => u.floor >= 11).map((u) => u.floor))].sort((a, b) => b - a);
    return `<div class="ka-bld" role="grid" aria-label="${t("bld")}">` + floors.map((f) => `<div class="ka-row" role="row"><b>F${f}</b>` +
      units.filter((u) => u.floor === f).map((u) => `<button type="button" role="gridcell" class="ka-cell ka-cell--${u.status}" data-unit="${u.id}" aria-label="${u.id} — ${t("st." + u.status)}"${clickable ? "" : " tabindex=-1"}>${u.id}</button>`).join("") + `</div>`).join("") + `</div>`;
  }
  const legend = () => `<div class="ka-legend">${["verified", "assigned", "open", "conflict"].map((s) => `<span><i class="ka-cell--${s}" style="${s === "open" ? "border:1px dashed var(--kf-neutral-500)" : s === "conflict" ? "border:1.5px solid var(--kf-brick-600)" : ""}"></i>${t("st." + s)}</span>`).join("")}</div>`;

  const DEV = {
    overview() {
      const c = counts(), pend = reqs.filter((r) => r.status === "pending").length;
      const conflicts = units.filter((u) => u.status === "conflict");
      return `<div class="ka-hello"><h2>${t("dev.hello", { name: ME.name.split(" ")[0] })}</h2><p>${t("dev.sub", { project: PROJECT })}</p></div>
      <div class="ka-kpis">${kpi(t("k.total"), c.total)}${kpi(t("k.verified"), c.verified, "is-ver")}${kpi(t("k.assigned"), c.assigned)}${kpi(t("k.open"), c.open)}${kpi(t("k.conflict"), c.conflict, c.conflict ? "is-err" : "")}</div>
      <div class="ka-grid ka-grid--2">
        <section class="ka-card"><div class="ka-card__h"><h3>${t("bld")}</h3>${legend()}</div>${building()}<p class="ka-note" style="margin-top:12px">${t("bld.hint")}</p></section>
        <div class="ka-grid">
          <section class="ka-card"><div class="ka-card__h"><h3>${t("attn")}</h3></div>
            ${conflicts.length || pend ? `<div class="ka-grid" style="gap:8px">${conflicts.map((u) => `<div class="ka-alert"><span>${t("attn.conflict", { u: u.id })}</span><button class="ka-btn ka-btn--danger" data-open="${u.id}">${t("u.view")}</button></div>`).join("")}
            ${pend ? `<div class="ka-warn">${t("attn.req", { n: nf(pend) })} — <a href="#requests">${t("u.toreqs")}</a></div>` : ""}</div>` : `<p class="ka-note">${t("attn.none")}</p>`}
          </section>
          <section class="ka-card"><div class="ka-card__h"><h3>${t("act")}</h3></div><ul class="ka-list">
            ${[["act.1", "h", 2], ["act.2", "h", 5], ["act.3", "d", 1], ["act.4", "d", 2]].map(([k, u, n]) => `<li><span>${t(k)}</span><em>${t("ago." + u, { n: nf(n) })}</em></li>`).join("")}
          </ul></section>
        </div>
      </div>`;
    },
    inventory() {
      const c = counts();
      const list = units.filter((u) => (filters.status === "all" || u.status === filters.status) && (!filters.q || (u.id + " " + (BROKERS[u.holder] || "")).toLowerCase().includes(filters.q.toLowerCase())));
      const chips = ["all", "verified", "assigned", "open", "conflict"].map((s) => `<button type="button" class="ka-chip" data-filter="${s}" aria-pressed="${filters.status === s}">${s === "all" ? t("f.all") : t("st." + s)} <small>${nf(s === "all" ? c.total : c[s])}</small></button>`).join("");
      return `<div class="ka-toolbar"><div class="ka-chips" role="group" aria-label="${t("t.status")}">${chips}</div>
        <label class="sr-only" for="q">${t("f.search")}</label><input id="q" class="ka-input" type="search" placeholder="${t("f.search")}" value="${esc(filters.q)}"></div>
      <section class="ka-card" aria-live="polite">${list.length ? `<div class="ka-tablewrap"><table class="ka-table"><thead><tr><th>${t("t.unit")}</th><th>${t("t.floor")}</th><th>${t("t.type")}</th><th>${t("t.price")}</th><th>${t("t.holder")}</th><th>${t("t.conds")}</th><th>${t("t.status")}</th></tr></thead><tbody>
        ${list.map((u) => `<tr data-open="${u.id}" tabindex="0"><td><b>${u.id}</b></td><td class="num">${nf(u.floor)}</td><td>${t("beds", { n: nf(u.beds) })} · ${t("sqm", { n: nf(u.area) })}</td><td class="num">${egp(u.price)}</td><td>${u.holder ? BROKERS[u.holder] : "—"}</td><td>${seg(u.conds)}</td><td>${st(u.status)}</td></tr>`).join("")}
      </tbody></table></div>` : `<div class="ka-empty"><b>${t("empty.h")}</b><span>${t("empty.p")}</span><button class="ka-btn ka-btn--ghost" data-clear>${t("empty.clear")}</button></div>`}</section>`;
    },
    requests() {
      const pend = reqs.filter((r) => r.status === "pending");
      const byUnit = [...new Set(pend.map((r) => r.unit))];
      return `<p class="ka-note">${t("rq.sub")}</p>` + (byUnit.length ? byUnit.map((id) => {
        const u = U(id);
        return `<section class="ka-card ka-req"><div class="ka-req__unit"><h4>${t("t.unit")} ${id}</h4><p>${t("beds", { n: nf(u.beds) })} · ${t("sqm", { n: nf(u.area) })} · ${egp(u.price)}</p><div style="margin-top:10px">${st(u.status)}</div></div>
          <ul class="ka-list">${pend.filter((r) => r.unit === id).map((r) => `<li><span><b>${BROKERS[r.broker]}</b><em>${t("rq.leads", { n: nf(r.leads) })} · ${t("rq.id")}</em></span><span class="ka-actions"><button class="ka-btn" data-approve="${r.id}">${t("rq.approve")}</button><button class="ka-btn ka-btn--ghost" data-decline="${r.id}">${t("rq.decline")}</button></span></li>`).join("")}</ul></section>`;
      }).join("") : `<section class="ka-card"><div class="ka-empty"><b>${t("rq.none")}</b></div></section>`);
    },
    leads() {
      return `<section class="ka-card"><div class="ka-tablewrap"><table class="ka-table"><thead><tr><th>${t("t.lead")}</th><th>${t("t.unit")}</th><th>${t("t.broker")}</th><th>${t("t.budget")}</th><th>${t("t.status")}</th></tr></thead><tbody>
        ${leads.map((l) => `<tr data-open="${l.unit}" tabindex="0"><td><b>${esc(l.name)}</b></td><td>${l.unit}</td><td>${BROKERS[l.broker]}</td><td class="num">${egp(l.budget)}</td><td>${st(l.status)}</td></tr>`).join("")}
      </tbody></table></div></section>`;
    },
    transfers() { return transfersView(transfers); },
  };
  function transfersView(list) {
    return list.map((x) => `<section class="ka-card"><div class="ka-card__h"><h3>${t("t.unit")} ${x.unit} · ${egp(x.price)}</h3><span class="ka-proto">${t("tr.step", { n: nf(Math.min(x.step + 1, 4)) })}</span></div>
      <ol class="ka-tl">${[1, 2, 3, 4].map((n) => `<li class="${n <= x.step ? "done" : n === x.step + 1 ? "now" : ""}"><i></i><b>${t("tr." + n)}</b><em>${n <= x.step ? x.dates[n - 1] : t("tr.pending")}</em></li>`).join("")}</ol>
      <dl class="ka-dl" style="margin-top:16px"><div><dt>${t("t.holder")}</dt><dd>${BROKERS[x.broker]}</dd></div><div><dt>${t("tr.trustee")}</dt><dd>${t("tr.tbc")}</dd></div></dl></section>`).join("") + `<p class="ka-note">${t("tr.note")}</p>`;
  }

  /* ---------- Broker views ---------- */
  const bf = { beds: "any" };
  const mine = () => units.filter((u) => u.holder === ME.id);
  const BRK = {
    overview() {
      const my = mine(), pend = reqs.filter((r) => r.broker === ME.id && r.status === "pending").length;
      return `<div class="ka-hello"><h2>${t("brk.hello", { name: ME.name.split(" ")[0] })}</h2><p>${t("brk.sub")}</p></div>
      <div class="ka-kpis">${kpi(t("k.holder"), my.length)}${kpi(t("k.pendingReq"), pend)}${kpi(t("k.leads"), leads.filter((l) => l.broker === ME.id && l.status === "qualified").length)}${kpi(t("k.transfer"), transfers.filter((x) => x.broker === ME.id).length)}</div>
      <div class="ka-grid ka-grid--2">
        <section class="ka-card"><div class="ka-card__h"><h3>${t("nav.myunits")}</h3><a href="#units">${t("u.view")}</a></div>
          <ul class="ka-list">${my.map((u) => `<li><span><b>${t("t.unit")} ${u.id}</b><em>${PROJECT} · ${egp(u.price)}</em></span><span>${seg(u.conds)}</span>${st(u.status)}</li>`).join("")}</ul></section>
        <section class="ka-card"><div class="ka-card__h"><h3>${t("brk.verified")}</h3><span class="ka-st ka-st--verified">${t("st.verified")}</span></div>
          <dl class="ka-dl"><div><dt>${t("t.broker")}</dt><dd>${ME.name}</dd></div><div><dt>ID</dt><dd>${t("brk.id")}</dd></div></dl>
          <div style="margin-top:14px" class="ka-btnrow"><a class="ka-btn" href="#find">${t("nav.find")}</a><a class="ka-btn ka-btn--ghost" href="#leads">${t("ld.add")}</a></div></section>
      </div>`;
    },
    find() {
      const open = units.filter((u) => u.status === "open" && (bf.beds === "any" || u.beds === +bf.beds));
      const chips = ["any", "2", "3", "4"].map((b) => `<button type="button" class="ka-chip" data-beds="${b}" aria-pressed="${bf.beds === b}">${b === "any" ? t("fd.any") : t("beds", { n: nf(b) })}</button>`).join("");
      return `<p class="ka-note">${t("fd.sub")}</p><div class="ka-toolbar"><div class="ka-chips" role="group" aria-label="${t("fd.beds")}">${chips}</div></div>
      ${open.length ? `<div class="ka-units">${open.map((u) => {
        const req = reqs.find((r) => r.unit === u.id && r.broker === ME.id && r.status === "pending");
        return `<article class="ka-ucard"><div class="ka-ucard__img"><img src="assets/img/${u.img}.webp" alt="" loading="lazy"></div>
          <div class="ka-ucard__body"><h4>${t("t.unit")} ${u.id}</h4><p>${PROJECT} · ${t("beds", { n: nf(u.beds) })} · ${t("sqm", { n: nf(u.area) })}</p><span class="ka-price">${egp(u.price)}</span></div>
          <div class="ka-ucard__foot">${st("open")}<button class="ka-btn${req ? " ka-btn--ghost" : ""}" data-request="${u.id}" ${req ? "disabled" : ""}>${req ? t("fd.requested") : t("fd.request")}</button></div></article>`;
      }).join("")}</div>` : `<section class="ka-card"><div class="ka-empty"><b>${t("empty.h")}</b><button class="ka-btn ka-btn--ghost" data-beds="any">${t("empty.clear")}</button></div></section>`}`;
    },
    units() {
      const my = mine();
      if (!my.length) return `<section class="ka-card"><div class="ka-empty"><b>${t("mu.none")}</b><a class="ka-btn" href="#find">${t("nav.find")}</a></div></section>`;
      const v = my.find((u) => u.status === "verified");
      return `<p class="ka-note">${t("mu.sub")}</p><div class="ka-units">${my.map((u) => `<article class="ka-ucard"><div class="ka-ucard__img"><img src="assets/img/${u.img}.webp" alt="" loading="lazy"></div>
        <div class="ka-ucard__body"><h4>${t("t.unit")} ${u.id}</h4><p>${PROJECT} · ${t("beds", { n: nf(u.beds) })}</p><span>${seg(u.conds)}</span></div>
        <div class="ka-ucard__foot">${st(u.status)}<button class="ka-btn ka-btn--ghost" data-share="${u.id}" ${u.status === "verified" ? "" : "disabled title=\"" + t("mu.locked") + "\""}>${t("mu.share")}</button></div></article>`).join("")}</div>
        ${v ? sharePanel(v) : `<p class="ka-note">${t("mu.locked")}</p>`}`;
    },
    leads() {
      const my = mine(), mineLeads = leads.filter((l) => l.broker === ME.id);
      return `<div class="ka-grid ka-grid--2">
        <section class="ka-card"><div class="ka-card__h"><h3>${t("nav.leads")}</h3></div>${mineLeads.length ? `<div class="ka-tablewrap"><table class="ka-table"><thead><tr><th>${t("t.lead")}</th><th>${t("t.unit")}</th><th>${t("t.budget")}</th><th>${t("t.status")}</th></tr></thead><tbody>
          ${mineLeads.map((l) => `<tr><td><b>${esc(l.name)}</b></td><td>${l.unit}</td><td class="num">${egp(l.budget)}</td><td>${st(l.status)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="ka-empty">${t("ld.none")}</div>`}</section>
        <section class="ka-card"><div class="ka-card__h"><h3>${t("ld.add")}</h3></div>
          <form id="leadForm" class="ka-grid" style="gap:12px" novalidate>
            <div class="ka-field"><label for="lName">${t("ld.name")}</label><input class="ka-input" id="lName" autocomplete="off" aria-describedby="eLName"><span class="ka-err" id="eLName"></span></div>
            <div class="ka-field"><label for="lPhone">${t("ld.phone")}</label><input class="ka-input" id="lPhone" type="tel" inputmode="tel" autocomplete="off" aria-describedby="eLPhone"><span class="ka-err" id="eLPhone"></span></div>
            <div class="ka-field"><label for="lUnit">${t("ld.unit")}</label><select class="ka-select" id="lUnit">${my.map((u) => `<option value="${u.id}">${u.id}</option>`).join("")}</select></div>
            <div class="ka-field"><label for="lBudget">${t("ld.budget")}</label><input class="ka-input" id="lBudget" inputmode="numeric" autocomplete="off" aria-describedby="eLBudget"><span class="ka-err" id="eLBudget"></span></div>
            <button class="ka-btn" type="submit">${t("ld.save")}</button><p class="ka-note">${t("ld.note")}</p>
          </form></section></div>`;
    },
    transfers() { return transfersView(transfers.filter((x) => x.broker === ME.id)); },
  };
  function sharePanel(u) {
    return `<section class="ka-card"><div class="ka-card__h"><h3>${t("mu.shareH")} · ${u.id}</h3></div><div class="ka-share">
      <div class="ka-phone"><div class="ka-phone__in"><div class="ka-phone__img"><img src="assets/img/${u.img}.webp" alt=""></div>
        <div class="ka-phone__body">${st("verified")}<h4>${t("t.unit")} ${u.id}</h4><span class="ka-note">${PROJECT} · ${t("beds", { n: nf(u.beds) })} · ${t("sqm", { n: nf(u.area) })}</span><b class="ka-price">${egp(u.price)}</b>
        <dl class="ka-dl"><div><dt>${t("t.holder")}</dt><dd>${ME.name}</dd></div></dl><span class="ka-phone__cta">${t("mu.contact")}</span></div></div></div>
      <div class="ka-grid" style="gap:12px;align-content:center"><p class="ka-note">${t("ui.shareP")}</p><div><button class="ka-btn" data-copy="${u.id}">${t("mu.copy")}</button></div></div></div></section>`;
  }

  /* ---------- Router ---------- */
  const VIEWS = ROLE === "developer" ? DEV : BRK;
  const NAVS = ROLE === "developer" ? ["overview", "inventory", "requests", "leads", "transfers"] : ["overview", "find", "units", "leads", "transfers"];
  const NAVKEY = { overview: "nav.overview", inventory: "nav.inventory", requests: "nav.requests", leads: "nav.leads", transfers: "nav.transfers", find: "nav.find", units: "nav.myunits" };
  const current = () => (NAVS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "overview");
  function render() {
    const v = current();
    $(".ka-nav").innerHTML = NAVS.map((n) => {
      const c = n === "requests" ? reqs.filter((r) => r.status === "pending").length : 0;
      return `<li><a href="#${n}"${n === v ? ' aria-current="page"' : ""}><span>${t(NAVKEY[n])}</span>${c ? `<span class="ka-count">${nf(c)}</span>` : ""}</a></li>`;
    }).join("");
    title.textContent = t(NAVKEY[v]);
    document.title = t(NAVKEY[v]) + " — KEYFRAME";
    view.innerHTML = VIEWS[v]();
    view.style.animation = "none"; void view.offsetWidth; view.style.animation = "";
    wire();
  }
  addEventListener("hashchange", () => { render(); side.classList.remove("open"); window.scrollTo(0, 0); $("#pageTitle").focus({ preventScroll: true }); });

  function wire() {
    $$("[data-open], .ka-cell", view).forEach((el) => {
      const id = el.dataset.open || el.dataset.unit;
      el.addEventListener("click", () => openUnit(id));
      if (el.tagName === "TR") el.addEventListener("keydown", (e) => { if (e.key === "Enter") openUnit(id); });
    });
    $$("[data-filter]", view).forEach((b) => b.addEventListener("click", () => { filters.status = b.dataset.filter; render(); }));
    const q = $("#q", view);
    if (q) q.addEventListener("input", () => { filters.q = q.value; const pos = q.selectionStart; render(); const n = $("#q", view); n.focus(); n.setSelectionRange(pos, pos); });
    const clr = $("[data-clear]", view); if (clr) clr.addEventListener("click", () => { filters.status = "all"; filters.q = ""; render(); });
    $$("[data-approve]", view).forEach((b) => b.addEventListener("click", () => {
      const r = reqs.find((x) => x.id === b.dataset.approve), u = U(r.unit);
      const snapshot = reqs.map((x) => ({ ...x })), prev = { holder: u.holder, conds: [...u.conds], status: u.status, leads: u.leads };
      reqs.forEach((x) => { if (x.unit === r.unit && x.status === "pending") x.status = x.id === r.id ? "approved" : "declined"; });
      u.holder = r.broker; u.conds = [true, true, false]; u.leads = r.leads; recompute(u); render();
      toast(t("toast.assigned", { b: BROKERS[r.broker], u: u.id }), () => { reqs = snapshot; Object.assign(u, prev); render(); });
    }));
    $$("[data-decline]", view).forEach((b) => b.addEventListener("click", () => {
      const r = reqs.find((x) => x.id === b.dataset.decline); r.status = "declined"; render();
      toast(t("toast.declined"), () => { r.status = "pending"; render(); });
    }));
    $$("[data-beds]", view).forEach((b) => b.addEventListener("click", () => { bf.beds = b.dataset.beds; render(); }));
    $$("[data-request]", view).forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.request; reqs.push({ id: "r" + Date.now(), unit: id, broker: ME.id, leads: leads.filter((l) => l.broker === ME.id).length, status: "pending" });
      render(); toast(t("toast.requested", { u: id }));
    }));
    $$("[data-share]", view).forEach((b) => b.addEventListener("click", () => { const p = $(".ka-share", view); if (p) p.scrollIntoView({ behavior: "smooth", block: "center" }); }));
    $$("[data-copy]", view).forEach((b) => b.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText("https://keyframe.app/l/" + b.dataset.copy + "-sample"); toast(t("toast.copied")); } catch (e) { toast(t("toast.copyFail")); }
    }));
    const lf = $("#leadForm", view);
    if (lf) lf.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = [["lName", "eLName", (v) => v.trim().length > 1, "ld.errName"], ["lPhone", "eLPhone", (v) => v.replace(/\D/g, "").length >= 8, "ld.errPhone"], ["lBudget", "eLBudget", (v) => +v.replace(/\D/g, "") > 0, "ld.errBudget"]];
      let bad = null;
      f.forEach(([id, eid, ok, msg]) => { const el = $("#" + id), g = ok(el.value); $("#" + eid).textContent = g ? "" : t(msg); if (g) el.removeAttribute("aria-invalid"); else el.setAttribute("aria-invalid", "true"); if (!g && !bad) bad = el; });
      if (bad) { bad.focus(); return; }
      const l = { id: "l" + Date.now(), unit: $("#lUnit").value, broker: ME.id, name: $("#lName").value.trim(), budget: +$("#lBudget").value.replace(/\D/g, ""), status: "checking" };
      leads.unshift(l); render(); toast(t("toast.lead"));
      setTimeout(() => { l.status = "qualified"; if (current() === "leads") render(); toast(t("toast.qualified", { u: l.unit })); }, 3500);
    });
  }

  setLang(saved === "ar" ? "ar" : "en");
})();
