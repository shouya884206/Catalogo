/* Puente con el SDK de Firebase. GitHub Actions lo empaqueta en www/js/fb.js.
   La app solo usa window.FBX (así se puede probar con un Firebase simulado). */
import { initializeApp } from 'firebase/app';
import { initializeAuth, getAuth, indexedDBLocalPersistence, browserLocalPersistence, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword } from 'firebase/auth';
import { initializeFirestore, doc, collection, getDoc, getDocs, onSnapshot, query, where, writeBatch, updateDoc, deleteDoc, increment, serverTimestamp, Timestamp } from 'firebase/firestore';

let app, auth, db;
const ref = p => doc(db, ...p.split('/'));
const conv = d => { const o = d.data({ serverTimestamps: 'estimate' }) || {}; if (o.su && o.su.toMillis) o.su = o.su.toMillis(); return o; };
const prep = (data, inc) => {
  const o = { ...data };
  if ('su' in o) o.su = serverTimestamp();
  Object.keys(inc || {}).forEach(k => { o[k] = increment(inc[k]); });
  return o;
};

window.FBX = {
  real: true,
  init(config) {
    if (app) return;
    app = initializeApp(config);
    try { auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] }); } catch (e) { auth = getAuth(app); }
    db = initializeFirestore(app, { ignoreUndefinedProperties: true, experimentalAutoDetectLongPolling: true });
  },
  uid: () => (auth && auth.currentUser ? auth.currentUser.uid : ''),
  refreshToken: () => (auth && auth.currentUser ? auth.currentUser.refreshToken : ''),
  onAuth(cb) { return onAuthStateChanged(auth, u => cb(u ? u.uid : '')); },
  async signIn(email, pass) { const r = await signInWithEmailAndPassword(auth, email, pass); return r.user.uid; },
  async signUp(email, pass) { const r = await createUserWithEmailAndPassword(auth, email, pass); return r.user.uid; },
  async signOut() { await signOut(auth); },
  async changePass(pass) { await updatePassword(auth.currentUser, pass); },
  /* Crea la cuenta de un empleado sin cerrar la sesión del administrador (instancia secundaria) */
  async createUser(email, pass) {
    const sec = initializeApp(app.options, 'sec' + Date.now());
    const a2 = getAuth(sec);
    try { const r = await createUserWithEmailAndPassword(a2, email, pass); return r.user.uid; }
    finally { try { await signOut(a2); } catch (e) { } }
  },
  async get(path) { const s = await getDoc(ref(path)); return s.exists() ? conv(s) : null; },
  /* ops: [{ path, data, merge, inc }] — data.su se reemplaza por la hora del servidor; inc = { campo: delta }.
     Se envía en grupos de máximo ~3 MB y 400 registros (Firebase rechaza envíos de más de 10 MB). */
  async write(ops, onProg) {
    const groups = []; let g = [], size = 0;
    ops.forEach(o => { const z = JSON.stringify(o.data).length + 200; if (g.length && (size + z > 3000000 || g.length >= 400)) { groups.push(g); g = []; size = 0; } g.push(o); size += z; });
    if (g.length) groups.push(g);
    for (let i = 0; i < groups.length; i++) {
      if (onProg) onProg(i, groups.length);
      const b = writeBatch(db);
      groups[i].forEach(o => { b.set(ref(o.path), prep(o.data, o.inc), o.merge ? { merge: true } : {}); });
      await b.commit();
    }
    if (onProg) onProg(groups.length, groups.length);
  },
  async query(colPath, conds) {
    const q = query(collection(db, ...colPath.split('/')), ...conds.map(c => where(c[0], c[1], c[2])));
    const s = await getDocs(q); return s.docs.map(d => ({ id: d.id, data: conv(d) }));
  },
  async update(path, data, inc) { await updateDoc(ref(path), prep(data, inc)); },
  async del(path) { await deleteDoc(ref(path)); },
  /* conds: [[campo, operador, valor]]; si el campo es «su», el valor (ms) se convierte en Timestamp */
  listen(colPath, conds, cb, onErr) {
    const q = query(collection(db, ...colPath.split('/')), ...conds.map(c => where(c[0], c[1], c[0] === 'su' ? Timestamp.fromMillis(c[2]) : c[2])));
    return onSnapshot(q, s => cb(s.docChanges().map(ch => ({ id: ch.doc.id, type: ch.type, data: conv(ch.doc) }))), e => onErr && onErr(e));
  },
  listenDoc(path, cb, onErr) { return onSnapshot(ref(path), s => cb(s.exists() ? conv(s) : null), e => onErr && onErr(e)); }
};
