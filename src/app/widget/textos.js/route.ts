import { NextResponse } from "next/server";

// Widget JS que se descarga desde el snippet del usuario:
//   <script async src=".../widget/textos.js" data-widget="..."></script>
//
// No embebemos la config en este bundle — el widget la pide al cargar, con el
// widget_key del atributo `data-widget`, así podemos actualizar greeting/color
// sin que los sitios clientes tengan que recargar nada.

export const runtime = "nodejs";
export const dynamic = "force-static";

export async function GET() {
  return new NextResponse(WIDGET_SOURCE, {
    status: 200,
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=600",
      "access-control-allow-origin": "*",
    },
  });
}

// El widget se carga una sola vez por página. Usa sessionStorage para el id de
// visitante y polling corto para traer respuestas del operador.
const WIDGET_SOURCE = /* javascript */ `
(function () {
  if (window.__textosWidgetLoaded) return;
  window.__textosWidgetLoaded = true;

  var script = document.currentScript;
  var widgetKey = script && script.getAttribute("data-widget");
  if (!widgetKey) return;

  var origin = new URL(script.src).origin;
  var sessionKey = "textos:widget:" + widgetKey;
  var sessionId = localStorage.getItem(sessionKey);
  if (!sessionId) {
    sessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem(sessionKey, sessionId);
  }

  var state = {
    config: null,
    open: false,
    messages: [],
    since: null,
    pollTimer: null,
  };

  fetch(origin + "/api/widget/" + widgetKey + "/config")
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (cfg) {
      if (!cfg) return;
      state.config = cfg;
      mount();
    });

  function mount() {
    var root = document.createElement("div");
    root.setAttribute("data-textos-widget", "1");
    root.innerHTML = template(state.config);
    document.body.appendChild(root);

    var launcher = root.querySelector("[data-tx-launcher]");
    var panel = root.querySelector("[data-tx-panel]");
    var close = root.querySelector("[data-tx-close]");
    var list = root.querySelector("[data-tx-list]");
    var form = root.querySelector("[data-tx-form]");
    var input = root.querySelector("[data-tx-input]");

    launcher.addEventListener("click", toggle);
    close.addEventListener("click", toggle);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var body = input.value.trim();
      if (!body) return;
      input.value = "";
      optimisticRender({ direction: "out", body: body, created_at: new Date().toISOString() }, list);
      fetch(origin + "/api/widget/" + widgetKey + "/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ session: sessionId, body: body }),
      }).then(function () { poll(list); });
    });

    function toggle() {
      state.open = !state.open;
      panel.style.display = state.open ? "flex" : "none";
      if (state.open) {
        if (!state.messages.length) renderGreeting(state.config, list);
        poll(list);
        state.pollTimer = setInterval(function () { poll(list); }, 4000);
      } else {
        clearInterval(state.pollTimer);
      }
    }
  }

  function poll(list) {
    var url = origin + "/api/widget/" + widgetKey + "/poll?session=" + encodeURIComponent(sessionId) +
      (state.since ? "&since=" + encodeURIComponent(state.since) : "");
    fetch(url).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      if (!data || !data.messages) return;
      for (var i = 0; i < data.messages.length; i++) {
        var msg = data.messages[i];
        if (state.messages.find(function (m) { return m.id === msg.id; })) continue;
        state.messages.push(msg);
        renderMessage(msg, list);
        state.since = msg.created_at;
      }
    });
  }

  function optimisticRender(msg, list) {
    state.messages.push(msg);
    renderMessage(msg, list);
  }

  function renderGreeting(cfg, list) {
    renderMessage({ direction: "in", body: cfg.greeting, created_at: new Date().toISOString() }, list);
  }

  function renderMessage(msg, list) {
    var row = document.createElement("div");
    row.className = "tx-msg tx-" + (msg.direction === "out" ? "me" : "them");
    row.textContent = msg.body || "";
    list.appendChild(row);
    list.scrollTop = list.scrollHeight;
  }

  function template(cfg) {
    var color = (cfg && cfg.accent_color) || "#8B5CF6";
    var title = (cfg && cfg.title) || "Conversemos";
    return (
      '<style>' +
      '[data-textos-widget]{position:fixed;bottom:24px;right:24px;z-index:2147483000;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}' +
      '[data-textos-widget] [data-tx-launcher]{width:56px;height:56px;border-radius:999px;background:' + color + ';color:#fff;border:none;box-shadow:0 10px 30px rgba(0,0,0,.25);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:22px}' +
      '[data-textos-widget] [data-tx-panel]{position:fixed;bottom:96px;right:24px;width:340px;height:480px;background:#fff;color:#111;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.25);display:none;flex-direction:column;overflow:hidden}' +
      '[data-textos-widget] [data-tx-head]{background:' + color + ';color:#fff;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;font-weight:600}' +
      '[data-textos-widget] [data-tx-close]{background:transparent;color:#fff;border:none;cursor:pointer;font-size:20px;line-height:1}' +
      '[data-textos-widget] [data-tx-list]{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f6f6f7}' +
      '[data-textos-widget] .tx-msg{max-width:80%;padding:8px 12px;border-radius:14px;line-height:1.35;font-size:14px;white-space:pre-wrap;word-wrap:break-word}' +
      '[data-textos-widget] .tx-them{background:#fff;align-self:flex-start;border:1px solid #e5e5ea}' +
      '[data-textos-widget] .tx-me{background:' + color + ';color:#fff;align-self:flex-end}' +
      '[data-textos-widget] [data-tx-form]{display:flex;gap:8px;padding:10px;border-top:1px solid #eee;background:#fff}' +
      '[data-textos-widget] [data-tx-input]{flex:1;border:1px solid #d8d8dc;border-radius:999px;padding:10px 14px;font-size:14px;outline:none}' +
      '[data-textos-widget] [data-tx-input]:focus{border-color:' + color + '}' +
      '[data-textos-widget] [data-tx-send]{border:none;background:' + color + ';color:#fff;border-radius:999px;padding:0 16px;font-weight:600;cursor:pointer}' +
      '</style>' +
      '<button data-tx-launcher aria-label="Abrir chat">💬</button>' +
      '<div data-tx-panel role="dialog" aria-label="Chat">' +
      '  <div data-tx-head><span>' + escape(title) + '</span><button data-tx-close aria-label="Cerrar">×</button></div>' +
      '  <div data-tx-list></div>' +
      '  <form data-tx-form>' +
      '    <input data-tx-input placeholder="Escribí tu mensaje…" autocomplete="off" />' +
      '    <button data-tx-send type="submit">Enviar</button>' +
      '  </form>' +
      '</div>'
    );
  }

  function escape(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }
})();
`;
