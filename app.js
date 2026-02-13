/**
 * ELDRITCH V2 — app.js (production-grade UI shell)
 *
 * Guarantees (LOCKED):
 * 1) Enter key inserts newline only (never sends).
 * 2) Only green ↑ sends.
 * 3) Cooldowns are measured in TURNS (input→output cycles).
 * 4) Fatigue displayed as FATIGUE cur/max (STA tied to that max).
 * 5) WORLD shows input bar. STATUS/INVENTORY/SKILLS/MAPS/NPC are view-only.
 * 6) Life Jobs (ALCHEMY/FORAGING) hide input and show [Cancel][Execute].
 * 7) WORLD LOG contains player inputs only. No system echoes.
 *
 * This file is designed to be drop-in with the IDs in your index.html:
 * #contentScroll #inputBar #actionBar #input #sendBtn #cancelBtn #execBtn
 * .tab[data-tab="WORLD"..."FORAGING"]  plus #topbar #viewport.
 */
(() => {
  "use strict";

  // ---------------------------- Utilities ----------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

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

  // ---------------------------- DOM (required IDs) ----------------------------
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

  // Hard fail-safe: never crash the PWA shell
  if (!dom.contentScroll || !dom.topbar || !dom.viewport) {
    console.log("[ELDRITCH] Missing core DOM nodes. Check index.html IDs.");
    return;
  }

  // ---------------------------- Storage ----------------------------
  const STORAGE_KEY = "eldritch:v2:ui_state";
  const STORAGE_VER = 1;

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
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ver: STORAGE_VER, state }, null, 0)
      );
    } catch {
      // ignore storage quota / privacy mode issues
    }
  };

  // ---------------------------- Canon UI State ----------------------------
  // NOTE: Data here is only to keep UI functional. Game engine will replace.
  // This is “production-grade shell,” not engine logic.
  const defaultState = {
    activeTab: "WORLD",

    mc: {
      name: "MC",
      level: 1,
      title: "None",
      attributes: { STR: 10, AGI: 10, VIT: 10, INT: 10, DEX: 10, LUK: 10 },
      derived: { ATK: 12, DEF: 6, HIT: "75%", CRIT: "5%", EVA: "10%" },

      // FATIGUE is the stamina pool remaining (declines with actions).
      fatigue: { cur: 30, max: 30 },

      resources: { HP: 30, MP: 10, conditions: "None" },

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
        "Your own footsteps feel too loud, as if the forest is counting them.",
        "A thin thread of lantern-light flickers between trunks, then dies.",
      ],
      kyraName: "Kyra",
      kyra: { risk: "MEDIUM", advantage: "+10", strain: "18%", recommendation: "HOLD." },
      prompt: "What will you do?",
      // For future: XP bars etc. come from engine
      xp: { cur: 0, req: 135 },
    },

    // Player input only. No system echoes here.
    worldLog: [],

    inventory: {
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
      // Cooldown in TURNS:
      // 0 => Ready, >0 => Cooldown: X turns
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

    lifeJobs: {
      ALCHEMY: {
        jobName: "Alchemy",
        mastery: "Novice",
        recipes: [
          { name: "Minor Healing Draught", success: "72%", mats: ["Thicket Resin x2", "Clear Water x1"], time: "1 turn" },
          { name: "Smoke Vial", success: "61%", mats: ["Ash Powder x1", "Oil x1"], time: "2 turns" },
        ],
      },
      FORAGING: {
        jobName: "Foraging",
        mastery: "Novice",
        recipes: [
          { name: "Careful Harvest", success: "85%", mats: ["None"], time: "1 turn" },
          { name: "Bark-Strip Tether", success: "68%", mats: ["Wet Bark x2"], time: "1 turn" },
        ],
      },
    },
  };

  const state = loadState() || structuredClone(defaultState);

  // ---------------------------- UI Rules ----------------------------
  const VIEW_ONLY_TABS = new Set(["STATUS", "INVENTORY", "SKILLS", "MAPS", "NPC"]);
  const LIFE_JOB_TABS = new Set(["ALCHEMY", "FORAGING"]);

  const setActiveTab = (tab) => {
    state.activeTab = tab;
    dom.tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
    syncBars();
    render();
    saveState();
  };

  const syncBars = () => {
    const tab = state.activeTab;

    if (tab === "WORLD") {
      dom.inputBar.style.display = "flex";
      dom.actionBar.style.display = "none";
      dom.input.disabled = false;
      // Keep keyboard open in WORLD
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
  };

  const measureViewport = () => {
    const topH = dom.topbar.offsetHeight || 0;
    const bottomH =
      dom.inputBar.style.display !== "none"
        ? dom.inputBar.offsetHeight
        : dom.actionBar.style.display !== "none"
          ? dom.actionBar.offsetHeight
          : 0;

    dom.viewport.style.height = `calc(100% - ${topH + bottomH}px)`;
  };

  // ---------------------------- Turn Mechanics (UI-side only) ----------------------------
  // Decrement cooldowns once per successful SEND (turn cycle).
  const decrementCooldownsOneTurn = () => {
    const act = state.skills?.active || [];
    for (const s of act) {
      if (typeof s.cdTurns === "number" && s.cdTurns > 0) {
        s.cdTurns = Math.max(0, s.cdTurns - 1);
      }
    }
  };

  // ---------------------------- Rendering ----------------------------
  const fatigueText = () => `FATIGUE ${state.mc.fatigue.cur}/${state.mc.fatigue.max}`;

  const statusStrip = () => {
    const m = state.mc;
    const w = state.world;
    return [
      `Lv ${m.level} | XP ${w.xp.cur}/${w.xp.req} | HP ${m.resources.HP} | MP ${m.resources.MP} | ${fatigueText()} | Conditions ${m.resources.conditions}`
    ].join("");
  };

  const panel = (title, bodyText) => `
    <section class="panel">
      ${title ? `<div class="panelTitle">${escapeHtml(title)}</div>` : ``}
      <div class="mono">${escapeHtml(bodyText)}</div>
    </section>
  `;

  const renderWorld = () => {
    const w = state.world;

    // Prose rule: never exceed 4 lines, never below 2 (engine will enforce).
    const prose = (w.prose || []).slice(0, 4);

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

    // WORLD LOG (player inputs only)
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
  };

  const renderStatus = () => {
    const m = state.mc;
    const attr = `STR ${m.attributes.STR} | AGI ${m.attributes.AGI} | VIT ${m.attributes.VIT} | INT ${m.attributes.INT} | DEX ${m.attributes.DEX} | LUK ${m.attributes.LUK}`;
    const derived = `ATK ${m.derived.ATK} | DEF ${m.derived.DEF} | HIT ${m.derived.HIT} | CRIT ${m.derived.CRIT} | EVA ${m.derived.EVA}`;
    const res = `HP ${m.resources.HP} | MP ${m.resources.MP} | ${fatigueText()} | Conditions ${m.resources.conditions}`;

    const eqLines = Object.entries(m.equipped).map(([k, v]) => `${k}: ${v}`).join("\n");

    dom.contentScroll.innerHTML =
      panel("STATUS", [
        `Name: ${m.name}`,
        `Level: ${m.level}`,
        `Title: ${m.title}`,
        ``,
        `Attributes: ${attr}`,
        `Derived: ${derived}`,
        `Resources: ${res}`,
      ].join("\n")) +
      panel("EQUIPPED", eqLines);
  };

  const renderInventory = () => {
    const inv = state.inventory;

    const changes = [
      `Used: ${inv.changes.used.join(", ")}`,
      `Stored: ${inv.changes.stored.join(", ")}`,
      `Equipped/Unequip: ${inv.changes.equip.join(", ")}`,
    ].join("\n");

    const list = (title, items) =>
      panel(
        title,
        (items || []).map((i) => `[${i.name}] [${i.rarity}] [x${i.qty}]`).join("\n") || "(none)"
      );

    dom.contentScroll.innerHTML =
      panel("RECENT CHANGES", changes) +
      list("MATERIALS", inv.materials) +
      list("CONSUMABLES", inv.consumables) +
      list("UNEQUIPPED", inv.unequipped);
  };

  const cooldownLabel = (cdTurns) => (cdTurns <= 0 ? "Ready" : `Cooldown: ${cdTurns} turns`);

  const renderSkills = () => {
    const s = state.skills;

    // Each skill is a readable multi-line block (prevents wrap-islands).
    const activeBlocks = (s.active || [])
      .map((x) => {
        const lines = [
          x.name,
          x.desc,
          `Mastery: ${x.mastery}`,
          `Status: ${cooldownLabel(typeof x.cdTurns === "number" ? x.cdTurns : 0)}`,
        ].join("\n");
        return `<div class="skillItem">${escapeHtml(lines)}</div>`;
      })
      .join("");

    const passiveBlocks = (s.passive || [])
      .map((x) => {
        const lines = [
          x.name,
          x.desc,
          `Mastery: ${x.mastery}`,
        ].join("\n");
        return `<div class="skillItem">${escapeHtml(lines)}</div>`;
      })
      .join("");

    dom.contentScroll.innerHTML = `
      <section class="panel">
        <div class="skillSectionTitle">ACTIVE</div>
        <div class="skillList">${activeBlocks || `<div class="skillItem">(none)</div>`}</div>

        <div class="sectionDivider"></div>

        <div class="skillSectionTitle">PASSIVE</div>
        <div class="skillList">${passiveBlocks || `<div class="skillItem">(none)</div>`}</div>
      </section>
    `;
  };

  const renderMaps = () => {
    const blocks = (state.maps.continents || [])
      .map((c) => {
        const regions = (c.regions || []).map((r) => `- ${r}`).join("\n");
        return panel("CONTINENT", [
          `[${c.name}] [ID hidden]`,
          ``,
          `Regions:`,
          regions || "- (none)",
        ].join("\n"));
      })
      .join("");

    dom.contentScroll.innerHTML = blocks || panel("MAPS", "(none)");
  };

  const renderNPC = () => {
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
  };

  const renderLifeJob = (tab) => {
    const lj = state.lifeJobs[tab];
    if (!lj) {
      dom.contentScroll.innerHTML = panel("LIFE JOB", "(missing)");
      return;
    }

    const header = [
      `Life Job: ${lj.jobName} [ID hidden]`,
      `Mastery: ${lj.mastery}`,
    ].join("\n");

    const recipes = (lj.recipes || [])
      .map((r) => [
        `[${r.name}]`,
        `Success: ${r.success} | Time: ${r.time}`,
        `Materials: ${(r.mats || []).join(" | ")}`,
      ].join("\n"))
      .join("\n\n");

    dom.contentScroll.innerHTML =
      panel("LIFE JOB", header) +
      panel("RECIPES", recipes || "(none)");
  };

  const render = () => {
    switch (state.activeTab) {
      case "WORLD": return renderWorld();
      case "STATUS": return renderStatus();
      case "INVENTORY": return renderInventory();
      case "SKILLS": return renderSkills();
      case "MAPS": return renderMaps();
      case "NPC": return renderNPC();
      case "ALCHEMY": return renderLifeJob("ALCHEMY");
      case "FORAGING": return renderLifeJob("FORAGING");
      default:
        dom.contentScroll.innerHTML = panel(state.activeTab, "(unimplemented)");
        return;
    }
  };

  // ---------------------------- Input Behavior ----------------------------
  const autoResize = () => {
    if (!dom.input) return;
    dom.input.style.height = "auto";
    dom.input.style.height = Math.min(dom.input.scrollHeight, 160) + "px";
    measureViewport();
  };

  // Never send on Enter: do nothing; browser inserts newline.
  safeOn(dom.input, "keydown", (_e) => {
    // Intentionally empty: Enter always newline.
  });

  safeOn(dom.input, "input", autoResize);

  // Prevent send button from stealing focus (reduces keyboard collapse)
  safeOn(dom.sendBtn, "mousedown", (e) => e.preventDefault());

  const appendWorldLog = (line) => {
    state.worldLog.push(line);
    if (state.worldLog.length > 300) state.worldLog.splice(0, state.worldLog.length - 300);
  };

  const sendMessage = () => {
    const raw = (dom.input?.value ?? "");
    const text = raw.trimEnd();
    if (!text.trim()) return;

    // WORLD LOG: player inputs only (no echoes)
    appendWorldLog("> " + text);

    // One SEND = one TURN cycle in UI terms (cooldowns tick down by turns)
    decrementCooldownsOneTurn();

    dom.input.value = "";
    autoResize();

    renderWorld();
    saveState();

    // Keep keyboard open
    requestAnimationFrame(() => dom.input.focus({ preventScroll: true }));
  };

  safeOn(dom.sendBtn, "click", sendMessage);

  // Life Job actions (UI only)
  safeOn(dom.cancelBtn, "click", () => setActiveTab("WORLD"));
  safeOn(dom.execBtn, "click", () => {
    // In production, this will call engine execution for that tab context.
    // For now, return to WORLD without polluting WORLD LOG.
    setActiveTab("WORLD");
  });

  // Tabs
  dom.tabs.forEach((t) => safeOn(t, "click", () => setActiveTab(t.dataset.tab)));

  safeOn(window, "resize", measureViewport);
  safeOn(window, "orientationchange", measureViewport);

  // ---------------------------- Init ----------------------------
  render();
  syncBars();
  measureViewport();
  autoResize();

  // Service worker (relative path for GitHub Pages subfolder)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js")
      .then(() => console.log("[SW] registered"))
      .catch((err) => console.log("[SW] error:", err));
  }
})();
```0