// admin-logs.v9.5.5.js — telemetry badge with last event type + age
(function () {
  "use strict";

  function $(s, el) { return (el || document).querySelector(s); }
  function el(tag, attrs) { const e = document.createElement(tag); if (attrs) Object.assign(e, attrs); return e; }

  var LS_KEY = "amorvia:events";
  var TELEMETRY_GRACE_MS = 15000;
  var statusTimer = null;
  var lastEventTs = 0;
  var lastEventType = "";

  var state = {
    endpoint: window.AMORVIA_TRACK_ENDPOINT || "/api/track",
    paused: false,
    limit: 200,
    filterType: "",
    search: "",
    from: "",
    to: "",
    events: [],
    useLocal: false,
    timer: null
  };

  function fmt(ts) {
    try { return new Date(ts).toLocaleString(); }
    catch (e) { return String(ts); }
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c];
    });
  }

  function ensureTelemetryBadge() {
    let bar = $("#telemetryBar");
    if (!bar) {
      const stats = $("#stats") || document.body;
      bar = el("div");
      bar.id = "telemetryBar";
      bar.style.margin = ".25rem 0 .5rem";
      stats.parentNode.insertBefore(bar, stats.nextSibling);
    }
    let badge = $("#telemetryBadge");
    if (!badge) {
      badge = el("span");
      badge.id = "telemetryBadge";
      badge.style.borderRadius = "999px";
      badge.style.padding = ".2rem .6rem";
      badge.style.fontSize = ".8rem";
      badge.style.border = "1px solid rgba(255,255,255,.2)";
      badge.style.background = "var(--chip, #1f2937)";
      badge.style.color = "var(--text, #e5e7eb)";
      bar.appendChild(badge);
    }
    return badge;
  }

  function setTelemetryStatus(ok, detail) {
    const b = ensureTelemetryBadge();
    b.textContent = ok ? "Telemetry: active" + (detail ? " (" + detail + ")" : "") : "Telemetry: waiting…";
    b.style.borderColor = ok ? "rgba(34,197,94,.6)" : "rgba(245,158,11,.6)";
    b.style.background = ok ? "rgba(34,197,94,.15)" : "rgba(245,158,11,.12)";
    b.title = detail || "";
  }

  function updateTelemetryStatusTimer() {
    clearInterval(statusTimer);
    const tick = function () {
      const now = Date.now();
      const ok = (now - lastEventTs) <= TELEMETRY_GRACE_MS;
      let detail = "";
      if (lastEventTs) {
        const age = Math.floor((now - lastEventTs)/1000);
        detail = "last: " + (lastEventType || "event") + " · " + age + "s ago";
      }
      setTelemetryStatus(ok, detail);
    };
    tick();
    statusTimer = setInterval(tick, 1000);
  }

  function renderStats() {
    var byType = {};
    state.events.forEach(function (e) {
      var t = e && e.type || "event";
      byType[t] = (byType[t] || 0) + 1;
    });
    var html = '<div class="status">Total: <strong>' + state.events.length + '</strong></div>' +
      '<div class="badges">' +
      Object.keys(byType).sort().map(function (t) {
        return '<span class="badge">' + escapeHtml(t) + '<span class="count">' + byType[t] + '</span></span>';
      }).join("") +
      "</div>";
    $("#stats").innerHTML = html;
  }

  function applyFilters(list) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (!e) continue;
      if (state.filterType && e.type !== state.filterType) continue;
      if (state.search) {
        var s = state.search.toLowerCase();
        var hay = (JSON.stringify(e.payload || {}) + " " + String(e.type)).toLowerCase();
        if (hay.indexOf(s) === -1) continue;
      }
      if (state.from && e.ts < Date.parse(state.from)) continue;
      if (state.to && e.ts > Date.parse(state.to)) continue;
      out.push(e);
    }
    if (out.length > state.limit) out = out.slice(out.length - state.limit);
    return out;
  }

  function renderList() {
    var list = applyFilters(state.events);
    var html = list.map(function (e) {
      return '' +
        '<div class="row">' +
          '<div>' +
            '<div class="time">' + escapeHtml(fmt(e.ts)) + '</div>' +
            '<div class="type">' + escapeHtml(e.type) + '</div>' +
          '</div>' +
          '<pre class="payload" aria-label="Payload">' + escapeHtml(JSON.stringify(e.payload, null, 2)) + '</pre>' +
        '</div>';
    }).join("");
    $("#list").innerHTML = html;
  }

  function normalizeResponse(j) {
    if (Array.isArray(j)) return j;
    if (typeof j === "string") {
      var rows = j.trim().split("\n").map(function (s) {
        try { return JSON.parse(s); } catch (e) { return null; }
      }).filter(Boolean);
      return rows;
    }
    if (j && typeof j === "object") {
      if (Array.isArray(j.events)) return j.events;
      if (Array.isArray(j.data)) return j.data;
    }
    return [];
  }

  function toEventShape(e) {
    const ts = e && (e.ts || e.time) || Date.now();
    if (ts > lastEventTs) {
      lastEventTs = ts;
      lastEventType = e && (e.type || e.event) || "event";
    }
    return {
      ts: ts,
      type: e && (e.type || e.event) || "event",
      payload: (e && (e.payload || e.data)) != null ? (e.payload || e.data) : e
    };
  }

  async function loadEndpoint() {
    var $status = $("#status");
    try {
      $status.textContent = "Loading…";
      var r = await fetch(state.endpoint, { cache: "no-store" });
      var ct = (r.headers.get("content-type") || "");
      var j = ct.indexOf("application/json") !== -1 ? await r.json() : await r.text();
      state.events = normalizeResponse(j).map(toEventShape);
      renderStats(); renderList(); populateTypes();
      $status.textContent = "OK — " + state.events.length + " events";
      updateTelemetryStatusTimer();
    } catch (e) {
      $status.textContent = "Error: " + e.message;
    }
  }

  function loadLocal() {
    var raw = localStorage.getItem(LS_KEY) || "[]";
    try {
      var arr = JSON.parse(raw);
      state.events = Array.isArray(arr) ? arr.map(toEventShape) : [];
      renderStats(); renderList(); populateTypes();
      $("#status").textContent = "Local buffer — " + state.events.length + " events";
      updateTelemetryStatusTimer();
    } catch (e) {
      $("#status").textContent = "Local buffer parse error";
    }
  }

  function poll() {
    clearInterval(state.timer);
    state.timer = setInterval(function () {
      if (!state.paused) {
        if (state.useLocal) loadLocal(); else loadEndpoint();
      }
    }, 5000);
  }

  function exportJSON() {
    var list = applyFilters(state.events);
    var blob = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "amorvia-logs.json";
    a.click();
  }

  function exportCSV() {
    var list = applyFilters(state.events);
    var rows = [["ts", "time", "type", "payload"]];
    list.forEach(function (e) {
      rows.push([e.ts, fmt(e.ts), e.type, JSON.stringify(e.payload || {})]);
    });
    var csv = rows.map(function (r) {
      return r.map(function (v) {
        return '"' + String(v).replace(/"/g, '""') + '"';
      }).join(",");
    }).join("\n");
    var blob = new Blob([csv], { type: "text/csv" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "amorvia-logs.csv";
    a.click();
  }

  function copyList() {
    var list = applyFilters(state.events);
    navigator.clipboard.writeText(JSON.stringify(list, null, 2))
      .then(function () { toast("Copied to clipboard"); })
      .catch(function () { toast("Copy failed"); });
  }

  function toast(msg) {
    var t = document.createElement("div");
    t.textContent = msg;
    t.style.position = "fixed";
    t.style.bottom = "16px";
    t.style.right = "16px";
    t.style.background = "var(--panel)";
    t.style.color = "var(--text)";
    t.style.border = "1px solid rgba(255,255,255,.2)";
    t.style.padding = "8px 12px";
    t.style.borderRadius = "8px";
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 1700);
  }

  function bind() {
    $("#endpoint").value = state.endpoint;
    $("#endpoint").addEventListener("change", function (e) {
      state.endpoint = e.target.value || "/api/track";
      if (!state.useLocal) loadEndpoint();
    });

    $("#type").addEventListener("change", function (e) {
      state.filterType = e.target.value;
      renderStats(); renderList();
    });
    $("#search").addEventListener("input", function (e) {
      state.search = e.target.value.trim();
      renderList();
    });
    $("#from").addEventListener("change", function (e) {
      state.from = e.target.value; renderList();
    });
    $("#to").addEventListener("change", function (e) {
      state.to = e.target.value; renderList();
    });
    $("#limit").addEventListener("change", function (e) {
      var v = parseInt(e.target.value || "200", 10);
      state.limit = isNaN(v) ? 200 : v; renderList();
    });

    $("#refresh").addEventListener("click", function () {
      if (state.useLocal) loadLocal(); else loadEndpoint();
    });
    $("#pause").addEventListener("click", function () {
      state.paused = !state.paused;
      $("#pause").textContent = state.paused ? "Resume" : "Pause";
      toast(state.paused ? "Live updates paused" : "Live updates resumed");
    });

    var useLocalEl = $("#useLocal");
    if (useLocalEl) {
      useLocalEl.addEventListener("change", function (e) {
        state.useLocal = e.target.checked;
        if (state.useLocal) loadLocal(); else loadEndpoint();
      });
    }

    var exportJsonBtn = $("#export-json");
    if (exportJsonBtn) exportJsonBtn.addEventListener("click", exportJSON);
    var exportCsvBtn = $("#export-csv");
    if (exportCsvBtn) exportCsvBtn.addEventListener("click", exportCSV);
    var copyBtn = $("#copy");
    if (copyBtn) copyBtn.addEventListener("click", copyList);

    var sendTest = $("#sendTest");
    if (sendTest) {
      sendTest.addEventListener("click", function () {
        var fn = window.amorviaTrack || function (t, p) {
          var evt = { ts: Date.now(), type: t, payload: p };
          try {
            var arr = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
            arr.push(evt);
            while (arr.length > 1000) arr.shift();
            localStorage.setItem(LS_KEY, JSON.stringify(arr));
          } catch (e) {}
        };
        fn("admin_test", { message: "Hello from /admin", at: new Date().toISOString() });
        lastEventTs = Date.now();
        lastEventType = "admin_test";
      });
    }

    window.addEventListener("keydown", function (e) {
      var tag = (e.target && e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea") return;
      if (e.key === "r" || e.key === "R") { e.preventDefault(); if (state.useLocal) loadLocal(); else loadEndpoint(); }
      if (e.key === "p" || e.key === "P") { e.preventDefault(); $("#pause").click(); }
      if (e.key === "/") { e.preventDefault(); $("#search").focus(); }
    });
  }

  function populateTypes() {
    var set = {};
    state.events.forEach(function (e) { if (e && e.type) set[e.type] = true; });
    var sel = $("#type");
    var current = sel.value;
    var options = ['<option value="">All</option>'].concat(Object.keys(set).sort().map(function (t) {
      return "<option>" + escapeHtml(t) + "</option>";
    }));
    sel.innerHTML = options.join("");
    if (set[current] || current === "") sel.value = current;
  }

  async function init() {
    bind();
    var useLocalEl = $("#useLocal");
    state.useLocal = !!(useLocalEl && useLocalEl.checked);
    if (state.useLocal) loadLocal(); else await loadEndpoint();
    populateTypes();
    if (!state.events.length) { lastEventTs = 0; updateTelemetryStatusTimer(); }
    poll();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();