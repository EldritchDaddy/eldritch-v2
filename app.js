/* =========================================================
   ELDRITCH V2 — PWA SHELL (Mock Evaluation Build)
   - WORLD panels unified into ONE block (headers hidden)
   - WORLD LOG stays as a separate block
   - Kyra/Seris/Vaela are distinct labels + line budgets
   - STATUS shows equipped slots; empty tagged [EMPTY]
   - Two Life Skill tabs mocked in (max 2 canonical)
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

  // Engine1State (mock)
  engine1: {
    worldTick: 0, // internal
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

    equipment: {
      Mainhand: "Iron Dagger",
      Offhand: null,
      Head: "Weaved Hood",
      Chest: "Weaved Tunic",
      Hands: null,
      Pants: "Weaved Trousers",
      Feet: "Weaved Boots",
      Necklace: "Flint Pendant",
      Bracelet: "Bone Shard",
    },

    inventory: {
      Hypotites: 10,
      "Healing Potion": 2,
      "Iron Dagger": 1,
      "Weaved Hood": 1,
      "Weaved Tunic": 1,
      "Weaved Trousers": 1,
      "Weaved Boots": 1,
      "Flint Pendant": 1,
      "Bone Shard": 1,
    },

    inventoryDelta: [
      "Used: (none)",
      "Stored: (none)",
      "Equipped/Unequip: (none)",
    ],

    skills: [
      { name: "Piercing Lunge", desc: "Fast linear thrust with increased crit rate.", mastery: "Novice", cdRem: 0, cdMax: 3 },
      { name: "Flame Coil", desc: "Mid-range fire arc that can Ignite.", mastery: "Novice", cdRem: 2, cdMax: 4 },
      { name: "Quiet Step", desc: "Reduce noise signature for a short move.", mastery: "Novice", cdRem: 1, cdMax: 2 },
    ],

    // Two life skills (mock; max 2 canonical)
    lifeSkills: [
      {
        name: "ALCHEMY",
        recipes: [
          { n: "Minor Healing Draught", req: "Herb ×2, Vial ×1", odds: "42%" },
          { n: "Bitter Tonic", req: "Root ×1, Vial ×1", odds: "55%" },
        ],
      },
      {
        name: "FORAGING",
        recipes: [
          { n: "Gather: Medicinal Herb", req: "Near water + Soft soil", odds: "48%" },
          { n: "Gather: Resin Lump", req: "Old bark + Warm stone", odds: "33%" },
        ],
      },
    ],

    tacticalState: {
      threat: 30,    // 0-100
      advantage: 10, // -100..+100
      strain: 17,    // 0-100
      exposure: "STABLE",
      tempo: "EVEN",
      control: "NEUTRAL",
    },

    // "KYRA" | "SERIS" | "VAELA"
    tacticalMode: "KYRA",
  },

  // Engine2 log (WORLD loop)
  worldLog: [
    "ELDRITCH V2 — ONLINE BUILD",
    "If you can read this, evolution has begun.",
  ],
};

/* =========================
   Viewport / Keyboard Stability
   ========================= */

function updateVH() {
  document.documentElement.style.setProperty("--vh", (window.innerHeight * 0.01) + "px");
}
updateVH();

function updateHeaderHeight() {
  const header = document.getElementById("header");
  document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");
}

function updateInputHeight() {
  document.documentElement.style.setProperty("--input-h", UI.inputBar.offsetHeight + "px");
}

function hookVisualViewport() {
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
  const life = state.engine1.lifeSkills.slice(0, 2).map((ls) => ls.name.toUpperCase());
  const top = [TAB.WORLD, TAB.STATUS, TAB.INVENTORY, TAB.SKILLS];
  const bottom = [TAB.MAPS, TAB.NPC, ...(life[0] ? [life[0]] : []), ...(life[1] ? [life[1]] : [])];
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
      state.activeTab = name === TAB.WORLD ? TAB.WORLD : name; // UI-only toggle
      renderAll();
    });
    return b;
  };

  top.forEach((t) => UI.tabsTop.appendChild(mk(t)));
  bottom.forEach((t) => UI.tabsBottom.appendChild(mk(t)));

  updateHeaderHeight();
}

/* =========================
   Helpers
   ========================= */

