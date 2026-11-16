#!/usr/bin/env python3
"""Uso: python3 inyectar-aviso.py <id_app> <numero_compilacion> <actualizador.js> <archivo.html> [otro.html ...]
Copia el aviso de actualización junto a cada HTML y lo enlaza antes de </body>."""
import sys, pathlib
app, build, js, *htmls = sys.argv[1:]
cod = pathlib.Path(js).read_text(encoding="utf-8")
for h in htmls:
    p = pathlib.Path(h); d = p.parent
    nombre = "actualizador-" + app + ".js"
    (d / nombre).write_text("window.APP_ID='%s';window.APP_BUILD=%s;\n" % (app, build) + cod, encoding="utf-8")
    t = p.read_text(encoding="utf-8"); tag = '<script src="%s"></script>' % nombre
    if nombre in t: continue
    i = t.lower().rfind("</body>")
    t = (t[:i] + tag + "\n" + t[i:]) if i >= 0 else (t + "\n" + tag + "\n")
    p.write_text(t, encoding="utf-8"); print("aviso en", h)
