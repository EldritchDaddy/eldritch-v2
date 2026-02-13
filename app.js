/* =========================================================
   ELDRITCH V2 — PWA SHELL (Canon UI + WORLD Panel Contract)
   - Tabs are UI-only (no tick/fatigue/RNG/ledger on toggle)
   - WORLD renders mandatory panel stack
   ========================================================= */

const el = (id) => document.getElementById(id);

const UI = {
  tabsTop: el("tabs"),
  tabsBottom: el("tabs2"),
  scroll: el("scroll"),
  input: el("input"),
  sendBtn: el("sendBtn"),
  inputBar: el("inputBar"),
};

const TAB = {
  WORLD: "WORLD",
  STATUS: "STATUS",
  INVENTORY: "INVENTORY",
  SKILLS: "SKILLS",
  MAPS: "MAPS",
  NPC: "NPC",
};

const state = {
  activeTab: TAB.WORLD,

  // Engine1State (stub but structured)
  engine1: {
    worldTick: 0, // internal ticks
    runtimeHHMM: "00:00",
    locationName: "Whispering Thicket",
    facing: "NorthEast",
    time12h: "09:00 PM",
    eldrithDate: "Day 1, Cycle 1",

    stats: {
      lv: 1,
      curXP: 0,
      reqXP: 135,
      hp: 30,
      mp: 10,
      fatigue: 0,
      conditions: "None",
    },

    // Inventory & delta capture
    inventory: {
      "Hypotites": 10,
      "Healing Potion": 2,
      "Iron Dagger": 1,
    },
    inventoryDelta: [], // up to 3 lines

    // Skills
    skills: [
      { name: "Piercing Lunge", desc: "Fast linear thrust with increased crit rate.", mastery: "Novice", cdRem: 0, cdMax: 3 },
      { name: "Flame Coil", desc: "Mid-range fire arc that can Ignite.", mastery: "Novice", cdRem: 2, cdMax: 4 },
    ],

    // Life skills (max 2) — empty by default; add later to see tabs appear
    lifeSkills: [
      // { name: "ALCHEMY", recipes: [...] }
    ],

    // TacticalState (stub)
    tacticalState: {
      threat: 30,        // 0-100
      advantage: 10,     // -100..+100
      strain: 15,        // 0-100
      exposure: "STABLE",
      tempo: "EVEN",
      control: "NEUTRAL",
    },

    // Persona mode: KYRA | SERIS | VAELA
    tacticalMode: "KYRA",
  },

  // Engine2 log of player inputs (WORLD only)
  worldLog: [
    "ELDRITCH V2 — ONLINE BUILD",
    "If you can read this, evolution has begun.",
  ],
};

/* =========================
   Viewport / Keyboard Stability
   ========================= */

function updateVH() {
  const h = window.innerHeight;
  document.documentElement.style.setProperty("--vh", (h * 0.01) + "px");
}
updateVH();

function updateHeaderHeight() {
  const header = document.getElementById("header");
  const h = header.offsetHeight;
  document.documentElement.style.setProperty("--header-h", h + "px");
}

function updateInputHeight() {
  const h = UI.inputBar.offsetHeight;
  document.documentElement.style.setProperty("--input-h", h + "px");
}

function hookVisualViewport() {
  // visualViewport handles Android keyboard shifts better than resize alone
  if (!window.visualViewport) return;
  const vv = window.visualViewport;
  const onVV = () => {
    updateVH();
    updateHeaderHeight();
    updateInputHeight();
  };
  vv.addEventListener("resize", onVV);
  vv.addEventListener("scroll", onVV);
}
hookVisualViewport();

window.addEventListener("resize", () => {
  updateVH();
  updateHeaderHeight();
  updateInputHeight();
});

setTimeout(() => {
  updateHeaderHeight();
  updateInputHeight();
}, 50);

/* =========================
   Tabs
   ========================= */

