/* Cloudflare Worker: the only place the DeepSeek key lives.
   It answers only a signed-in clinic account (Firebase ID token), then streams DeepSeek's reply back.
   Variables to set in Cloudflare (Settings → Variables):
     DEEPSEEK_KEY   (Secret)  the API key from platform.deepseek.com
     FIREBASE_PROJECT          the Firebase project id
     ALLOWED_EMAILS            the login email(s), comma separated
     ALLOWED_ORIGIN            https://karimelshourbagy1.github.io
     MODEL (optional)          default deepseek-chat */

const JWKS = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const SYSTEM = "You are a clinical decision-support assistant for a licensed dermatology & andrology physician in Egypt. " +
  "Be accurate and concise. Suggestions only: the physician makes the final decision. Never ask for or repeat patient names or phone numbers.";
let keys = null, keysAt = 0;

function b64u(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const b = atob(s + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, c => c.charCodeAt(0));
}

async function verify(token, env) {
  const [h, p, s] = (token || "").split(".");
  if (!s) return null;
  const head = JSON.parse(new TextDecoder().decode(b64u(h)));
  const body = JSON.parse(new TextDecoder().decode(b64u(p)));
  if (!keys || Date.now() - keysAt > 3600e3) { keys = (await (await fetch(JWKS)).json()).keys; keysAt = Date.now(); }
  const jwk = keys.find(k => k.kid === head.kid);
  if (!jwk || head.alg !== "RS256") return null;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64u(s), new TextEncoder().encode(h + "." + p));
  const now = Date.now() / 1000, pid = env.FIREBASE_PROJECT;
  if (!ok || body.aud !== pid || body.iss !== "https://securetoken.google.com/" + pid || body.exp < now || body.iat > now + 60) return null;
  const allowed = (env.ALLOWED_EMAILS || "").toLowerCase().split(",").map(x => x.trim()).filter(Boolean);
  return allowed.includes(String(body.email || "").toLowerCase()) ? body : null;
}

export default {
  async fetch(req, env) {
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "https://karimelshourbagy1.github.io",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return new Response("no", { status: 405, headers: cors });

    const who = await verify((req.headers.get("Authorization") || "").replace(/^Bearer /, ""), env).catch(() => null);
    if (!who) return new Response("unauthorized", { status: 401, headers: cors });

    let q;
    try { q = await req.json(); } catch { return new Response("bad", { status: 400, headers: cors }); }
    const prompt = String(q.prompt || "").slice(0, 12000);
    if (!prompt) return new Response("bad", { status: 400, headers: cors });

    const r = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + env.DEEPSEEK_KEY },
      body: JSON.stringify({
        model: env.MODEL || "deepseek-chat",
        stream: true,
        max_tokens: q.quick ? 500 : 1200,
        temperature: 0.4,
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt }]
      })
    });
    if (!r.ok) return new Response(await r.text(), { status: r.status, headers: cors });
    return new Response(r.body, { headers: { ...cors, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
  }
};