function formatRuntimeHHMM(worldTick) {
  // 1 tick = 10 seconds (internal). Output uses HH:MM (human readable).
  const totalSeconds = worldTick * 10;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function computeRiskBand(ts) {
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

function card(lines, muted = false) {
  const wrap = document.createElement("div");
  wrap.className = "panel";
  lines.forEach((ln) => {
    const p = document.createElement("p");
    p.className = "line" + (muted ? " muted" : "");
    p.textContent = ln;
    wrap.appendChild(p);
  });
  return wrap;
}

/* =========================
   WORLD Renderer (Unified Block + separate World Log)
   ========================= */

function renderWorld() {
  const e1 = state.engine1;
  e1.runtimeHHMM = formatRuntimeHHMM(e1.worldTick);

  const ts = e1.tacticalState;
  const risk = computeRiskBand(ts);
  const rec = computeRecommendedAction(ts);

  // Unified WORLD block lines (headers hidden)
  const envLine = "Environment: Midnight-green fog, wet bark, and distant insect-chime.";
  const locLine1 = `Location: ${e1.locationName}.`;
  const locLine2 = `RunTime: ${e1.runtimeHHMM} | Time: ${e1.time12h} | Date: ${e1.eldrithDate} | Facing: ${e1.facing}`;

  // Prose (2–4 lines hard rule; mock uses 3)
  const prose = [
    "The thicket breathes in slow waves, leaves slick with cold dew.",
    "Somewhere deeper, something small scrapes stone, then stops.",
    "Your own footsteps feel too loud, as if the forest is counting them.",
  ];

  // Tactical lines (Kyra 2, Seris 3, Vaela 4)
  const mode = e1.tacticalMode; // KYRA|SERIS|VAELA
  const tactical = [];

  if (mode === "KYRA") {
    tactical.push(`Kyra: Risk ${risk} | Advantage ${ts.advantage >= 0 ? "+" : ""}${ts.advantage} | Strain ${ts.strain}%`);
    tactical.push(`Kyra: Recommendation ${rec}.`);
  } else if (mode === "SERIS") {
    tactical.push(`Seris: Risk ${risk} | Advantage ${ts.advantage >= 0 ? "+" : ""}${ts.advantage} | Strain ${ts.strain}%`);
    tactical.push(`Seris: Recommendation ${rec}.`);
    tactical.push("Seris: Don’t chase noise. Control the next exchange.");
  } else {
    tactical.push(`Vaela: Risk ${risk} | Advantage ${ts.advantage >= 0 ? "+" : ""}${ts.advantage} | Strain ${ts.strain}%`);
    tactical.push(`Vaela: Recommendation ${rec}.`);
    tactical.push("Vaela: The air tastes like warning. Your timing matters more than your courage.");
    tactical.push("Vaela: Hold your breath, then move when the world blinks.");
  }

  const prompt = "What will you do?";

  const s = e1.stats;
  const statStrip = `Lv ${s.lv} | XP ${s.curXP}/${s.reqXP} | HP ${s.hp} | MP ${s.mp} | Fatigue ${s.fatigue} | Conditions ${s.conditions}`;

  const worldLines = [
    envLine,
    locLine1,
    locLine2,
    "", // breathing space
    ...prose,
    "",
    ...tactical,
    "",
    prompt,
    "",
    statStrip,
  ];

  UI.scroll.innerHTML = "";
  UI.scroll.appendChild(card(worldLines));

  // WORLD LOG separate block
  const logLines = ["WORLD LOG:"].concat(state.worldLog.slice(-12));
  UI.scroll.appendChild(card(logLines, true));

  UI.scroll.scrollTop = UI.scroll.scrollHeight;
}

/* =========================
   STATUS (Equipped with [EMPTY])
   ========================= */

function renderStatus() {
  const e1 = state.engine1;
  const s = e1.stats;
  const eq = e1.equipment;

  const slots = [
    "Mainhand", "Offhand",
    "Head", "Chest", "Hands", "Pants", "Feet",
    "Necklace", "Bracelet",
  ];

  const equipLines = slots.map((slot) => {
    const val = eq[slot];
    return `${slot}: ${val ? val : "[EMPTY]"}`;
  });

  const lines = [
    "Name: MC",
    "Titles: None",
    `Resources: HP ${s.hp} | MP ${s.mp} | Fatigue ${s.fatigue} | Conditions ${s.conditions}`,
    "",
    "EQUIPPED:",
    ...equipLines,
  ];

  UI.scroll.innerHTML = "";
  UI.scroll.appendChild(card(lines));
}

/* =========================
   INVENTORY (Delta 1–3 lines + list)
   ========================= */

function renderInventory() {
  const e1 = state.engine1;
  UI.scroll.innerHTML = "";

  const delta = e1.inventoryDelta.slice(0, 3);
  const deltaLines = ["RECENT CHANGES:"].concat(delta.length ? delta : ["(None)"]);

  const items = Object.keys(e1.inventory)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => `${name} × ${e1.inventory[name]}`);

  const invLines = ["INVENTORY:"].concat(items.length ? items : ["(Empty)"]);

  UI.scroll.appendChild(card(deltaLines, true));
  UI.scroll.appendChild(card(invLines));
}

/* =========================
   SKILLS (Skill | Desc | Mastery | Cooldown)
   ========================= */

function renderSkills() {
  const e1 = state.engine1;

  const lines = ["SKILLS:"].concat(
    e1.skills.length
      ? e1.skills.map((sk) => {
          const cd = sk.cdRem > 0 ? `Cooldown ${sk.cdRem} ticks` : "Ready";
          return `${sk.name} | ${sk.desc} | Mastery ${sk.mastery} | ${cd}`;
        })
      : ["(None)"]
  );

  UI.scroll.innerHTML = "";
  UI.scroll.appendChild(card(lines));
}

function renderMaps() {
  UI.scroll.innerHTML = "";
  UI.scroll.appendChild(card([
    "MAPS:",
    "(Mock) Current map view will render here.",
    "Nodes, landmarks, region overlays (later).",
  ]));
}

function renderNPC() {
  UI.scroll.innerHTML = "";
  UI.scroll.appendChild(card([
    "NPC:",
    "(Mock) NPC list + relations will render here.",
    "Neutral / Ally / Friend / Rival / Nemesis / Lover",
  ]));
}

function renderLifeSkill(name) {
  const e1 = state.engine1;
  const ls = e1.lifeSkills.find((x) => x.name.toUpperCase() === name);

  UI.scroll.innerHTML = "";

  if (!ls) {
    UI.scroll.appendChild(card([`${name}:`, "(No data)"]));
    return;
  }

  // Persona advisory (no numeric deltas)
  const advisory = [
    `${name}:`,
    "The sharp smell of tincture clings to your fingers; vials clink softly in your pack.",
    "Choose carefully. Efficiency is survival.",
    "",
    "RECIPES:",
  ];

  const recipeLines = (ls.recipes || []).map((r) => `${r.n} | Req ${r.req} | Odds ${r.odds}`);
  if (!recipeLines.length) recipeLines.push("(None)");

  // Results area (numeric allowed but no item delta spam in WORLD)
  const results = [
    "",
    "RESULTS:",
    "(No craft executed yet.)",
  ];

  UI.scroll.appendChild(card(advisory.concat(recipeLines).concat(results)));
}

/* =========================
   Input / Send
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

  UI.input.focus(); // keep keyboard open

  state.worldLog.push(`> ${text}`);

  // mock: treat each send as 1 tick
  state.engine1.worldTick += 1;

  // mock: jiggle tactical numbers so you see change
  const ts = state.engine1.tacticalState;
  ts.threat = Math.min(100, ts.threat + 1);
  ts.strain = Math.min(100, ts.strain + 1);

  UI.input.value = "";
  autoResize();

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
   Router
   ========================= */

function renderActiveTab() {
  const { top, bottom } = getTabLayout();
  const known = new Set([...top, ...bottom]);
  if (!known.has(state.activeTab)) state.activeTab = TAB.WORLD;

  if (state.activeTab === TAB.WORLD) return renderWorld();
  if (state.activeTab === TAB.STATUS) return renderStatus();
  if (state.activeTab === TAB.INVENTORY) return renderInventory();
  if (state.activeTab === TAB.SKILLS) return renderSkills();
  if (state.activeTab === TAB.MAPS) return renderMaps();
  if (state.activeTab === TAB.NPC) return renderNPC();
  return renderLifeSkill(state.activeTab);
}

function renderAll() {
  renderTabs();
  renderActiveTab();
  updateHeaderHeight();
  updateInputHeight();
}

renderAll();