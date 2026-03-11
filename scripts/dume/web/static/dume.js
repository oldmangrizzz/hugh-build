/* =========================================================
   Dum-E Records — Frontend Logic (vanilla JS)
   ========================================================= */

(function () {
  "use strict";

  // --- State -----------------------------------------------
  const state = {
    ct104Online: false,
    selectedFiles: new Set(),
    currentPath: "/",
    treeCache: {},
    expandedFolders: new Set(),
    syncing: false,
    statsInterval: null,
    contextTarget: null,
  };

  // --- DOM refs --------------------------------------------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];

  // --- Utilities -------------------------------------------
  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function timeStr() {
    return new Date().toLocaleTimeString("en-US", { hour12: false });
  }

  function toast(msg, type = "info") {
    const c = $(".toast-container");
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity .3s";
      setTimeout(() => el.remove(), 300);
    }, 4000);
  }

  // --- API helpers -----------------------------------------
  async function api(path, opts = {}) {
    try {
      const res = await fetch(path, opts);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error(`API ${path}:`, err);
      throw err;
    }
  }

  // --- Dum-E animation state -------------------------------
  function setDumeState(s) {
    const el = $(".dume-animation");
    if (!el) return;
    el.className = "dume-animation " + s;
    const txt = $(".dume-status-text");
    if (txt) {
      const labels = {
        idle: "Standing by…",
        working: "Processing files…",
        success: "All done! ✓",
        error: "Something went wrong",
      };
      txt.textContent = labels[s] || "";
    }
  }

  // --- Health & Stats --------------------------------------
  async function updateHealth() {
    try {
      const h = await api("/api/health");
      state.ct104Online = h.ct104?.online || false;
      const dot = $(".ct104-dot");
      if (dot) {
        dot.className = "status-dot " + (state.ct104Online ? "online" : "offline");
      }
      const lbl = $(".ct104-label");
      if (lbl) lbl.textContent = state.ct104Online ? "CT104: Online" : "CT104: Offline";
    } catch {
      state.ct104Online = false;
    }
  }

  async function updateStats() {
    try {
      const s = await api("/api/stats");
      const ct = s.ct104 || {};
      const m = s.manifest || {};

      const setVal = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.textContent = v ?? "—";
      };

      setVal("stat-docs", ct.documents ?? ct.total_documents ?? "?");
      setVal("stat-nodes", ct.nodes ?? ct.total_nodes ?? "?");
      setVal("stat-edges", ct.edges ?? ct.total_edges ?? "?");
      setVal("stat-files", m.total_files ?? 0);
      setVal("stat-chunks", m.total_chunks ?? 0);

      const filesBadge = $(".files-badge");
      if (filesBadge) filesBadge.textContent = `Files: ${m.total_files ?? 0}`;

      if (m.newest_sync) {
        setVal("stat-last-sync", new Date(m.newest_sync).toLocaleDateString());
      }
    } catch {
      /* stats unavailable */
    }
  }

  // --- File Browser ----------------------------------------
  async function loadBrowse(path) {
    const data = await api(`/api/icloud/browse?path=${encodeURIComponent(path)}`);
    state.treeCache[path] = data;
    return data;
  }

  function fileIcon(ext, evicted) {
    if (evicted) return "☁️";
    const map = {
      ".md": "📝",
      ".txt": "📄",
      ".json": "📋",
      ".jsonl": "📋",
      ".pdf": "📕",
      ".html": "🌐",
      ".csv": "📊",
    };
    return map[ext] || "📄";
  }

  function statusBadge(file) {
    if (file.evicted) return '<span class="badge badge-evicted">☁️ evicted</span>';
    if (file.ingested) return '<span class="badge badge-ingested">● synced</span>';
    return '<span class="badge badge-new">○ new</span>';
  }

  function renderTree(container, path, depth) {
    const data = state.treeCache[path];
    if (!data) return;

    let html = "";

    // Folders
    for (const f of data.folders) {
      const childPath = (path === "/" ? "" : path) + "/" + f.name;
      const isExpanded = state.expandedFolders.has(childPath);
      html += `
        <div class="tree-item" style="--depth:${depth}" data-type="folder" data-path="${esc(childPath)}">
          <span class="chevron ${isExpanded ? "open" : ""}">▶</span>
          <span class="icon">📁</span>
          <span class="name">${esc(f.name)}</span>
          <span class="size">${f.item_count}</span>
        </div>
        <div class="tree-children ${isExpanded ? "expanded" : ""}" data-folder-path="${esc(childPath)}"></div>
      `;
    }

    // Files
    for (const f of data.files) {
      const filePath = (path === "/" ? "" : path) + "/" + (f.raw_name || f.name);
      const ingestible = [".md", ".txt", ".json", ".jsonl", ".pdf", ".html", ".csv"].includes(f.ext);
      html += `
        <div class="tree-item" style="--depth:${depth}" data-type="file" data-path="${esc(f.path || filePath)}" data-file='${esc(JSON.stringify(f))}'>
          ${ingestible ? `<input type="checkbox" class="file-check" data-path="${esc(f.path || filePath)}" ${state.selectedFiles.has(f.path || filePath) ? "checked" : ""}>` : '<span style="width:15px"></span>'}
          <span class="icon">${fileIcon(f.ext, f.evicted)}</span>
          <span class="name">${esc(f.name)}</span>
          ${ingestible ? statusBadge(f) : ""}
          <span class="size">${f.size_human || ""}</span>
        </div>
      `;
    }

    if (!data.folders.length && !data.files.length) {
      html = `<div class="tree-item" style="--depth:${depth}"><span class="icon">∅</span><span class="name" style="color:var(--text-muted)">Empty</span></div>`;
    }

    container.innerHTML = html;

    // Re-render expanded children
    for (const f of data.folders) {
      const childPath = (path === "/" ? "" : path) + "/" + f.name;
      if (state.expandedFolders.has(childPath) && state.treeCache[childPath]) {
        const childContainer = container.querySelector(`[data-folder-path="${CSS.escape(childPath)}"]`);
        if (childContainer) {
          renderTree(childContainer, childPath, depth + 1);
        }
      }
    }
  }

  async function toggleFolder(path) {
    if (state.expandedFolders.has(path)) {
      state.expandedFolders.delete(path);
    } else {
      state.expandedFolders.add(path);
      if (!state.treeCache[path]) {
        await loadBrowse(path);
      }
    }
    await refreshTree();
  }

  async function refreshTree() {
    if (!state.treeCache["/"]) await loadBrowse("/");
    const container = $(".file-tree");
    if (container) renderTree(container, "/", 0);
  }

  // --- Checkbox management ---------------------------------
  function onCheckChange(e) {
    const path = e.target.dataset.path;
    if (e.target.checked) {
      state.selectedFiles.add(path);
    } else {
      state.selectedFiles.delete(path);
    }
    updateSyncButton();
  }

  function updateSyncButton() {
    const btn = $("#btn-sync-selected");
    if (btn) {
      btn.disabled = state.selectedFiles.size === 0 || state.syncing;
      btn.textContent = state.selectedFiles.size
        ? `⚡ Sync Selected (${state.selectedFiles.size})`
        : "⚡ Sync Selected";
    }
  }

  // --- File detail view ------------------------------------
  function showFileDetail(fileData) {
    const f = typeof fileData === "string" ? JSON.parse(fileData) : fileData;
    const main = $(".main");
    main.innerHTML = `
      <div class="file-detail">
        <h3>${fileIcon(f.ext, f.evicted)} ${esc(f.name)}</h3>
        <div class="detail-grid">
          <span class="label">Path</span>    <span class="value">${esc(f.path || "")}</span>
          <span class="label">Size</span>    <span class="value">${f.size_human || "—"}</span>
          <span class="label">Extension</span> <span class="value">${esc(f.ext || "—")}</span>
          <span class="label">Hash</span>    <span class="value">${esc(f.hash || "—")}</span>
          <span class="label">Evicted</span> <span class="value">${f.evicted ? "Yes ☁️" : "No"}</span>
          <span class="label">Ingested</span><span class="value">${f.ingested ? "✅ Yes" : "❌ No"}</span>
        </div>
      </div>
      <button class="btn btn-primary" onclick="window.DumeApp.ingestSingle('${esc(f.path || "")}')">⚡ Ingest This File</button>
      <button class="btn btn-secondary" onclick="window.DumeApp.showDashboard()">← Back to Dashboard</button>
    `;
  }

  // --- Dashboard view --------------------------------------
  function showDashboard() {
    const main = $(".main");
    main.innerHTML = `
      <div class="section-title">Workshop Knowledge Base</div>
      <div class="dash-grid">
        <div class="dash-card">
          <span class="label">Documents</span>
          <span class="value" id="stat-docs">—</span>
          <span class="detail">CT104 knowledge store</span>
        </div>
        <div class="dash-card">
          <span class="label">Graph Nodes</span>
          <span class="value" id="stat-nodes">—</span>
        </div>
        <div class="dash-card">
          <span class="label">Graph Edges</span>
          <span class="value" id="stat-edges">—</span>
        </div>
        <div class="dash-card">
          <span class="label">Synced Files</span>
          <span class="value" id="stat-files">—</span>
          <span class="detail">iCloud → CT104</span>
        </div>
        <div class="dash-card">
          <span class="label">Total Chunks</span>
          <span class="value" id="stat-chunks">—</span>
        </div>
        <div class="dash-card">
          <span class="label">Last Sync</span>
          <span class="value" id="stat-last-sync">—</span>
        </div>
      </div>

      <div class="dume-container">
        <div class="dume-animation idle" id="dume-anim"></div>
        <div class="dume-status-text">Standing by…</div>
      </div>
    `;

    // Load SVG into animation container
    loadDumeSVG();
    updateStats();
  }

  async function loadDumeSVG() {
    const container = document.getElementById("dume-anim");
    if (!container) return;
    try {
      const resp = await fetch("/static/dume-arm.svg");
      const svg = await resp.text();
      container.innerHTML = svg;
    } catch {
      container.innerHTML = '<div style="font-size:48px;text-align:center">🤖</div>';
    }
  }

  // --- Sync ------------------------------------------------
  async function syncSelected() {
    if (state.syncing || state.selectedFiles.size === 0) return;
    state.syncing = true;
    updateSyncButton();

    const paths = [...state.selectedFiles];
    showSyncProgress();
    setDumeState("working");

    try {
      const resp = await fetch("/api/icloud/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths, force: false }),
      });

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              handleSSE(eventType, data);
            } catch { /* ignore parse errors */ }
          }
        }
      }
    } catch (err) {
      toast("Sync failed: " + err.message, "error");
      setDumeState("error");
    }

    state.syncing = false;
    state.selectedFiles.clear();
    updateSyncButton();
    refreshTree();
  }

  async function syncAllNew() {
    if (state.syncing) return;
    state.syncing = true;

    showSyncProgress();
    setDumeState("working");

    try {
      const resp = await fetch("/api/icloud/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: ["/Hugh"], force: false }),
      });

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              handleSSE(eventType, data);
            } catch { /* ignore */ }
          }
        }
      }
    } catch (err) {
      toast("Sync failed: " + err.message, "error");
      setDumeState("error");
    }

    state.syncing = false;
    updateSyncButton();
    refreshTree();
  }

  function showSyncProgress() {
    const main = $(".main");
    main.innerHTML = `
      <div class="section-title">Sync Progress</div>
      <div class="dume-container">
        <div class="dume-animation working" id="dume-anim"></div>
        <div class="dume-status-text">Processing files…</div>
      </div>
      <div class="progress-bar-track"><div class="progress-bar-fill" id="sync-bar"></div></div>
      <div class="progress-log" id="progress-log"></div>
    `;
    loadDumeSVG();
  }

  function handleSSE(event, data) {
    const log = document.getElementById("progress-log");

    if (event === "progress") {
      const statusClass =
        data.status === "done" ? "done" :
        data.status === "error" ? "error" :
        data.status === "skipped" ? "skip" : "";

      let msg = data.status;
      if (data.status === "ingesting" && data.chunks) {
        msg = `ingesting ${data.done || 0}/${data.chunks}`;
        // Update progress bar
        const bar = document.getElementById("sync-bar");
        if (bar && data.chunks > 0) {
          bar.style.width = `${((data.done || 0) / data.chunks) * 100}%`;
        }
      }
      if (data.status === "done") {
        msg = `✓ ${data.ok}/${data.chunks} chunks`;
      }
      if (data.status === "error") {
        msg = `✗ ${data.error || "failed"}`;
      }
      if (data.status === "skipped") {
        msg = "— already synced";
      }

      if (log) {
        log.innerHTML += `
          <div class="progress-line">
            <span class="time">${timeStr()}</span>
            <span class="file">${esc(data.file || "")}</span>
            <span class="msg ${statusClass}">${esc(msg)}</span>
          </div>
        `;
        log.scrollTop = log.scrollHeight;
      }
    }

    if (event === "complete") {
      const bar = document.getElementById("sync-bar");
      if (bar) bar.style.width = "100%";

      if (log) {
        log.innerHTML += `
          <div class="progress-line" style="border-top:1px solid rgba(255,255,255,.1);padding-top:8px;margin-top:8px">
            <span class="time">${timeStr()}</span>
            <span class="msg done">✅ Complete — ${data.total_files} files, ${data.total_chunks} chunks, ${data.failed} failed</span>
          </div>
        `;
      }

      if (data.failed > 0) {
        setDumeState("error");
        toast(`Sync complete with ${data.failed} failures`, "error");
      } else {
        setDumeState("success");
        toast(`Synced ${data.total_chunks} chunks from ${data.total_files} files`, "success");
        setTimeout(() => setDumeState("idle"), 3000);
      }

      updateStats();
    }
  }

  // --- Search ----------------------------------------------
  async function search(query) {
    if (!query.trim()) return;
    const main = $(".main");
    main.innerHTML = `<div class="section-title">Searching: "${esc(query)}"</div><div class="loading-spinner"></div>`;

    try {
      const data = await api(`/api/search?q=${encodeURIComponent(query)}&n=10`);
      let html = `<div class="section-title">Results for "${esc(query)}" (${data.count})</div>`;

      if (!data.results || data.results.length === 0) {
        html += `<div class="empty-state"><span class="emoji">🔍</span><p>No results found</p></div>`;
      } else {
        for (const r of data.results) {
          const source = r.source || (r.metadata && r.metadata.source) || "unknown";
          const score = r.score ?? r.similarity ?? "?";
          const text = r.text || r.content || "";
          html += `
            <div class="result-card">
              <div class="result-header">
                <span class="result-source">${esc(source)}</span>
                <span class="result-score">score: ${typeof score === "number" ? score.toFixed(3) : score}</span>
              </div>
              <div class="result-text">${esc(text)}</div>
            </div>
          `;
        }
      }

      html += `<button class="btn btn-secondary" style="margin-top:10px" onclick="window.DumeApp.exportResults('${esc(query)}')">📥 Export Results to iCloud</button>`;
      html += `<button class="btn btn-secondary" style="margin-top:10px;margin-left:8px" onclick="window.DumeApp.showDashboard()">← Dashboard</button>`;
      main.innerHTML = html;
    } catch (err) {
      main.innerHTML = `<div class="empty-state"><span class="emoji">❌</span><p>Search failed: ${esc(err.message)}</p></div>`;
    }
  }

  async function exportResults(query) {
    try {
      const data = await api("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, n: 20 }),
      });
      toast(`Exported ${data.result_count} results → ${data.filename}`, "success");
    } catch (err) {
      toast("Export failed: " + err.message, "error");
    }
  }

  // --- Ingest single file ----------------------------------
  async function ingestSingle(path) {
    if (state.syncing) return;
    state.syncing = true;
    showSyncProgress();
    setDumeState("working");

    try {
      const resp = await fetch("/api/icloud/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: [path], force: false }),
      });

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            try {
              handleSSE(eventType, JSON.parse(line.slice(6)));
            } catch { /* ignore */ }
          }
        }
      }
    } catch (err) {
      toast("Ingest failed: " + err.message, "error");
      setDumeState("error");
    }

    state.syncing = false;
    updateSyncButton();
    refreshTree();
  }

  // --- Context menu ----------------------------------------
  function showContextMenu(e, filePath, fileData) {
    e.preventDefault();
    state.contextTarget = { path: filePath, data: fileData };
    const menu = $(".context-menu");
    menu.style.top = e.clientY + "px";
    menu.style.left = e.clientX + "px";
    menu.classList.add("visible");
  }

  function hideContextMenu() {
    const menu = $(".context-menu");
    if (menu) menu.classList.remove("visible");
  }

  function ctxIngest() {
    if (state.contextTarget) ingestSingle(state.contextTarget.path);
    hideContextMenu();
  }

  function ctxForceIngest() {
    if (!state.contextTarget) return;
    hideContextMenu();
    state.syncing = true;
    showSyncProgress();
    setDumeState("working");

    fetch("/api/icloud/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths: [state.contextTarget.path], force: true }),
    })
      .then((resp) => resp.body.getReader())
      .then(async (reader) => {
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop();
          let eventType = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) eventType = line.slice(7).trim();
            else if (line.startsWith("data: ")) {
              try { handleSSE(eventType, JSON.parse(line.slice(6))); } catch {}
            }
          }
        }
      })
      .catch((err) => toast("Force ingest failed: " + err.message, "error"))
      .finally(() => {
        state.syncing = false;
        updateSyncButton();
        refreshTree();
      });
  }

  function ctxViewDetail() {
    if (state.contextTarget?.data) showFileDetail(state.contextTarget.data);
    hideContextMenu();
  }

  // --- Event wiring ----------------------------------------
  function init() {
    // Sidebar events (delegation)
    const tree = $(".file-tree");
    if (tree) {
      tree.addEventListener("click", async (e) => {
        // Checkbox
        if (e.target.matches(".file-check")) {
          onCheckChange(e);
          return;
        }

        const item = e.target.closest(".tree-item");
        if (!item) return;

        if (item.dataset.type === "folder") {
          await toggleFolder(item.dataset.path);
        } else if (item.dataset.type === "file") {
          showFileDetail(item.dataset.file);
        }
      });

      tree.addEventListener("contextmenu", (e) => {
        const item = e.target.closest('.tree-item[data-type="file"]');
        if (item) {
          showContextMenu(e, item.dataset.path, item.dataset.file);
        }
      });
    }

    // Context menu items
    const ctxItems = {
      "ctx-ingest": ctxIngest,
      "ctx-detail": ctxViewDetail,
      "ctx-force": ctxForceIngest,
    };
    for (const [id, fn] of Object.entries(ctxItems)) {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", fn);
    }

    // Hide context menu on click elsewhere
    document.addEventListener("click", hideContextMenu);

    // Toolbar buttons
    const btnSyncSel = document.getElementById("btn-sync-selected");
    if (btnSyncSel) btnSyncSel.addEventListener("click", syncSelected);

    const btnSyncNew = document.getElementById("btn-sync-new");
    if (btnSyncNew) btnSyncNew.addEventListener("click", syncAllNew);

    const btnResetManifest = document.getElementById("btn-reset-manifest");
    if (btnResetManifest) {
      btnResetManifest.addEventListener("click", async () => {
        if (!confirm("Reset manifest? All files will be marked as unsynced.")) return;
        await api("/api/manifest/reset", { method: "POST" });
        toast("Manifest reset", "info");
        refreshTree();
        updateStats();
      });
    }

    // Search
    const searchInput = document.getElementById("search-input");
    const searchBtn = document.getElementById("btn-search");

    if (searchBtn) {
      searchBtn.addEventListener("click", () => {
        const q = searchInput?.value;
        if (q) search(q);
      });
    }

    if (searchInput) {
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const q = searchInput.value;
          if (q) search(q);
        }
      });
    }

    const exportBtn = document.getElementById("btn-export");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        const q = searchInput?.value;
        if (q) exportResults(q);
      });
    }

    // Dashboard button
    const btnDash = document.getElementById("btn-dashboard");
    if (btnDash) btnDash.addEventListener("click", showDashboard);

    // Initial load
    showDashboard();
    updateHealth();
    refreshTree();

    // Auto-refresh
    state.statsInterval = setInterval(() => {
      updateHealth();
      updateStats();
    }, 30000);
  }

  // --- Public API ------------------------------------------
  window.DumeApp = {
    showDashboard,
    showFileDetail,
    ingestSingle,
    exportResults,
    search,
    setDumeState,
    syncSelected,
    syncAllNew,
  };

  // Boot
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
