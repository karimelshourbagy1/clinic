/* Runtime: login (Firebase Auth), data sync (Firestore), photos, downloads, and the AI assistant.
   The app talks to it through KRT.use(name), so the app code itself stays the same. */
(function () {
  var CFG = window.CLINIC_CFG || {}, FB = CFG.firebase || {}, LK = "ks3:", UK = "krt:uid";
  var configured = !!(FB.apiKey && FB.projectId && window.firebase);
  var auth = null, fs = null, user = null, readyRes, ready = new Promise(function (r) { readyRes = r; });

  /* ---------- login screen ---------- */
  var css = document.createElement("style");
  css.textContent = [
    "#krt-gate{position:fixed;inset:0;z-index:9999;background:#070707;color:#F3EEE4;overflow:hidden;font-family:'IBM Plex Sans Arabic',system-ui,sans-serif}",
    "#krt-gate[hidden]{display:none!important}",
    "#krt-gate .kg-ph{position:absolute;inset:0}",
    "#krt-gate .kg-ph div{position:absolute;inset:0;background-size:cover;background-position:72% 30%;opacity:0;animation:kgKB 24s infinite}",
    "#krt-gate .kg-ph div:nth-child(2){animation-delay:12s}",
    "@keyframes kgKB{0%{opacity:0;transform:scale(1.12) translateX(1.5%)}6%{opacity:1}46%{opacity:1}54%{opacity:0;transform:scale(1) translateX(0)}100%{opacity:0}}",
    "#krt-gate .kg-sh{position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,7,7,.94) 0%,rgba(7,7,7,.72) 34%,rgba(7,7,7,.12) 62%,rgba(7,7,7,.35)),radial-gradient(60% 80% at 20% 50%,rgba(217,182,111,.10),transparent 70%)}",
    "#krt-gate canvas{position:absolute;inset:0;width:100%;height:100%}",
    "#krt-gate .kg-ring{position:absolute;left:clamp(16px,6vw,90px);top:50%;width:560px;height:560px;margin:-280px 0 0 -110px;border-radius:50%;border:1px solid rgba(217,182,111,.16);animation:kgSpin 60s linear infinite}",
    "#krt-gate .kg-ring::before,#krt-gate .kg-ring::after{content:'';position:absolute;border-radius:50%;border:1px dashed rgba(217,182,111,.20)}",
    "#krt-gate .kg-ring::before{inset:40px}#krt-gate .kg-ring::after{inset:-46px;border-style:solid;border-color:rgba(217,182,111,.08);border-top-color:rgba(217,182,111,.55)}",
    "@keyframes kgSpin{to{transform:rotate(360deg)}}",
    "#krt-gate .kg-in{position:relative;z-index:2;height:100%;display:flex;align-items:center;padding:24px clamp(16px,6vw,90px);direction:ltr}",
    "#krt-gate .kg-card{direction:rtl;width:100%;max-width:390px;padding:34px 30px 26px;border-radius:24px;background:linear-gradient(160deg,rgba(28,26,22,.62),rgba(10,10,11,.55));backdrop-filter:blur(18px) saturate(1.2);-webkit-backdrop-filter:blur(18px) saturate(1.2);border:1px solid rgba(217,182,111,.30);box-shadow:0 30px 80px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.06);animation:kgUp .9s cubic-bezier(.2,.8,.2,1) both}",
    "@keyframes kgUp{from{opacity:0;transform:translateY(24px)}}",
    "#krt-gate .kg-logo{width:58px;height:68px;margin:0 auto 10px;background:linear-gradient(135deg,#F7E3AE,#C9A35A 55%,#8A6A2C);-webkit-mask:url(img/logo-mask.png) center/contain no-repeat;mask:url(img/logo-mask.png) center/contain no-repeat;filter:drop-shadow(0 0 12px rgba(217,182,111,.4))}",
    "#krt-gate h1{margin:0;text-align:center;font-family:'Readex Pro','IBM Plex Sans Arabic',sans-serif;font-weight:600;font-size:1.5rem;background:linear-gradient(90deg,#F7E7C0,#D9B66F,#F7E7C0);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:kgSh 6s linear infinite}",
    "@keyframes kgSh{to{background-position:-200% 0}}",
    "#krt-gate .kg-sub{text-align:center;font-size:.66rem;letter-spacing:.26em;color:#C9A35A;margin:4px 0 2px;direction:ltr}",
    "#krt-gate .kg-div{height:1px;margin:16px 0 18px;background:linear-gradient(90deg,transparent,rgba(217,182,111,.7),transparent)}",
    "#krt-gate form{display:flex;flex-direction:column;gap:12px}",
    "#krt-gate p{margin:0 0 2px;color:rgba(243,238,228,.68);font-size:.88rem;text-align:center}",
    "#krt-gate input{width:100%;box-sizing:border-box;padding:13px 14px;border:1px solid rgba(217,182,111,.25);border-radius:12px;background:rgba(0,0,0,.35);color:#F3EEE4;direction:ltr;text-align:left;font:inherit;outline:none;transition:border-color .2s,box-shadow .2s}",
    "#krt-gate input::placeholder{color:rgba(243,238,228,.45)}",
    "#krt-gate input:focus{border-color:#D9B66F;box-shadow:0 0 0 4px rgba(217,182,111,.14)}",
    "#krt-gate button{font:inherit;cursor:pointer}",
    "#krt-go{position:relative;overflow:hidden;margin-top:4px;padding:13px;border:0;border-radius:12px;background:linear-gradient(135deg,#F0D79C,#C9A35A 50%,#9C7A35);color:#1a1409;font-weight:700;letter-spacing:.02em;box-shadow:0 10px 26px rgba(201,163,90,.32)}",
    "#krt-go::after{content:'';position:absolute;top:0;left:-60%;width:40%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.55),transparent);transform:skewX(-20deg);animation:kgGl 3.6s ease-in-out infinite}",
    "@keyframes kgGl{0%,60%{left:-60%}100%{left:130%}}",
    "#krt-go:disabled{opacity:.6}",
    "#krt-gate button.l{background:none;border:0;color:#D9B66F;padding:4px;font-weight:500}",
    "#krt-gate .e{color:#FF9B8A;font-size:.88rem;min-height:1.2em;text-align:center}",
    "#krt-gate .kg-ft{margin-top:14px;text-align:center;font-size:.7rem;color:rgba(243,238,228,.4);letter-spacing:.08em;direction:ltr}",
    "#krt-wait{display:flex;flex-direction:column;align-items:center;gap:14px;color:rgba(243,238,228,.7);padding:10px 0}",
    "#krt-wait i{width:38px;height:38px;border-radius:50%;border:2px solid rgba(217,182,111,.2);border-top-color:#D9B66F;animation:kgSpin 1s linear infinite}",
    "#krt-gate[data-s=wait] form,#krt-gate:not([data-s=wait]) #krt-wait{display:none}",
    "@media(max-width:760px){#krt-gate .kg-ph{inset:0 0 42% 0}#krt-gate .kg-ph div{background-position:70% 0}#krt-gate .kg-sh{background:linear-gradient(180deg,rgba(7,7,7,.15) 0%,rgba(7,7,7,.55) 40%,rgba(7,7,7,.96) 70%)}",
    "#krt-gate .kg-in{align-items:flex-end;padding:16px 16px calc(20px + env(safe-area-inset-bottom,0px))}#krt-gate .kg-card{max-width:none;padding:24px 20px 20px}#krt-gate .kg-ring{left:50%;top:30%;width:340px;height:340px;margin:-170px 0 0 -170px}}",
    "@media (prefers-reduced-motion:reduce){#krt-gate *{animation:none!important}#krt-gate .kg-ph div:first-child{opacity:1}}"
  ].join("");
  document.head.appendChild(css);
  var gate = document.createElement("div");
  gate.id = "krt-gate";
  gate.setAttribute("data-s", "wait");
  gate.innerHTML =
    '<div class="kg-ph" aria-hidden="true"><div style="background-image:url(img/suit-wide.jpg)"></div><div style="background-image:url(img/scrubs-wide.jpg)"></div></div>' +
    '<div class="kg-sh" aria-hidden="true"></div><canvas id="kg-cv" aria-hidden="true"></canvas><div class="kg-ring" aria-hidden="true"></div>' +
    '<div class="kg-in"><div class="kg-card"><div class="kg-logo" aria-hidden="true"></div><h1>د. كريم الشوربجي</h1><div class="kg-sub">DERMATOLOGY &amp; ANDROLOGY</div><div class="kg-div"></div>' +
    '<form id="krt-f" autocomplete="on"><p>أهلاً بيك، سجّل دخول عشان تفتح نظام العيادة</p>' +
    '<input id="krt-em" type="email" placeholder="الإيميل" autocomplete="username" required>' +
    '<input id="krt-pw" type="password" placeholder="كلمة السر" autocomplete="current-password" required>' +
    '<button type="submit" id="krt-go">دخول</button><button type="button" class="l" id="krt-fg">نسيت كلمة السر؟</button>' +
    '<div class="e" id="krt-er" role="alert"></div></form><div id="krt-wait"><i></i>جاري الفتح…</div>' +
    '<div class="kg-ft">PRIVATE CLINIC SYSTEM</div></div></div>';
  document.body.appendChild(gate);
  (function dust() {
    var cv = document.getElementById("kg-cv"), cx = cv.getContext && cv.getContext("2d"); if (!cx) return;
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var W, H, P = [], dpr = Math.min(window.devicePixelRatio || 1, 2);
    function size() { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); window.addEventListener("resize", size);
    for (var i = 0; i < 70; i++) P.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.8 + .4, s: Math.random() * .25 + .05, d: Math.random() * 6.28, a: Math.random() * .6 + .2 });
    (function f() {
      if (gate.hidden) return;
      cx.clearRect(0, 0, W, H);
      for (var i = 0; i < P.length; i++) { var p = P[i]; p.y -= p.s / H * 3; p.d += .01; if (p.y < -.02) { p.y = 1.02; p.x = Math.random(); }
        var x = p.x * W + Math.sin(p.d) * 12, y = p.y * H, g = cx.createRadialGradient(x, y, 0, x, y, p.r * 4);
        g.addColorStop(0, "rgba(240,215,156," + p.a + ")"); g.addColorStop(1, "rgba(240,215,156,0)");
        cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, p.r * 4, 0, 6.29); cx.fill(); }
      requestAnimationFrame(f);
    })();
  })();
  var $ = function (id) { return document.getElementById(id); };
  function err(t) { $("krt-er").textContent = t || ""; }
  function authMsg(e) {
    var c = (e && e.code) || "";
    if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(c)) return "الإيميل أو كلمة السر غلط.";
    if (/too-many-requests/.test(c)) return "محاولات كتير — استنى شوية وجرّب تاني.";
    if (/network/.test(c)) return "مفيش نت.";
    return "حصلت مشكلة (" + c + ").";
  }

  function reveal() { var p = document.getElementById("krt-pre"); if (p) p.remove(); }

  function clearLocal() {
    try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf(LK) === 0) localStorage.removeItem(k); }); } catch (e) {}
  }

  if (!configured) {
    gate.setAttribute("data-s", "form");
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
      if (!u) { gate.setAttribute("data-s", "form"); gate.hidden = false; if (user) { user = null; clearLocal(); location.reload(); } return; }
      var last = null; try { last = localStorage.getItem(UK); } catch (e) {}
      if (last && last !== u.uid) { clearLocal(); try { localStorage.setItem(UK, u.uid); } catch (e) {} location.reload(); return; }
      try { localStorage.setItem(UK, u.uid); } catch (e) {}
      user = u; gate.hidden = true; reveal(); addLogout(); readyRes(u);
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

  /* ---------- website bookings: the public site drops them in "bookings"; we import then delete ---------- */
  function bookings() {
    if (!user) return Promise.resolve([]);
    return fs.collection("bookings").orderBy("at").limit(200).get().then(function (q) {
      return q.docs.map(function (d) {
        var r = d.data() || {}, at = r.at && r.at.toDate ? r.at.toDate().toISOString() : "";
        return { id: d.id, msg: r.msg || "", name: r.name || "", phone: r.phone || "", branch: r.branch || "", day: r.day || "", time: r.time || "", service: r.service || "", page: r.page || "", at: at };
      });
    });
  }
  function doneBooking(id) { try { fs.collection("bookings").doc(id).delete().catch(function () {}); } catch (e) {} }

  /* ---------- what the app asks for ---------- */
  window.KRT = {
    blob: blob,
    bookings: function () { return ready.then(bookings); },
    doneBooking: doneBooking,
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
