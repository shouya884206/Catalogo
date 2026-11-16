/* Aviso de nueva versión (Tienda XPLUS). Independiente de la app: solo lee un archivo público con números de versión.
   El proceso de compilación define antes: window.APP_ID y window.APP_BUILD. Sin APP_BUILD (desarrollo) no hace nada. */
(function () {
  'use strict';
  var ID = window.APP_ID, BUILD = Number(window.APP_BUILD) || 0;
  if (!ID || !BUILD) return;
  var URL_V = 'https://raw.githubusercontent.com/shouya884206/xplus-versiones/main/' + ID + '.json';
  var KEY = 'xplus.upd.' + ID, info = null;
  function lsGet() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
  function lsSet(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var URL_API = 'https://api.github.com/repos/shouya884206/xplus-versiones/contents/' + ID + '.json?ref=main';
  function pedir(url, hdr) {
    var ctl = window.AbortController ? new AbortController() : null, to = setTimeout(function () { if (ctl) ctl.abort(); }, 12000);
    return fetch(url, { cache: 'no-store', headers: hdr, signal: ctl ? ctl.signal : undefined })
      .then(function (r) { clearTimeout(to); return r.ok ? r.json() : null; })
      .then(function (j) { return j && Number(j.codigo) ? j : null; })
      .catch(function () { clearTimeout(to); return null; });
  }
  /* primero la API de GitHub (sin caché); si falla, el archivo directo */
  function consultar() { return pedir(URL_API, { Accept: 'application/vnd.github.raw+json' }).then(function (j) { return j || pedir(URL_V + '?t=' + Date.now()); }); }
  function dialogo() {
    if (!info || document.getElementById('xplus_upd')) return;
    var o = document.createElement('div'); o.id = 'xplus_upd';
    o.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;padding:20px;font-family:system-ui,-apple-system,Roboto,sans-serif';
    o.innerHTML = '<div style="background:#111827;color:#f3f4f6;border:1px solid #4ade80;border-radius:18px;padding:20px;max-width:360px;width:100%;box-shadow:0 20px 50px #000a">' +
      '<div style="display:inline-block;background:#22c55e33;border:1px solid #4ade80;color:#86efac;font-size:11px;font-weight:800;letter-spacing:.06em;border-radius:99px;padding:3px 10px;margin-bottom:10px">ACTUALIZACIÓN OBLIGATORIA</div>' +
      '<div style="font-size:19px;font-weight:800;margin-bottom:6px">Hay una nueva versión</div>' +
      '<div style="font-size:14px;opacity:.85;margin-bottom:6px">Versión <b>' + esc(info.version) + '</b></div>' +
      (info.notas ? '<div style="font-size:13px;opacity:.7;margin-bottom:10px">' + esc(info.notas) + '</div>' : '') +
      '<div style="font-size:13px;background:#ffffff0d;border-radius:10px;padding:9px 11px;margin-bottom:14px">Para seguir usando la app, actualiza desde la Tienda XPLUS. Si tienes cambios sin enviar, sincroniza antes. Al actualizar no pierdes tus datos.</div>' +
      '<button id="xplus_upd_ir" style="width:100%;padding:12px;border:0;border-radius:12px;background:#22c55e;color:#04210f;font-size:15px;font-weight:800">Abrir la Tienda XPLUS</button>' +
      '<div style="font-size:12px;opacity:.6;text-align:center;margin-top:8px">Si no se abre, entra a la Tienda XPLUS desde tu teléfono y toca Actualizar.</div></div>';
    document.body.appendChild(o);
    document.getElementById('xplus_upd_ir').onclick = function () {
      /* si la tienda abre, esta app pasa a segundo plano; si no pasa nada, la tienda no está instalada */
      var abrio = false, v = function () { if (document.hidden) abrio = true; };
      document.addEventListener('visibilitychange', v); window.addEventListener('blur', v);
      try { location.href = 'xplustienda://abrir'; } catch (e) { }
      setTimeout(function () {
        document.removeEventListener('visibilitychange', v); window.removeEventListener('blur', v);
        if (abrio || document.hidden || document.getElementById('xplus_sin')) return;
        var d = document.createElement('div'); d.id = 'xplus_sin';
        d.style.cssText = 'margin-top:12px;font-size:13px;background:#f59e0b22;border:1px solid #f59e0b;border-radius:10px;padding:9px 11px';
        d.innerHTML = '<b>La Tienda XPLUS no está instalada.</b><br>Pídele al administrador que te la envíe. Mientras tanto puedes seguir usando la app.' +
          '<button id="xplus_upd_seguir" style="width:100%;margin-top:10px;padding:11px;border:1px solid #ffffff33;border-radius:12px;background:transparent;color:#f3f4f6;font-size:14px">Continuar por ahora</button>';
        o.firstChild.appendChild(d);
        document.getElementById('xplus_upd_seguir').onclick = function () { o.remove(); };
      }, 2200);
    };
  }
  function revisar(inicio) {
    if (!navigator.onLine) return;
    var g = lsGet(), ahora = Date.now();
    if (inicio !== true && g.ultima && ahora - g.ultima < 2 * 60000) return;
    consultar().then(function (j) {
      g = lsGet(); g.ultima = Date.now(); lsSet(g); if (!j) return;
      info = j; if (Number(j.codigo) <= BUILD) return;
      dialogo();
    });
  }
  function init() {
    setTimeout(function () { revisar(true); }, 1500);
    window.addEventListener('online', function () { setTimeout(revisar, 3000); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) setTimeout(revisar, 2000); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
