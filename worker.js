const SESSION_COOKIE = "heroes_admin";
const SESSION_DAYS = 7;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...extraHeaders },
  });
}

function corsHeaders(origin, env) {
  const allowedOrigins = [env.SITE_ORIGIN || "https://www.retroart.link", "https://retroart.link"];
  return allowedOrigins.includes(origin) ? {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Vary": "Origin",
  } : {};
}

function withCors(response, request, env) {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(corsHeaders(request.headers.get("Origin"), env))) headers.set(k, v);
  return new Response(response.body, { status: response.status, headers });
}

function getCookie(request, name) {
  const cookies = request.headers.get("Cookie") || "";
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(value) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function requireAdmin(request, env) {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return false;
  const hash = await sha256(token);
  const row = await env.DB.prepare(
    "SELECT token_hash FROM admin_sessions WHERE token_hash = ? AND expires_at > ?"
  ).bind(hash, Math.floor(Date.now() / 1000)).first();
  return !!row;
}

async function cleanupSessions(env) {
  await env.DB.prepare("DELETE FROM admin_sessions WHERE expires_at <= ?")
    .bind(Math.floor(Date.now() / 1000)).run();
}

async function getData(env) {
  const settings = await env.DB.prepare(
    "SELECT server_name, official_faction FROM settings WHERE id = 1"
  ).first();
  const players = await env.DB.prepare(
    "SELECT id, nick, player_class AS class, rank, msg FROM players ORDER BY id ASC"
  ).all();
  return {
    serverName: settings?.server_name || "ATHILA",
    officialFaction: settings?.official_faction || "elyos",
    players: players.results || [],
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }), request, env);
    }

    try {
      await cleanupSessions(env);

      if (url.pathname === "/api/data" && request.method === "GET") {
        return withCors(json(await getData(env)), request, env);
      }

      if (url.pathname === "/api/admin/status" && request.method === "GET") {
        return withCors(json({ isAdmin: await requireAdmin(request, env) }), request, env);
      }

      if (url.pathname === "/api/admin/login" && request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        if (!env.ADMIN_PASSWORD) return withCors(json({ error: "ADMIN_PASSWORD no está configurada." }, 500), request, env);
        if (typeof body.password !== "string" || body.password.length === 0 || body.password !== env.ADMIN_PASSWORD) {
          return withCors(json({ error: "Código incorrecto." }, 401), request, env);
        }

        const token = randomToken();
        const hash = await sha256(token);
        const expires = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
        await env.DB.prepare("INSERT INTO admin_sessions (token_hash, expires_at) VALUES (?, ?)")
          .bind(hash, expires).run();

        const cookie = `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${SESSION_DAYS * 86400}; Path=/; HttpOnly; Secure; SameSite=Strict`;
        return withCors(json({ ok: true }, 200, { "Set-Cookie": cookie }), request, env);
      }

      if (url.pathname === "/api/admin/logout" && request.method === "POST") {
        const token = getCookie(request, SESSION_COOKIE);
        if (token) {
          await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(await sha256(token)).run();
        }
        return withCors(json({ ok: true }, 200, {
          "Set-Cookie": `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`,
        }), request, env);
      }

      if (url.pathname === "/api/admin/settings" && request.method === "PUT") {
        if (!(await requireAdmin(request, env))) return withCors(json({ error: "No autorizado." }, 401), request, env);
        const body = await request.json().catch(() => ({}));
        const serverName = typeof body.serverName === "string" ? body.serverName.trim().toUpperCase() : "";
        const faction = body.officialFaction === "asmo" ? "asmo" : body.officialFaction === "elyos" ? "elyos" : "";
        if (!serverName || !faction) return withCors(json({ error: "Datos no válidos." }, 400), request, env);
        await env.DB.prepare("UPDATE settings SET server_name = ?, official_faction = ? WHERE id = 1")
          .bind(serverName, faction).run();
        return withCors(json(await getData(env)), request, env);
      }

      if (url.pathname === "/api/admin/players" && request.method === "POST") {
        if (!(await requireAdmin(request, env))) return withCors(json({ error: "No autorizado." }, 401), request, env);
        const body = await request.json().catch(() => ({}));
        const nick = typeof body.nick === "string" ? body.nick.trim() : "";
        const playerClass = typeof body.class === "string" ? body.class.trim() : "";
        const rank = typeof body.rank === "string" ? body.rank.trim() : "";
        const msg = typeof body.msg === "string" ? body.msg.trim() : "";
        if (!nick || !playerClass || !rank) return withCors(json({ error: "Nick, clase y experiencia son obligatorios." }, 400), request, env);
        await env.DB.prepare("INSERT INTO players (nick, player_class, rank, msg) VALUES (?, ?, ?, ?)")
          .bind(nick.slice(0, 60), playerClass.slice(0, 80), rank.slice(0, 80), msg.slice(0, 300)).run();
        return withCors(json(await getData(env), 201), request, env);
      }

      const deleteMatch = url.pathname.match(/^\/api\/admin\/players\/(\d+)$/);
      if (deleteMatch && request.method === "DELETE") {
        if (!(await requireAdmin(request, env))) return withCors(json({ error: "No autorizado." }, 401), request, env);
        await env.DB.prepare("DELETE FROM players WHERE id = ?").bind(Number(deleteMatch[1])).run();
        return withCors(json(await getData(env)), request, env);
      }

      return withCors(json({ error: "Ruta no encontrada." }, 404), request, env);
    } catch (error) {
      console.error(error);
      return withCors(json({ error: "Error interno del servidor." }, 500), request, env);
    }
  },
};