function getTabLayout() {
  const life = state.engine1.lifeSkills.slice(0, 2).map(ls => ls.name.toUpperCase());
  // Two rows: top 4, bottom up to 4
  const top = [TAB.WORLD, TAB.STATUS, TAB.INVENTORY, TAB.SKILLS];
  const bottom = [TAB.MAPS, TAB.NPC, ...(life[0] ? [life[0]] : []), ...(life[1] ? [life[1]] : [])];

  // Ensure bottom row has at most 4 entries for clean grid
  return { top, bottom: bottom.slice(0, 4) };
}

function renderTabs() {
  const { top, bottom } = getTabLayout();

  UI.tabsTop.innerHTML = "";
  UI.tabsBottom.innerHTML = "";

  const mk = (name) => {
    const b = document.createElement("button");
    b.className = "tab" + (state.activeTab === name ? " active" : "");
    b.textContent = name;
    b.addEventListener("click", () => {
      // Tabs are UI-only toggles: no tick, no ledger
      state.activeTab = name === TAB.WORLD ? TAB.WORLD : name;
      renderAll();
    });
    return b;
  };

  top.forEach(t => UI.tabsTop.appendChild(mk(t)));
  bottom.forEach(t => UI.tabsBottom.appendChild(mk(t)));

  updateHeaderHeight();
}

/* =========================
   WORLD Panel Renderer (Contract v1.4 / v1.7)
   ========================= */

function formatRuntimeHHMM(worldTick) {
  // 1 tick = 10 seconds
  const totalSeconds = worldTick * 10;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return `${hh}:${mm}`;
}

function computeRiskBand(ts) {
  // deterministic coarse bands (simple stub)
  const score = ts.threat - Math.max(0, ts.advantage);
  if (ts.threat >= 80 || score >= 70) return "CRITICAL";
  if (ts.threat >= 55 || score >= 45) return "HIGH";
  if (ts.threat >= 30 || score >= 20) return "MEDIUM";
  return "LOW";
}

function computeRecommendedAction(ts) {
  const band = computeRiskBand(ts);
  if (band === "CRITICAL") return "RETREAT";
  if (band === "HIGH") return ts.strain >= 60 ? "RECOVER" : "RETREAT";
  if (band === "MEDIUM") return ts.strain >= 70 ? "RECOVER" : "HOLD";
  return ts.strain >= 80 ? "RECOVER" : "ADVANCE";
}

function renderWorld() {
  const e1 = state.engine1;
  e1.runtimeHHMM = formatRuntimeHHMM(e1.worldTick);

  const ts = e1.tacticalState;
  const risk = computeRiskBand(ts);
  const rec = computeRecommendedAction(ts);

  // PANEL 1: Environment (1 line)
  const envLine = "Environment: Midnight-green fog, wet bark, and distant insect-chime.";

  // PANEL 2: Location Block (1–2 lines, no ID/tick/exits)
  const locLine1 = `Location: ${e1.locationName}.`;
  const locLine2 = `RunTime: ${e1.runtimeHHMM} | Time: ${e1.time12h} | Date: ${e1.eldrithDate} | Facing: ${e1.facing}`;

  // PANEL 3: Prose (2–4 lines, no system logs)
  // Use last 2–4 world log lines as prose texture (stub)
  const proseBase = [
    "The thicket breathes in slow waves, leaves slick with cold dew.",
    "Somewhere deeper, something small scrapes stone, then stops.",
    "Your own footsteps feel too loud, as if the forest is counting them.",
  ];
  const proseLines = proseBase.slice(0, 3); // 2–4 lines allowed; stub uses 3

  // PANEL 4: Tactical Panel (Kyra/Seris/Vaela line budgets)
  const mode = e1.tacticalMode; // KYRA | SERIS | VAELA
  const lines = [];

  if (mode === "KYRA") {
    lines.push(`Risk: ${risk} | Advantage: ${ts.advantage >= 0 ? "+" : ""}${ts.advantage} | Strain: ${ts.strain}%`);
    lines.push(`Recommendation: ${rec}.`);
  } else if (mode === "SERIS") {
    lines.push(`Risk: ${risk} | Advantage: ${ts.advantage >= 0 ? "+" : ""}${ts.advantage} | Strain: ${ts.strain}%`);
    lines.push(`Recommendation: ${rec}.`);
    lines.push("Don’t chase noise. Control the next exchange.");
  } else {
    lines.push(`Risk: ${risk} | Advantage: ${ts.advantage >= 0 ? "+" : ""}${ts.advantage} | Strain: ${ts.strain}%`);
    lines.push(`Recommendation: ${rec}.`);
    lines.push("The air tastes like warning. Your timing matters more than your courage.");
    lines.push("Hold your breath, then move when the world blinks.");
  }

  // PANEL 5: Prompt (1 line)
  const promptLine = "What will you do?";

  // Stat strip (once per panel set)
  const s = e1.stats;
  const statStrip = `Lv ${s.lv} | XP ${s.curXP}/${s.reqXP} | HP ${s.hp} | MP ${s.mp} | Fatigue ${s.fatigue} | Conditions ${s.conditions}`;

  // Render
  UI.scroll.innerHTML = "";

  UI.scroll.appendChild(panelBlock("ENVIRONMENT", [envLine]));
  UI.scroll.appendChild(panelBlock("LOCATION", [locLine1, locLine2]));
  UI.scroll.appendChild(panelBlock("PROSE", proseLines));
  UI.scroll.appendChild(panelBlock(`${mode} PANEL`, lines));
  UI.scroll.appendChild(panelBlock("PROMPT", [promptLine]));
  UI.scroll.appendChild(panelBlock("STATUS STRIP", [statStrip], true));

  // Also render player input log below (WORLD-only), but keep it compact
  UI.scroll.appendChild(panelBlock("WORLD LOG", state.worldLog.slice(-12).map(x => x), true));

  // keep scroll at bottom if user already near bottom
  UI.scroll.scrollTop = UI.scroll.scrollHeight;
}

