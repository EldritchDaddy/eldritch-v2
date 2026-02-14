/**
 * ELDRITCH V2 — app.js (PRODUCTION-GRADE UI SHELL)
 *
 * LOCKED CONTRACT (current):
 * 1) Enter inserts newline only (never sends). Only ↑ sends.
 * 2) WORLD shows input bar. STATUS/INVENTORY/SKILLS/MAPS/NPC are view-only (input hidden).
 * 3) Life Job 1 & 2 tabs are HIDDEN until unlocked (engine-side).
 * 4) Cooldowns are in TURNS (input→output cycles), never seconds, never ticks.
 * 5) Fatigue displayed as: FATIGUE cur/max (ties to STA max).
 * 6) WORLD LOG contains player inputs only (no system echoes).
 * 7) Drift-resistant: if DOM IDs are missing, app logs and exits without half-binding.
 *
 * IMPORTANT:
 * - Supports BOTH naming schemes for life job tabs:
 *   - data-tab="ALCHEMY" / "FORAGING"  (legacy mock)
 *   - data-tab="LIFEJOB1" / "LIFEJOB2" (production)
 *
 * BOOT WATCHDOG CONTRACT (NEW):
 * - index.html sets window.__ELDRITCH_BOOTED = false and displays BOOT TIMEOUT if app.js never boots.
 * - app.js must set window.__ELDRITCH_BOOTED = true after successful init.
 */

