/* KEYFRAME v2 — shared behaviour + page modules (no dependencies) */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
  const D = window.KF_I18N;
  const page = document.body.dataset.page;
  let lang = "en";
  const hooks = [];

  /* ---------- Language (persists across pages) ---------- */
  const t = (k, v) => { let s = (D[lang] || D.en)[k] || D.en[k] || k; if (v) for (const x in v) s = s.replace("{" + x + "}", v[x]); return s; };
  const num = (n) => (lang === "ar" ? String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]) : String(n));
  function setLang(l) {
    lang = l;
    document.documentElement.lang = l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    $$("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$("[data-lang-toggle]").forEach((b) => { b.textContent = t("lang.btn"); b.setAttribute("aria-label", t("lang.aria")); });
    hooks.forEach((f) => f());
    try { localStorage.setItem("kf-lang", l); } catch (e) { /* storage unavailable */ }
  }
  $$("[data-lang-toggle]").forEach((b) => b.addEventListener("click", () => setLang(lang === "en" ? "ar" : "en")));
  let saved = null; try { saved = localStorage.getItem("kf-lang"); } catch (e) { saved = null; }
  setLang(saved === "ar" ? "ar" : "en");

  /* ---------- Reveal ---------- */
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { threshold: 0.15, rootMargin: "0px 0px -5% 0px" });
  const revealables = $$(".rv, .rvl, .blades, .zoom");
  function ready() {
    document.body.classList.add("ready");
    revealables.forEach((el) => io.observe(el));
  }

  /* ---------- Loader (home only): blades slide in, logo locks ---------- */
  const loader = $("#loader");
  if (loader) {
    document.body.classList.add("locked");
    (async () => {
      await Promise.race([document.fonts ? document.fonts.ready : 0, wait(1200)]);
      loader.classList.add("go");
      await wait(1500);
      loader.classList.add("done");
      document.body.classList.remove("locked");
      ready();
    })();
  } else {
    requestAnimationFrame(ready);
  }

  /* ---------- Nav ---------- */
  const nav = $("#nav"), burger = $(".burger"), menu = $("#menu");
  let lastY = 0;
  addEventListener("scroll", () => {
    const y = scrollY;
    nav.classList.toggle("solid", y > 40);
    nav.classList.toggle("hide", y > 500 && y > lastY && !menu.classList.contains("open"));
    lastY = y;
  }, { passive: true });
  function setMenu(open) {
    burger.setAttribute("aria-expanded", String(open));
    menu.classList.toggle("open", open);
    menu.setAttribute("aria-hidden", String(!open));
    document.body.classList.toggle("locked", open);
    if (open) $("a", menu).focus();
  }
  burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && menu.classList.contains("open")) { setMenu(false); burger.focus(); } });

  /* ---------- Home: overlap → one record ---------- */
  const stage = $("#ovStage");
  if (stage) {
    const btns = $$(".switch button");
    let touched = false;
    const set = (m) => { stage.dataset.state = m; btns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === m))); };
    btns.forEach((b) => b.addEventListener("click", () => { touched = true; set(b.dataset.mode); }));
    new IntersectionObserver((es, o) => {
      if (es[0].isIntersecting) { o.disconnect(); setTimeout(() => { if (!touched) set("after"); }, reduce ? 0 : 1800); }
    }, { threshold: 0.5 }).observe(stage);
  }

  /* ---------- Platform: three conditions ---------- */
  const card = $("#ucard");
  if (card) {
    const conds = $$(".cond"), badge = $("#recBadge"), st = [false, false, false];
    let busy = false;
    const render = () => {
      conds.forEach((c, i) => c.setAttribute("aria-pressed", String(st[i])));
      $$("[data-row]", card).forEach((row) => {
        const on = st[+row.dataset.row], dd = $("dd", row);
        row.classList.toggle("on", on);
        dd.textContent = on ? (dd.dataset.onI18n ? t(dd.dataset.onI18n) : dd.dataset.on) : "—";
      });
      const n = st.filter(Boolean).length, all = n === 3;
      card.classList.toggle("is-verified", all);
      badge.classList.toggle("on", all);
      badge.textContent = all ? t("state.verified") : n ? t("state.partial", { n: num(n) }) : t("state.notyet");
    };
    conds.forEach((c, i) => c.addEventListener("click", () => { if (!busy) { st[i] = !st[i]; render(); } }));
    const run = async () => {
      if (busy) return; busy = true; st.fill(false); render(); await wait(300);
      for (let i = 0; i < 3; i++) { st[i] = true; render(); await wait(800); }
      busy = false;
    };
    $("#runVerify").addEventListener("click", run);
    $("#resetVerify").addEventListener("click", () => { if (!busy) { st.fill(false); render(); } });
    hooks.push(render); render();
    new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); setTimeout(run, reduce ? 0 : 400); } }, { threshold: 0.4 }).observe(card);
  }

  /* ---------- Platform: product tabs ---------- */
  const tabs = $$('[role="tab"]');
  if (tabs.length) {
    const select = (tab, focus) => {
      tabs.forEach((x) => {
        const on = x === tab;
        x.setAttribute("aria-selected", String(on)); x.tabIndex = on ? 0 : -1;
        document.getElementById(x.getAttribute("aria-controls")).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => select(tab));
      tab.addEventListener("keydown", (e) => {
        const rtl = document.documentElement.dir === "rtl";
        const step = { ArrowDown: 1, ArrowUp: -1, ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[e.key];
        if (step) { e.preventDefault(); select(tabs[(i + step + tabs.length) % tabs.length], true); }
        if (e.key === "Home") { e.preventDefault(); select(tabs[0], true); }
        if (e.key === "End") { e.preventDefault(); select(tabs[tabs.length - 1], true); }
      });
    });
  }
  const assignBtn = $("#assignBtn");
  if (assignBtn) {
    let who = null;
    const render = () => {
      const li = $$("#asgChecks li");
      li[0].classList.toggle("on", !!who); li[1].classList.toggle("on", !!who);
      $("#asgBadge").textContent = who ? t("state.partial", { n: num(2) }) : t("state.nonholder");
      $("#asgNote").textContent = who ? t("ui.assignedTo", { name: who }) : t("ui.one");
      $(".asg").classList.toggle("done", !!who);
    };
    assignBtn.addEventListener("click", () => { who = ($('input[name="req"]:checked') || {}).value || null; render(); });
    hooks.push(render);
  }
  const copy = $("#copyLink");
  if (copy) copy.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText("https://keyframe.app/l/14B-sample"); $("#copyNote").textContent = t("ui.copied"); }
    catch (e) { $("#copyNote").textContent = t("ui.copyFail"); }
  });

  /* ---------- Contact form (placeholder, validated) ---------- */
  const form = $("#ctForm");
  if (form) {
    const rules = [["cName", "eName", (v) => v.trim().length > 1, "err.name"], ["cEmail", "eEmail", (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), "err.email"]];
    rules.forEach(([id, eid]) => $("#" + id).addEventListener("input", () => { $("#" + eid).textContent = ""; $("#" + id).removeAttribute("aria-invalid"); }));
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let bad = null;
      rules.forEach(([id, eid, ok, msg]) => {
        const el = $("#" + id), good = ok(el.value);
        $("#" + eid).textContent = good ? "" : t(msg);
        if (good) el.removeAttribute("aria-invalid"); else el.setAttribute("aria-invalid", "true");
        if (!good && !bad) bad = el;
      });
      if (bad) { bad.focus(); return; }
      form.hidden = true;
      const done = $("#ctDone"); done.hidden = false; done.focus();
    });
  }
})();