function panelBlock(title, lines, muted = false) {
  const wrap = document.createElement("div");
  wrap.className = "panel";
  const t = document.createElement("div");
  t.className = "panelTitle";
  t.textContent = title;
  wrap.appendChild(t);

  lines.forEach((ln) => {
    const p = document.createElement("p");
    p.className = "line" + (muted ? " muted" : "");
    p.textContent = ln;
    wrap.appendChild(p);
  });

  return wrap;
}

/* =========================
   Other Tabs
   ========================= */

function renderStatus() {
  const e1 = state.engine1;
  const s = e1.stats;

  UI.scroll.innerHTML = "";
  UI.scroll.appendChild(panelBlock("STATUS", [
    "Name: MC",
    "Titles: None",
    `Attributes: (stub) STR 10 | AGI 10 | VIT 10 | INT 10 | DEX 10 | LUK 10`,
    `Equipped: (stub) Mainhand: Iron Dagger | Offhand: Empty`,
    `Resources: HP ${s.hp} | MP ${s.mp} | Fatigue ${s.fatigue} | Conditions ${s.conditions}`,
  ]));
}

function renderInventory() {
  const e1 = state.engine1;

  UI.scroll.innerHTML = "";

  // Delta block (1–3 lines)
  const delta = e1.inventoryDelta.slice(0, 3);
  if (delta.length > 0) {
    UI.scroll.appendChild(panelBlock("RECENT CHANGES", delta));
  }

  // Full list
  const items = Object.keys(e1.inventory)
    .sort((a, b) => a.localeCompare(b))
    .map(name => `${name} × ${e1.inventory[name]}`);

  UI.scroll.appendChild(panelBlock("INVENTORY", items.length ? items : ["(Empty)"]));
}

function renderSkills() {
  const e1 = state.engine1;

  UI.scroll.innerHTML = "";

  const lines = e1.skills.map(sk => {
    const cd = sk.cdRem > 0 ? `(Cooldown: ${sk.cdRem} ticks)` : "(Ready)";
    return `${sk.name} | ${sk.desc} | Mastery: ${sk.mastery} ${cd}`;
  });

  UI.scroll.appendChild(panelBlock("SKILLS", lines.length ? lines : ["(None)"]));
}

