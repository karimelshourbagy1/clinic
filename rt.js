/* Runtime: login (Firebase Auth), data sync (Firestore), photos, downloads, and the AI assistant.
   The app talks to it through KRT.use(name), so the app code itself stays the same. */
(function () {
  var CFG = window.CLINIC_CFG || {}, FB = CFG.firebase || {}, LK = "ks3:", UK = "krt:uid";
  var configured = !!(FB.apiKey && FB.projectId && window.firebase);
  var auth = null, fs = null, user = null, readyRes, ready = new Promise(function (r) { readyRes = r; });

  /* ---------- login screen ---------- */
  var css = document.createElement("style");
  css.textContent =
    "#krt-gate{position:fixed;inset:0;z-index:9999;background:var(--bg,#F2F3F1);display:flex;align-items:center;justify-content:center;padding:16px}" +
    "#krt-gate[hidden]{display:none!important}" +
    "#krt-gate form{width:100%;max-width:360px;background:var(--surface,#fff);border:1px solid var(--line,#ddd);border-radius:14px;padding:24px;box-shadow:0 8px 30px rgba(0,0,0,.08);display:flex;flex-direction:column;gap:12px}" +
    "#krt-gate h1{font-size:1.2rem;margin:0}#krt-gate p{margin:0;color:var(--muted,#666);font-size:.9rem}" +
    "#krt-gate input{width:100%;padding:11px 12px;border:1px solid var(--line,#ccc);border-radius:10px;background:var(--sunk,#f5f5f5);direction:ltr;text-align:left}" +
    "#krt-gate button{padding:11px;border:0;border-radius:10px;background:var(--teal,#1D6B5F);color:#fff;font-weight:600;cursor:pointer}" +
    "#krt-gate button.l{background:none;color:var(--teal,#1D6B5F);padding:4px;font-weight:500}" +
    "#krt-gate .e{color:var(--red,#B03F2C);font-size:.9rem;min-height:1.2em}";
  document.head.appendChild(css);
  var gate = document.createElement("div");
  gate.id = "krt-gate";
  gate.innerHTML =
    '<form id="krt-f" autocomplete="on"><h1>عيادة د. كريم الشوربجي</h1><p>سجّل دخول عشان تفتح النظام.</p>' +
    '<input id="krt-em" type="email" placeholder="الإيميل" autocomplete="username" required>' +
    '<input id="krt-pw" type="password" placeholder="كلمة السر" autocomplete="current-password" required>' +
    '<button type="submit" id="krt-go">دخول</button><button type="button" class="l" id="krt-fg">نسيت كلمة السر؟</button>' +
    '<div class="e" id="krt-er" role="alert"></div></form>';
  document.body.appendChild(gate);
  var $ = function (id) { return document.getElementById(id); };
  function err(t) { $("krt-er").textContent = t || ""; }
  function authMsg(e) {
    var c = (e && e.code) || "";
    if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(c)) return "الإيميل أو كلمة السر غلط.";
    if (/too-many-requests/.test(c)) return "محاولات كتير — استنى شوية وجرّب تاني.";
    if (/network/.test(c)) return "مفيش نت.";
    return "حصلت مشكلة (" + c + ").";
  }

  function clearLocal() {
    try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf(LK) === 0) localStorage.removeItem(k); }); } catch (e) {}
  }

  if (!configured) {
    $("krt-f").innerHTML = "<h1>النظام لسه مش متوصل</h1><p>محتاج إعدادات Firebase في ملف config.js.</p>";
  } else {
    firebase.initializeApp(FB);
    auth = firebase.auth();
    fs = firebase.firestore();
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function () {});
    $("krt-f").addEventListener("submit", function (e) {
      e.preventDefault(); err(""); $("krt-go").disabled = true;
      auth.signInWithEmailAndPassword($("krt-em").value.trim(), $("krt-pw").value)
        .catch(function (x) { err(authMsg(x)); })
        .then(function () { $("krt-go").disabled = false; });
    });
    $("krt-fg").addEventListener("click", function () {
      var em = $("krt-em").value.trim();
      if (!em) { err("اكتب الإيميل الأول."); return; }
      auth.sendPasswordResetEmail(em).then(function () { err("بعتنالك رسالة على الإيميل تغيّر منها كلمة السر."); }, function (x) { err(authMsg(x)); });
    });
    auth.onAuthStateChanged(function (u) {
      if (!u) { gate.hidden = false; if (user) { user = null; clearLocal(); location.reload(); } return; }
      var last = null; try { last = localStorage.getItem(UK); } catch (e) {}
      if (last && last !== u.uid) { clearLocal(); try { localStorage.setItem(UK, u.uid); } catch (e) {} location.reload(); return; }
      try { localStorage.setItem(UK, u.uid); } catch (e) {}
      user = u; gate.hidden = true; addLogout(); readyRes(u);
    });
  }

  function addLogout() {
    if ($("krt-out")) return;
    var at = $("set-mode"); if (!at) return;
    var b = document.createElement("button");
    b.type = "button"; b.id = "krt-out"; b.className = "btn s ghost"; b.style.marginBottom = "10px";
    b.textContent = "تسجيل خروج (" + (user.email || "") + ")";
    b.addEventListener("click", function () {
      if (!confirm("تسجيل خروج؟ البيانات هتتمسح من الجهاز ده بس، وهتفضل محفوظة في حسابك.")) return;
      clearLocal(); try { localStorage.removeItem(UK); } catch (e) {}
      auth.signOut().then(function () { location.reload(); });
    });
    at.parentNode.insertBefore(b, at.nextSibling);
  }

  /* ---------- data: each record is stored as JSON text so any shape fits Firestore ---------- */
  function wrapDoc(s) {
    return { id: s.id, exists: s.exists, data: function () { var d = s.data(); if (!d) return undefined; if (typeof d.j === "string") { try { return JSON.parse(d.j); } catch (e) { return {}; } } return d; } };
  }
  function enc(d) { return { j: JSON.stringify(d), u: (d && d.updatedAt) || Date.now() }; }
  var dbApi = {
    doc: function (p) {
      var r = fs.doc(p);
      return {
        set: function (d) { return r.set(enc(d)); },
        delete: function () { return r.delete(); },
        get: function () { return r.get().then(wrapDoc); },
        onSnapshot: function (next, bad) { return r.onSnapshot(function (s) { next(wrapDoc(s)); }, bad); }
      };
    },
    collection: function (p) {
      var c = fs.collection(p);
      return {
        onSnapshot: function (next, bad) {
          return c.onSnapshot(function (q) {
            next({ docs: q.docs.map(wrapDoc), metadata: q.metadata, docChanges: function () { return q.docChanges().map(function (ch) { return { type: ch.type, doc: wrapDoc(ch.doc) }; }); } });
          }, bad);
        }
      };
    }
  };

  /* ---------- photos: resized JPEG kept in the user's own Firestore area ---------- */
  var PX = "data:image/gif;base64,R0lGODlhAQABAAAAACw=", cache = {}, loading = {};
  function phRef(id) { return fs.doc("data/users/" + user.uid + "/clinic/photos/" + id); }
  function toBlob(dataUrl) {
    var a = dataUrl.split(","), m = (a[0].match(/:(.*?);/) || [])[1] || "image/jpeg", b = atob(a[1]), u = new Uint8Array(b.length);
    for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    return new Blob([u], { type: m });
  }
  function show(id) {
    document.querySelectorAll('[data-bid="' + id + '"]').forEach(function (el) {
      if (el.tagName === "A") el.href = cache[id]; else el.src = cache[id];
    });
  }
  function blob(id) {
    if (cache[id]) return cache[id];
    if (!loading[id] && user) {
      loading[id] = phRef(id).get().then(function (s) {
        var d = s.exists ? s.data() : null;
        if (d && d.img) { cache[id] = URL.createObjectURL(toBlob(d.img)); show(id); }
      }, function () {}).then(function () { if (!cache[id]) delete loading[id]; });
    }
    return PX;
  }
  function shrink(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        URL.revokeObjectURL(url);
        var side = 1600, q = 0.82, out;
        for (var t = 0; t < 6; t++) {
          var s = Math.min(1, side / Math.max(im.width, im.height)), cv = document.createElement("canvas");
          cv.width = Math.round(im.width * s); cv.height = Math.round(im.height * s);
          cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
          out = cv.toDataURL("image/jpeg", q);
          if (out.length < 900000) return res(out);
          side = Math.round(side * 0.8); q = Math.max(0.6, q - 0.05);
        }
        res(out);
      };
      im.onerror = function () { URL.revokeObjectURL(url); rej({ code: "bad_image" }); };
      im.src = url;
    });
  }
  var assetsApi = {
    upload: function (file) {
      var id = "ph" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      return shrink(file).then(function (d) {
        return phRef(id).set({ img: d, at: Date.now() }).then(function () { cache[id] = URL.createObjectURL(toBlob(d)); return { id: id }; });
      });
    },
    delete: function (id) { return phRef(id).delete(); }
  };

  /* ---------- downloads ---------- */
  var dlApi = {
    save: function (o) {
      return new Promise(function (res) {
        var d = o.data, b = d instanceof Blob ? d : new Blob([d], { type: "application/octet-stream" });
        var u = URL.createObjectURL(b), a = document.createElement("a");
        a.href = u; a.download = o.filename || "file"; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(u); }, 4000); res();
      });
    }
  };

  /* ---------- AI assistant (DeepSeek through the clinic's own small server) ---------- */
  function scrub(t) { return String(t).replace(/(?:\+?20|0020)?0?1[0125][\s-]?\d{4}[\s-]?\d{4}/g, "[رقم]"); }
  function ask(prompt, opt) {
    opt = opt || {};
    var text = "";
    var fail = function (code, msg) { var e = { code: code, text: text || msg || "" }; return Promise.reject(e); };
    return user.getIdToken().then(function (tok) {
      return fetch(CFG.aiUrl, {
        method: "POST", signal: opt.signal,
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok },
        body: JSON.stringify({ prompt: scrub(prompt), quick: opt.modelTier === "quick" })
      });
    }).then(function (r) {
      if (r.status === 429) return fail("rate_limited");
      if (r.status === 402) return fail("error", "رصيد DeepSeek خلص — اشحن من platform.deepseek.com");
      if (r.status === 401 || r.status === 403) return fail("error", "السيرفر رفض الحساب ده.");
      if (!r.ok || !r.body) return fail("error");
      var rd = r.body.getReader(), dec = new TextDecoder(), buf = "";
      function pump() {
        return rd.read().then(function (x) {
          if (x.done) return { text: text };
          buf += dec.decode(x.value, { stream: true });
          var lines = buf.split("\n"); buf = lines.pop();
          lines.forEach(function (l) {
            l = l.trim(); if (l.indexOf("data:") !== 0) return;
            var p = l.slice(5).trim(); if (!p || p === "[DONE]") return;
            try { var c = JSON.parse(p).choices[0].delta.content; if (c) { text += c; if (opt.onText) opt.onText({ text: text }); } } catch (e) {}
          });
          return pump();
        });
      }
      return pump();
    }).catch(function (e) {
      if (e && e.name === "AbortError") return Promise.reject({ code: "cancelled", text: text });
      if (e && e.code) return Promise.reject(e);
      return Promise.reject({ code: "error", text: text });
    });
  }

  /* ---------- what the app asks for ---------- */
  window.KRT = {
    blob: blob,
    use: function (name) {
      if (!configured) return Promise.reject({ code: "not_declared" });
      return ready.then(function () {
        if (name === "db") return dbApi;
        if (name === "user") return { id: function () { return Promise.resolve(user.uid); } };
        if (name === "assets") return assetsApi;
        if (name === "downloads") return dlApi;
        if (name === "sample") { if (!CFG.aiUrl) throw { code: "not_declared" }; return ask; }
        throw { code: "not_declared" };
      });
    }
  };
})();