(() => {
  "use strict";

  // BOOT FLAG: default false until we finish init successfully
  try { window.__ELDRITCH_BOOTED = false; } catch {}

  // ---------- Hard guard: never silent blank ----------
  const fatal = (msg, err) => {
    try { console.log("[ELDRITCH] FATAL:", msg, err || ""); } catch {}
    try {
      const cs = document.querySelector("#contentScroll");
      if (cs) {
        const safe = String(msg)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;");
        cs.innerHTML = `
          <section class="panel">
            <div class="panelTitle">FATAL</div>
            <div class="mono">${safe}</div>
          </section>
        `;
      }
    } catch {}
  };

  try {
    // -------------------- Utilities --------------------
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    const escapeHtml = (s) =>
      String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const safeOn = (el, evt, fn, opts) => {
      if (!el) return;
      el.addEventListener(evt, fn, opts);
    };

    // Safe clone (no structuredClone dependency)
    const clone = (obj) => {
      try {
        if (typeof structuredClone === "function") return structuredClone(obj);
      } catch {}
      return JSON.parse(JSON.stringify(obj));
    };

    // -------------------- DOM --------------------
    const dom = {
      contentScroll: $("#contentScroll"),
      inputBar: $("#inputBar"),
      actionBar: $("#actionBar"),
      input: $("#input"),
      sendBtn: $("#sendBtn"),
      cancelBtn: $("#cancelBtn"),
      execBtn: $("#execBtn"),
      topbar: $("#topbar"),
      viewport: $("#viewport"),
      tabs: $$(".tab"),
    };

    const missing = [];
    if (!dom.topbar) missing.push("#topbar");
    if (!dom.viewport) missing.push("#viewport");
    if (!dom.contentScroll) missing.push("#contentScroll");
    if (!dom.inputBar) missing.push("#inputBar");
    if (!dom.actionBar) missing.push("#actionBar");
    if (!dom.input) missing.push("#input");
    if (!dom.sendBtn) missing.push("#sendBtn");
    if (!dom.cancelBtn) missing.push("#cancelBtn");
    if (!dom.execBtn) missing.push("#execBtn");

    if (missing.length) {
      fatal("Missing DOM IDs: " + missing.join(", "));
      return;
    }

    // -------------------- Storage --------------------
    const STORAGE_KEY = "eldritch:v2:ui_state";
    const STORAGE_VER = 4; // currency + facing normalization + job

    const loadState = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.ver !== STORAGE_VER) return null;
        return parsed.state || null;
      } catch {
        return null;
      }
    };

    const saveState = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ver: STORAGE_VER, state }));
      } catch {
        // ignore
      }
    };

    // -------------------- Default (shell) state --------------------
    const defaultState = {
      activeTab: "WORLD",

      mc: {
        name: "MC",
        level: 1,
        job: "None", // ✅ visible in STATUS
        title: "None",
        attributes: { STR: 10, AGI: 10, VIT: 10, INT: 10, DEX: 10, LUK: 10 },
        derived: { ATK: 12, DEF: 6, HIT: "75%", CRIT: "5%", EVA: "10%" },
        fatigue: { cur: 30, max: 30 },
        resources: { HP: 30, MP: 10, conditions: "None" },
        unlocks: { lifeJob1: false, lifeJob2: false },
        equipped: {
          Mainhand: "Iron Dagger",
          Offhand: "[EMPTY]",
          Head: "Weaved Hood",
          Chest: "Weaved Tunic",
          Hands: "[EMPTY]",
          Pants: "Weaved Trousers",
          Feet: "Weaved Boots",
          Necklace: "Flint Pendant",
          Bracelet1: "Bone Shard",
          Bracelet2: "[EMPTY]",
          Ring1: "[EMPTY]",
          Ring2: "[EMPTY]",
          Earring1: "[EMPTY]",
          Earring2: "[EMPTY]",
        },
      },

      world: {
        environment: "Midnight-green fog, wet bark, and distant insect-chime.",
        location: "Whispering Thicket",
        runtime: "00:00",
        time: "09:00 PM",
        date: "Day 1, Cycle 1",
        facing: "NorthEast",
        prose: [
          "The thicket breathes in slow waves, leaves slick with cold dew.",
          "Somewhere deeper, something small scrapes stone, then stops.",
        ],
        kyraName: "Kyra",
        kyra: { risk: "MEDIUM", advantage: "+10", strain: "18%", recommendation: "HOLD." },
        prompt: "What will you do?",
        xp: { cur: 0, req: 135 },
      },

      worldLog: [],

      inventory: {
        currency: { platinum: 0, gold: 0, silver: 0, copper: 0 },
        changes: { used: ["(none)"], stored: ["(none)"], equip: ["(none)"] },
        materials: [
          { name: "Hypotites", rarity: "Common", qty: 10 },
          { name: "Thicket Resin", rarity: "Common", qty: 3 },
        ],
        consumables: [
          { name: "Healing Potion", rarity: "Common", qty: 2 },
          { name: "Antidote", rarity: "Uncommon", qty: 1 },
        ],
        unequipped: [
          { name: "Iron Dagger", rarity: "Common", qty: 1 },
          { name: "Weaved Hood", rarity: "Common", qty: 1 },
        ],
      },

      skills: {
        active: [
          { name: "Piercing Lunge", desc: "Fast linear thrust with increased crit rate.", mastery: "Novice", cdTurns: 0 },
          { name: "Flame Coil", desc: "Mid-range fire arc that can Ignite.", mastery: "Novice", cdTurns: 2 },
        ],
        passive: [
          { name: "Iron Nerve", desc: "Minor fatigue efficiency when moving.", mastery: "Novice" },
          { name: "Keen Edge", desc: "Small bonus to hit confirmation.", mastery: "Novice" },
        ],
      },

      maps: {
        continents: [
          { name: "Asterveil", regions: ["Cindergrove Empire", "Sable Coast", "The Whispering Belt"] },
          { name: "Nocturn Helm", regions: ["Frostbound Dominion", "Glasswater Cities"] },
        ],
      },

      npcs: [
        { name: "Elara", race: "Human", role: "Scout", relation: "Friend", notes: ["Tracks well in wet ground.", "Avoids open flame."] },
        { name: "Kiara", race: "Half-Elf", role: "Courier", relation: "Neutral", notes: ["Knows back paths.", "Hates debt."] },
      ],

      lifeJobs: { LIFEJOB1: null, LIFEJOB2: null },
    };

    const state = loadState() || clone(defaultState);

    // -------------------- Back-compat normalization --------------------
    if (state?.world?.facing === "NE") state.world.facing = "NorthEast";
    if (state?.inventory && !state.inventory.currency) {
      state.inventory.currency = { platinum: 0, gold: 0, silver: 0, copper: 0 };
    }
    if (state?.mc && typeof state.mc.job !== "string") state.mc.job = "None";

    // -------------------- Tabs --------------------
    const LIFEJOB1_ALIASES = new Set(["LIFEJOB1", "ALCHEMY"]);
    const LIFEJOB2_ALIASES = new Set(["LIFEJOB2", "FORAGING"]);

    const normalizeTab = (tab) => {
      if (LIFEJOB1_ALIASES.has(tab)) return "LIFEJOB1";
      if (LIFEJOB2_ALIASES.has(tab)) return "LIFEJOB2";
      return tab;
    };

    const VIEW_ONLY_TABS = new Set(["STATUS", "INVENTORY", "SKILLS", "MAPS", "NPC"]);
    const LIFE_JOB_TABS = new Set(["LIFEJOB1", "LIFEJOB2"]);

    function applyLifeJobGates() {
      const u = state.mc?.unlocks || {};
      const allow1 = !!u.lifeJob1;
      const allow2 = !!u.lifeJob2;

      for (const el of document.querySelectorAll('.tab[data-tab="LIFEJOB1"], .tab[data-tab="ALCHEMY"]')) {
        el.style.display = allow1 ? "" : "none";
      }
      for (const el of document.querySelectorAll('.tab[data-tab="LIFEJOB2"], .tab[data-tab="FORAGING"]')) {
        el.style.display = allow2 ? "" : "none";
      }

      const nt = normalizeTab(state.activeTab);
      if (!allow1 && nt === "LIFEJOB1") state.activeTab = "WORLD";
      if (!allow2 && nt === "LIFEJOB2") state.activeTab = "WORLD";
    }

    // -------------------- Layout / bars --------------------
    function measureViewport() {
      const topH = dom.topbar.offsetHeight || 0;
      const bottomH =
        dom.inputBar.style.display !== "none"
          ? dom.inputBar.offsetHeight
          : dom.actionBar.style.display !== "none"
            ? dom.actionBar.offsetHeight
            : 0;

      const px = Math.max(0, topH + bottomH);
      dom.viewport.style.height = `calc(100% - ${px}px)`;
    }

    function syncBars() {
      const tab = normalizeTab(state.activeTab);

      if (tab === "WORLD") {
        dom.inputBar.style.display = "flex";
        dom.actionBar.style.display = "none";
        dom.input.disabled = false;
        requestAnimationFrame(() => dom.input.focus({ preventScroll: true }));
      } else if (LIFE_JOB_TABS.has(tab)) {
        dom.inputBar.style.display = "none";
        dom.actionBar.style.display = "flex";
      } else if (VIEW_ONLY_TABS.has(tab)) {
        dom.inputBar.style.display = "none";
        dom.actionBar.style.display = "none";
      } else {
        dom.inputBar.style.display = "none";
        dom.actionBar.style.display = "none";
      }

      measureViewport();
    }

    function setActiveTab(tabRaw) {
      const tab = normalizeTab(tabRaw);
      state.activeTab = tab;

      dom.tabs.forEach((t) => {
        const dt = normalizeTab(t.dataset.tab);
        t.classList.toggle("active", dt === tab);
      });

      applyLifeJobGates();
      syncBars();
      render();
      saveState();
    }

    // -------------------- Turns / cooldowns --------------------
    function decrementCooldownsOneTurn() {
      const act = state.skills?.active || [];
      for (const s of act) {
        if (typeof s.cdTurns === "number" && s.cdTurns > 0) s.cdTurns -= 1;
        if (typeof s.cdTurns === "number" && s.cdTurns < 0) s.cdTurns = 0;
      }
    }

    // -------------------- Rendering helpers --------------------
    const fatigueText = () => `FATIGUE ${state.mc.fatigue.cur}/${state.mc.fatigue.max}`;

    const statusStrip = () => {
      const m = state.mc;
      const w = state.world;
      return `Lv ${m.level} | XP ${w.xp.cur}/${w.xp.req} | HP ${m.resources.HP} | MP ${m.resources.MP} | ${fatigueText()} | Conditions ${m.resources.conditions}`;
    };

    // Escaped text panel
    const panel = (title, bodyText) => `
      <section class="panel">
        ${title ? `<div class="panelTitle">${escapeHtml(title)}</div>` : ``}
        <div class="mono">${escapeHtml(bodyText)}</div>
      </section>
    `;

    // Safe HTML panel (ONLY for controlled markup we generate)
    const panelHtml = (title, bodyHtml) => `
      <section class="panel">
        ${title ? `<div class="panelTitle">${escapeHtml(title)}</div>` : ``}
        <div class="mono">${bodyHtml}</div>
      </section>
    `;

    const coinSpan = (cls, label, value) =>
      `<span class="${cls}">${escapeHtml(label)} ${escapeHtml(String(value))}</span>`;

    // -------------------- Renderers --------------------
    function renderWorld() {
      const w = state.world;

      const prose = (w.prose || []).slice(0, 4);
      while (prose.length < 2) prose.push("");

      const unified = [
        `Environment: ${w.environment}`,
        `Location: ${w.location}.`,
        `RunTime: ${w.runtime} | Time: ${w.time} | Date: ${w.date} | Facing: ${w.facing}`,
        ``,
        ...prose,
        ``,
        `${w.kyraName}: Risk ${w.kyra.risk} | Advantage ${w.kyra.advantage} | Strain ${w.kyra.strain}`,
        `${w.kyraName}: Recommendation ${w.kyra.recommendation}`,
        ``,
        w.prompt,
        ``,
        statusStrip(),
      ].join("\n");

      const logLines = (state.worldLog || [])
        .slice(-300)
        .map((l) => `<p class="logLine">${escapeHtml(l)}</p>`)
        .join("");

      dom.contentScroll.innerHTML = `
        <section class="panel">
          <div class="mono" id="worldUnifiedText">${escapeHtml(unified)}</div>
        </section>

        <section class="panel">
          <div class="panelTitle">WORLD LOG</div>
          <div id="worldLogBody" class="mono">${logLines}</div>
        </section>
      `;

      const logEl = $("#worldLogBody");
      if (logEl) logEl.scrollTop = logEl.scrollHeight;
    }

    function renderStatus() {
      const m = state.mc;
      const attr = `STR ${m.attributes.STR} | AGI ${m.attributes.AGI} | VIT ${m.attributes.VIT} | INT ${m.attributes.INT} | DEX ${m.attributes.DEX} | LUK ${m.attributes.LUK}`;
      const derived = `ATK ${m.derived.ATK} | DEF ${m.derived.DEF} | HIT ${m.derived.HIT} | CRIT ${m.derived.CRIT} | EVA ${m.derived.EVA}`;
      const res = `HP ${m.resources.HP} | MP ${m.resources.MP} | ${fatigueText()} | Conditions ${m.resources.conditions}`;
      const eqLines = Object.entries(m.equipped).map(([k, v]) => `${k}: ${v}`).join("\n");

      dom.contentScroll.innerHTML =
        panel("STATUS", [
          `Name: ${m.name}`,
          `Level: ${m.level}`,
          `Job: ${m.job || "None"}`,
          `Title: ${m.title}`,
          ``,
          `Attributes: ${attr}`,
          `Derived: ${derived}`,
          `Resources: ${res}`,
        ].join("\n")) +
        panel("EQUIPPED", eqLines);
    }

    function renderInventory() {
      const inv = state.inventory;

      const cur = inv.currency || { platinum: 0, gold: 0, silver: 0, copper: 0 };
      const currencyHtml = [
        coinSpan("coin-platinum", "Platinum:", cur.platinum),
        " | ",
        coinSpan("coin-gold", "Gold:", cur.gold),
        " | ",
        coinSpan("coin-silver", "Silver:", cur.silver),
        " | ",
        coinSpan("coin-copper", "Copper:", cur.copper),
      ].join("");

      const changes = [
        `Used: ${(inv.changes.used || []).join(", ")}`,
        `Stored: ${(inv.changes.stored || []).join(", ")}`,
        `Equipped/Unequip: ${(inv.changes.equip || []).join(", ")}`,
      ].join("\n");

      const list = (title, items) =>
        panel(
          title,
          (items || []).map((i) => `[${i.name}] [${i.rarity}] [x${i.qty}]`).join("\n") || "(none)"
        );

      dom.contentScroll.innerHTML =
        panelHtml("CURRENCY", currencyHtml) +
        panel("RECENT CHANGES", changes) +
        list("MATERIALS", inv.materials) +
        list("CONSUMABLES", inv.consumables) +
        list("UNEQUIPPED", inv.unequipped);
    }

    function renderSkills() {
      const s = state.skills;
      const cdLabel = (n) => (n <= 0 ? "Ready" : `Cooldown: ${n} turns`);

      const active = (s.active || [])
        .map((x) => {
          const lines = [
            x.name,
            x.desc,
            `Mastery: ${x.mastery}`,
            `Status: ${cdLabel(typeof x.cdTurns === "number" ? x.cdTurns : 0)}`,
          ].join("\n");
          return `<div class="skillItem">${escapeHtml(lines)}</div>`;
        })
        .join("");

      const passive = (s.passive || [])
        .map((x) => {
          const lines = [x.name, x.desc, `Mastery: ${x.mastery}`].join("\n");
          return `<div class="skillItem">${escapeHtml(lines)}</div>`;
        })
        .join("");

      dom.contentScroll.innerHTML = `
        <section class="panel">
          <div class="skillSectionTitle">ACTIVE</div>
          <div class="skillList">${active || `<div class="skillItem">(none)</div>`}</div>

          <div class="sectionDivider"></div>

          <div class="skillSectionTitle">PASSIVE</div>
          <div class="skillList">${passive || `<div class="skillItem">(none)</div>`}</div>
        </section>
      `;
    }

    function renderMaps() {
      const blocks = (state.maps.continents || [])
        .map((c) => {
          const regions = (c.regions || []).map((r) => `- ${r}`).join("\n");
          return panel("CONTINENT", [`[${c.name}] [ID hidden]`, ``, `Regions:`, regions || "- (none)"].join("\n"));
        })
        .join("");

      dom.contentScroll.innerHTML = blocks || panel("MAPS", "(none)");
    }

    function renderNPC() {
      const blocks = (state.npcs || [])
        .map((n) => {
          const notes = (n.notes || []).map((x) => `- ${x}`).join("\n");
          return panel("NPC PROFILE", [
            `Name: ${n.name}`,
            `Race: ${n.race}`,
            `Role: ${n.role}`,
            ``,
            `Notes:`,
            notes || "- (none)",
            ``,
            `Relation: ${n.relation}`,
          ].join("\n"));
        })
        .join("");

      dom.contentScroll.innerHTML = blocks || panel("NPC", "(none)");
    }

    function renderLifeJob(slot) {
      const unlocked = slot === "LIFEJOB1" ? !!state.mc.unlocks.lifeJob1 : !!state.mc.unlocks.lifeJob2;
      if (!unlocked) {
        dom.contentScroll.innerHTML = panel("LIFE JOB", "(Locked)");
        return;
      }

      const lj = state.lifeJobs?.[slot];
      if (!lj) {
        dom.contentScroll.innerHTML = panel("LIFE JOB", "(Unlocked — data not loaded yet)");
        return;
      }

      const header = [`Life Job: ${lj.jobName} [ID hidden]`, `Mastery: ${lj.mastery}`].join("\n");

      const recipes = (lj.recipes || [])
        .map((r) => [`[${r.name}]`, `Success: ${r.success} | Time: ${r.time}`, `Materials: ${(r.mats || []).join(" | ")}`].join("\n"))
        .join("\n\n");

      dom.contentScroll.innerHTML = panel("LIFE JOB", header) + panel("RECIPES", recipes || "(none)");
    }

    function render() {
      const tab = normalizeTab(state.activeTab);
      switch (tab) {
        case "WORLD": return renderWorld();
        case "STATUS": return renderStatus();
        case "INVENTORY": return renderInventory();
        case "SKILLS": return renderSkills();
        case "MAPS": return renderMaps();
        case "NPC": return renderNPC();
        case "LIFEJOB1": return renderLifeJob("LIFEJOB1");
        case "LIFEJOB2": return renderLifeJob("LIFEJOB2");
        default:
          dom.contentScroll.innerHTML = panel(tab, "(unimplemented)");
          return;
      }
    }

    // -------------------- Input (WORLD only) --------------------
    function autoResize() {
      dom.input.style.height = "auto";
      dom.input.style.height = Math.min(dom.input.scrollHeight, 160) + "px";
      measureViewport();
    }

    safeOn(dom.input, "input", autoResize);
    safeOn(dom.sendBtn, "mousedown", (e) => e.preventDefault());

    function appendWorldLog(line) {
      state.worldLog.push(line);
      if (state.worldLog.length > 300) state.worldLog.splice(0, state.worldLog.length - 300);
    }

    function sendMessage() {
      const raw = dom.input.value || "";
      const text = raw.trimEnd();
      if (!text.trim()) return;

      appendWorldLog("> " + text);
      decrementCooldownsOneTurn();

      dom.input.value = "";
      autoResize();

      renderWorld();
      saveState();

      requestAnimationFrame(() => dom.input.focus({ preventScroll: true }));
    }

    safeOn(dom.sendBtn, "click", sendMessage);
    safeOn(dom.cancelBtn, "click", () => setActiveTab("WORLD"));
    safeOn(dom.execBtn, "click", () => setActiveTab("WORLD"));
    dom.tabs.forEach((t) => safeOn(t, "click", () => setActiveTab(t.dataset.tab)));

    safeOn(window, "resize", measureViewport);
    safeOn(window, "orientationchange", measureViewport);

    // -------------------- Init --------------------
    applyLifeJobGates();
    syncBars();
    render();
    measureViewport();
    autoResize();
    saveState();

    // ✅ BOOT COMPLETE: tell index.html watchdog we are alive
    try { window.__ELDRITCH_BOOTED = true; } catch {}

    // SW register (GitHub Pages safe relative path)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("./service-worker.js")
        .then(() => console.log("[SW] registered"))
        .catch((err) => console.log("[SW] error:", err));
    }
  } catch (e) {
    fatal("app.js crashed during init.", e);
  }
})();
```0