function renderMaps() {
  UI.scroll.innerHTML = "";
  UI.scroll.appendChild(panelBlock("MAPS", [
    "(Stub) Current map view goes here.",
    "Discovered nodes, landmarks, and region overlays will render in this tab.",
  ]));
}

function renderNPC() {
  UI.scroll.innerHTML = "";
  UI.scroll.appendChild(panelBlock("NPC", [
    "(Stub) NPC list and relations go here.",
    "Neutral / Ally / Friend / Rival / Nemesis / Lover",
  ]));
}

function renderLifeSkill(name) {
  const e1 = state.engine1;
  const ls = e1.lifeSkills.find(x => x.name.toUpperCase() === name);

  UI.scroll.innerHTML = "";

  if (!ls) {
    UI.scroll.appendChild(panelBlock(name, ["(No data)"]));
    return;
  }

  // Persona advisory block (narrative only, no +1/-2 logs)
  const advisory = [
    "The sharp smell of tincture clings to your fingers; vials clink softly in your pack.",
    "Choose what you brew like you choose who you trust: sparingly.",
  ];

  UI.scroll.appendChild(panelBlock(`${name} — ADVISORY`, advisory));

  // System section (numeric allowed)
  // Stub recipes
  const recipes = (ls.recipes && ls.recipes.length)
    ? ls.recipes
    : [
      { n: "Minor Healing Draught", req: "Herb ×2, Vial ×1", odds: "42%" },
      { n: "Bitter Tonic", req: "Root ×1, Vial ×1", odds: "55%" },
    ];

  const recipeLines = recipes.map(r => `${r.n} | Req: ${r.req} | Odds: ${r.odds}`);
  UI.scroll.appendChild(panelBlock(`${name} — RECIPES`, recipeLines));

  UI.scroll.appendChild(panelBlock(`${name} — RESULTS`, [
    "(No craft executed yet.)",
  ], true));
}

/* =========================
   Input / Send (WORLD only)
   ========================= */

function autoResize() {
  UI.input.style.height = "auto";
  UI.input.style.height = Math.min(UI.input.scrollHeight, 140) + "px";
  updateInputHeight();
}
UI.input.addEventListener("input", autoResize);

UI.sendBtn.addEventListener("mousedown", (e) => e.preventDefault()); // keep focus

function sendMessage() {
  const text = UI.input.value.trim();
  if (!text) return;

  // Always keep keyboard open
  UI.input.focus();

  // Input always records, but only WORLD renders results
  state.worldLog.push(`> ${text}`);

  // Stub “engine tick” only when sending a message (real actions later)
  state.engine1.worldTick += 1;

  // Stub: rotate tactical state slightly to show movement
  state.engine1.tacticalState.threat = Math.min(100, state.engine1.tacticalState.threat + 1);
  state.engine1.tacticalState.strain = Math.min(100, state.engine1.tacticalState.strain + 1);

  // Clear input without collapsing keyboard
  UI.input.value = "";
  autoResize();

  // Force back to WORLD (since this is the main loop)
  state.activeTab = TAB.WORLD;
  renderAll();
}

UI.sendBtn.addEventListener("click", sendMessage);

UI.input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

/* =========================
   Render Router
   ========================= */

function renderActiveTab() {
  const { top, bottom } = getTabLayout();
  const known = new Set([...top, ...bottom]);

  if (!known.has(state.activeTab)) {
    state.activeTab = TAB.WORLD;
  }

  if (state.activeTab === TAB.WORLD) return renderWorld();
  if (state.activeTab === TAB.STATUS) return renderStatus();
  if (state.activeTab === TAB.INVENTORY) return renderInventory();
  if (state.activeTab === TAB.SKILLS) return renderSkills();
  if (state.activeTab === TAB.MAPS) return renderMaps();
  if (state.activeTab === TAB.NPC) return renderNPC();

  // Life skill tab by name
  return renderLifeSkill(state.activeTab);
}

function renderAll() {
  renderTabs();
  renderActiveTab();
  updateHeaderHeight();
  updateInputHeight();
}

renderAll();