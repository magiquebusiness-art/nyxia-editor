/**
 * NYXIA EDITOR - Cloudflare Worker API
 * Gère la sauvegarde et la restauration de projets via D1
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ── API Routes ──
      if (path.startsWith('/api/')) {
        return handleAPI(request, env, path, corsHeaders);
      }

      // ── Serve static files from public/ ──
      return env.ASSETS.fetch(request);

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  },
};

async function handleAPI(request, env, path, corsHeaders) {
  const db = env.DB;
  const jsonHeaders = { 'Content-Type': 'application/json', ...corsHeaders };

  // ──────────────────────────────────────
  // GET /api/projects — Lister tous les projets
  // ──────────────────────────────────────
  if (path === '/api/projects' && request.method === 'GET') {
    const { results } = await db.prepare(
      'SELECT id, name, created_at, updated_at FROM projects ORDER BY updated_at DESC'
    ).all();
    return new Response(JSON.stringify({ projects: results }), { headers: jsonHeaders });
  }

  // ──────────────────────────────────────
  // GET /api/projects/:id — Récupérer un projet (avec content)
  // ──────────────────────────────────────
  const projectMatch = path.match(/^\/api\/projects\/([a-zA-Z0-9_-]+)$/);
  if (projectMatch && request.method === 'GET') {
    const projectId = projectMatch[1];
    const project = await db.prepare('SELECT * FROM projects WHERE id = ?').bind(projectId).first();

    if (!project) {
      return new Response(JSON.stringify({ error: 'Projet non trouvé' }), { status: 404, headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ project }), { headers: jsonHeaders });
  }

  // ──────────────────────────────────────
  // POST /api/projects — Créer un nouveau projet
  // ──────────────────────────────────────
  if (path === '/api/projects' && request.method === 'POST') {
    const body = await request.json();
    const { name, content } = body;

    if (!name) {
      return new Response(JSON.stringify({ error: 'Le nom du projet est requis' }), { status: 400, headers: jsonHeaders });
    }

    const id = 'proj_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const now = Math.floor(Date.now() / 1000);

    await db.prepare(
      'INSERT INTO projects (id, name, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(
      id, name, content || '', now, now
    ).run();

    return new Response(JSON.stringify({ success: true, projectId: id }), { status: 201, headers: jsonHeaders });
  }

  // ──────────────────────────────────────
  // PUT /api/projects/:id — Sauvegarder un projet
  // ──────────────────────────────────────
  if (projectMatch && request.method === 'PUT') {
    const projectId = projectMatch[1];
    const body = await request.json();
    const { name, content } = body;
    const now = Math.floor(Date.now() / 1000);

    const existing = await db.prepare('SELECT id FROM projects WHERE id = ?').bind(projectId).first();
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Projet non trouvé' }), { status: 404, headers: jsonHeaders });
    }

    if (name) {
      await db.prepare('UPDATE projects SET name = ?, updated_at = ? WHERE id = ?').bind(name, now, projectId).run();
    }
    if (content !== undefined) {
      await db.prepare('UPDATE projects SET content = ?, updated_at = ? WHERE id = ?').bind(content, now, projectId).run();
    }

    return new Response(JSON.stringify({ success: true, message: 'Projet sauvegardé' }), { headers: jsonHeaders });
  }

  // ──────────────────────────────────────
  // DELETE /api/projects/:id — Supprimer un projet
  // ──────────────────────────────────────
  if (projectMatch && request.method === 'DELETE') {
    const projectId = projectMatch[1];

    await db.prepare('DELETE FROM projects WHERE id = ?').bind(projectId).run();

    return new Response(JSON.stringify({ success: true, message: 'Projet supprimé' }), { headers: jsonHeaders });
  }

  return new Response(JSON.stringify({ error: 'Route non trouvée' }), { status: 404, headers: jsonHeaders });
}
