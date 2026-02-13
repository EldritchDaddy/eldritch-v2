/* ELDRITCH V2 — UI MOCK (Tabs + Panel Contracts)
   - WORLD: shows unified mandatory block + WORLD LOG (player inputs only) with its own scroll
   - STATUS/INVENTORY/SKILLS/MAPS/NPC: view-only; input hidden
   - ALCHEMY/FORAGING (Life Jobs): input hidden; action bar shows Cancel/Execute
*/

(() => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const contentScroll = $("#contentScroll");
  const inputBar = $("#inputBar");
  const actionBar = $("#actionBar");
  const input = $("#input");
  const sendBtn = $("#sendBtn");
  const cancelBtn = $("#cancelBtn");
  const execBtn = $("#execBtn");

  // ---------- MOCK STATE ----------
  const state = {
    activeTab: "WORLD",

    // Engine 1 summary style stats (mock)
    mc: {
      name: "MC",
      level: 1,
      title: "None",
      attributes: { STR: 10, AGI: 10, VIT: 10, INT: 10, DEX: 10, LUK: 10 },
      derived: {
        ATK: 12,
        DEF: 6,
        HIT: "75%",
        CRIT: "5%",
        EVA: "10%",
        STA_MAX: 30,
      },
      resources: { HP: 30, MP: 10, Fatigue: 0, Conditions: "None" },
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
      }
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
        "A thin thread of lantern-light flickers between trunks, then dies."
      ],
      kyraName: "Kyra", // Kyra -> Seris -> Vaela
      kyra: {
        risk: "MEDIUM",
        advantage: "+10",
        strain: "18%",
        recommendation: "HOLD."
      },
      prompt: "What will you do?",
      statusStrip: "Lv 1 | XP 0/135 | HP 30 | MP 10 | Fatigue 0 | Conditions None",
    },

    // Player-only world log lines
    worldLog: [
      "> Hmm.",
      "> Testing.. in 3.. 2.. 1..",
    ],

    // Inventory categories (mock; each section scrolls with full page scroll for now)
    inventory: {
      changes: {
        used: ["(none)"],
        stored: ["(none)"],
        equip: ["(none)"],
      },
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

    // Skills mock
    skills: {
      active: [
        { name: "Piercing Lunge", desc: "Fast linear thrust with increased crit rate.", mastery: "Novice", cd: "Ready" },
        { name: "Flame Coil", desc: "Mid-range fire arc that can Ignite.", mastery: "Novice", cd: "Cooldown 2 ticks" },
      ],
      passive: [
        { name: "Iron Nerve", desc: "Minor fatigue efficiency when moving.", mastery: "Novice" },
        { name: "Keen Edge", desc: "Small bonus to hit confirmation.", mastery: "Novice" },
      ]
    },

    // Maps mock: continents list collapsible
    maps: {
      continents: [
        { name: "Asterveil", regions: ["Cindergrove Empire", "Sable Coast", "The Whispering Belt"] },
        { name: "Nocturn Helm", regions: ["Frostbound Dominion", "Glasswater Cities"] },
      ]
    },

    // NPC mock: per-NPC collapsible panels
    npcs: [
      { name: "Elara", race: "Human", role: "Scout", relation: "Friend", notes: ["Tracks well in wet ground.", "Avoids open flame."] },
      { name: "Kiara", race: "Half-Elf", role: "Courier", relation: "Neutral", notes: ["Knows back paths.", "Hates debt."] },
    ],

    // Life Jobs mock
    lifeJobs: {
      ALCHEMY: {
        jobName: "Alchemy",
        mastery: "Novice",
        recipes: [
          { name: "Minor Healing Draught", success: "72%", mats: ["Thicket Resin x2", "Clear Water x1"], time: "1 step" },
          { name: "Smoke Vial", success: "61%", mats: ["Ash Powder x1", "Oil x1"], time: "2 steps" },
        ]
      },
      FORAGING: {
        jobName: "Foraging",
        mastery: "Novice",
        recipes: [
          { name: "Careful Harvest", success: "85%", mats: ["None"], time: "1 step" },
          { name: "Bark-Strip Tether", success: "68%", mats: ["Wet Bark x2"], time: "1 step" },
        ]
      }
    }
  };

  // ---------- VIEW HELPERS ----------
  function panel(title, bodyHtml) {
    return `
      <section class="panel">
        <div class="panelTitle">${escapeHtml(title)}</div>
        <div class="mono">${bodyHtml}</div>
      </section>
    `;
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function lines(arr) {
    return arr.map(l => escapeHtml(l)).join("\n");
  }

  function setActiveTab(tab) {
    state.activeTab = tab;
    $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
    render();
    syncBars();
  }

  function isLifeJob(tab) {
    return tab === "ALCHEMY" || tab === "FORAGING";
  }

  function isViewOnly(tab) {
    return tab !== "WORLD" && !isLifeJob(tab);
  }

  function syncBars() {
    // WORLD: show input bar
    // View-only tabs: hide all bottom bars
    // Life jobs: show action bar
    if (state.activeTab === "WORLD") {
      inputBar.style.display = "flex";
      actionBar.style.display = "none";
      input.disabled = false;
      // keep typing comfortable
      requestAnimationFrame(() => input.focus({ preventScroll: true }));
    } else if (isLifeJob(state.activeTab)) {
      inputBar.style.display = "none";
      actionBar.style.display = "flex";
    } else {
      inputBar.style.display = "none";
      actionBar.style.display = "none";
    }
    measureViewport();
  }

  // Keeps viewport height stable around bottom bars
  function measureViewport() {
    const topbarH = $("#topbar").offsetHeight;
    const bottomH = (inputBar.style.display !== "none" ? inputBar.offsetHeight :
                    (actionBar.style.display !== "none" ? actionBar.offsetHeight : 0));
    $("#viewport").style.height = `calc(100% - ${topbarH + bottomH}px)`;
  }

  // ---------- RENDERERS ----------
  function renderWorld() {
    const w = state.world;

    const unified = [
      `Environment: ${w.environment}`,
      `Location: ${w.location}.`,
      `RunTime: ${w.runtime} | Time: ${w.time} | Date: ${w.date} | Facing: ${w.facing}`,
      ``,
      ...w.prose,
      ``,
      `${w.kyraName}: Risk ${w.kyra.risk} | Advantage ${w.kyra.advantage} | Strain ${w.kyra.strain}`,
      `${w.kyraName}: Recommendation ${w.kyra.recommendation}`,
      ``,
      w.prompt,
      ``,
      w.statusStrip
    ].join("\n");

    // WORLD unified block (single block)
    let html = "";
    html += `
      <section class="panel">
        <div class="mono" id="worldUnifiedText">${escapeHtml(unified)}</div>
      </section>
    `;

    // WORLD LOG (player inputs only; separate scroll)
    const logLines = state.worldLog.map(l => `<p class="logLine player">${escapeHtml(l)}</p>`).join("");
    html += `
      <section class="panel">
        <div class="panelTitle">WORLD LOG</div>
        <div id="worldLogBody" class="mono">${logLines}</div>
      </section>
    `;

    contentScroll.innerHTML = html;

    // Keep world log pinned to bottom when sending, without yanking whole page
    const logEl = $("#worldLogBody");
    if (logEl) logEl.scrollTop = logEl.scrollHeight;
  }

  function renderStatus() {
    const m = state.mc;

    const attrLine = `STR ${m.attributes.STR} | AGI ${m.attributes.AGI} | VIT ${m.attributes.VIT} | INT ${m.attributes.INT} | DEX ${m.attributes.DEX} | LUK ${m.attributes.LUK}`;
    const derivedLine = `ATK ${m.derived.ATK} | DEF ${m.derived.DEF} | HIT ${m.derived.HIT} | CRIT ${m.derived.CRIT} | EVA ${m.derived.EVA} | STA_MAX ${m.derived.STA_MAX}`;
    const resLine = `HP ${m.resources.HP} | MP ${m.resources.MP} | Fatigue ${m.resources.Fatigue} | Conditions ${m.resources.Conditions}`;

    let html = "";
    html += panel("STATUS", escapeHtml([
      `Name: ${m.name}`,
      `Level: ${m.level}`,
      `Title: ${m.title}`,
      ``,
      `Attributes: ${attrLine}`,
      `Derived: ${derivedLine}`,
      `Resources: ${resLine}`
    ].join("\n")));

    const eqLines = Object.entries(m.equipped).map(([k,v]) => `${k}: ${v}`);
    html += panel("EQUIPPED", escapeHtml(eqLines.join("\n")));

    contentScroll.innerHTML = html;
  }

  function renderInventory() {
    const inv = state.inventory;

    const changes = [
      `RECENT CHANGES:`,
      `Used: ${inv.changes.used.join(", ")}`,
      `Stored: ${inv.changes.stored.join(", ")}`,
      `Equipped/Unequip: ${inv.changes.equip.join(", ")}`
    ].join("\n");

    function listSection(title, items) {
      const body = items.map(i => `[${i.name}] [${i.rarity}] [x${i.qty}]`).join("\n");
      return panel(title, escapeHtml(body));
    }

    let html = "";
    html += panel("RECENT CHANGES", escapeHtml(changes));
    html += listSection("MATERIALS", inv.materials);
    html += listSection("CONSUMABLES", inv.consumables);
    html += listSection("UNEQUIPPED", inv.unequipped);

    contentScroll.innerHTML = html;
  }

  function renderSkills() {
    const s = state.skills;

    const active = s.active.map(x =>
      `${x.name} | ${x.desc} | Mastery ${x.mastery} | ${x.cd}`
    ).join("\n");

    const passive = s.passive.map(x =>
      `${x.name} | ${x.desc} | Mastery ${x.mastery}`
    ).join("\n");

    // Two blank row separation between ACTIVE and PASSIVE
    let html = "";
    html += panel("ACTIVE", escapeHtml(active || "(none)"));
    html += panel("PASSIVE", escapeHtml(passive || "(none)"));

    contentScroll.innerHTML = html;
  }

  function renderMaps() {
    // Mock: collapsible continents (simple)
    const { continents } = state.maps;

    const blocks = continents.map((c, idx) => {
      const regions = c.regions.map(r => `- ${r}`).join("\n");
      return `
        <section class="panel">
          <div class="panelTitle">CONTINENT</div>
          <div class="mono">
[${escapeHtml(c.name)}] [ID hidden]

Regions:
${escapeHtml(regions)}
          </div>
        </section>
      `;
    }).join("");

    contentScroll.innerHTML = blocks || panel("MAPS", escapeHtml("(none)"));
  }

  function renderNPC() {
    const blocks = state.npcs.map(n => {
      const notes = n.notes.map(x => `- ${x}`).join("\n");
      return panel("NPC PROFILE", escapeHtml([
        `Name: ${n.name}`,
        `Race: ${n.race}`,
        `Role: ${n.role}`,
        ``,
        `Notes:`,
        notes || "- (none)",
        ``,
        `Relation: ${n.relation}`
      ].join("\n")));
    }).join("");

    contentScroll.innerHTML = blocks || panel("NPC", escapeHtml("(none)"));
  }

  function renderLifeJob(tab) {
    const lj = state.lifeJobs[tab];
    if (!lj) {
      contentScroll.innerHTML = panel("LIFE JOB", escapeHtml("(missing)"));
      return;
    }

    const recipeLines = lj.recipes.map(r => [
      `[${r.name}]`,
      `Success: ${r.success} | Time: ${r.time}`,
      `Materials: ${r.mats.join(" | ")}`,
      ``
    ].join("\n")).join("\n");

    const header = [
      `Life Job: ${lj.jobName} [ID hidden]`,
      `Mastery: ${lj.mastery}`,
    ].join("\n");

    let html = "";
    html += panel("LIFE JOB", escapeHtml(header));
    html += panel("RECIPES", escapeHtml(recipeLines.trim() || "(none)"));

    contentScroll.innerHTML = html;
  }

  function render() {
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
        contentScroll.innerHTML = panel(state.activeTab, escapeHtml("(unimplemented)"));
    }
    // Ensure content area is sized right after render
    requestAnimationFrame(measureViewport);
  }

  // ---------- INPUT ----------
  function autoResize() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 140) + "px";
    measureViewport();
  }

  input.addEventListener("input", autoResize);

  // Prevent button stealing focus (reduces keyboard collapse risk)
  sendBtn.addEventListener("mousedown", (e) => e.preventDefault());

  function appendWorldLog(line) {
    state.worldLog.push(line);
    // keep last 200 lines
    if (state.worldLog.length > 200) state.worldLog.splice(0, state.worldLog.length - 200);
  }

  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    // Only player input goes to WORLD LOG
    appendWorldLog("> " + text);

    input.value = "";
    autoResize();

    // Re-render just WORLD if active; keep keyboard open
    if (state.activeTab === "WORLD") {
      renderWorld();
      input.focus({ preventScroll: true });
    }
  }

  sendBtn.addEventListener("click", sendMessage);

  // Enter to send, Shift+Enter for newline
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Life job actions (mock)
  cancelBtn.addEventListener("click", () => setActiveTab("WORLD"));
  execBtn.addEventListener("click", () => {
    // mock execution: just add a player-visible line in world log
    const tab = state.activeTab;
    const label = tab === "ALCHEMY" ? "Alchemy" : "Foraging";
    appendWorldLog(`> [${label}] Execute (mock).`);
    setActiveTab("WORLD");
  });

  // Tabs
  $$(".tab").forEach(t => {
    t.addEventListener("click", () => setActiveTab(t.dataset.tab));
  });

  // Resize handlers
  window.addEventListener("resize", measureViewport);
  window.addEventListener("orientationchange", measureViewport);

  // Init
  render();
  syncBars();
  measureViewport();
  autoResize();

  // Service worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js")
      .then(() => console.log("[SW] registered"))
      .catch(err => console.log("[SW] error:", err));
  }
})();