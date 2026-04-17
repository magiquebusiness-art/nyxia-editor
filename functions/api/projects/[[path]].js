// functions/api/projects/[[path]].js
// ══════════════════════════════════════
// NYXIA PROJECTS API — PROTÉGÉ PAR LOGIN
// ══════════════════════════════════════

// Vérifie un token de session
async function validateSession(token, env) {
    if (!token) return null;
    const session = await env.DB.prepare(
        'SELECT s.token, s.expires_at, u.id, u.email, u.firstname FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ?'
    ).bind(token).first();
    if (!session) return null;
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at < now) {
        await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
        return null;
    }
    return session;
}

// Extrait le token depuis le header Authorization ou le body
function extractToken(request, body) {
    const authHeader = request.headers.get('Authorization') || '';
    if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
    return body.token || null;
}

export async function onRequestPost({ env, request }) {
    const url = new URL(request.url);
    const action = url.pathname.split('/').pop();

    try {
        const body = await request.json();
        const token = extractToken(request, body);

        // ═══ VÉRIFICATION AUTH ═══
        const session = await validateSession(token, env);
        if (!session) {
            return new Response(JSON.stringify({ error: "Non autorisé. Connecte-toi d'abord." }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        // ═══ SAVE ═══
        if (action === 'save') {
            const { id, name, content } = body;
            const now = Date.now();

            const stmt = env.DB.prepare(`
                INSERT INTO projects (id, name, content, updated_at, user_id)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET content = ?, updated_at = ?, name = ?
            `);

            await stmt.bind(id, name, content, now, session.id, content, now, name).run();

            return new Response(JSON.stringify({ success: true, message: "Projet sauvegardé !" }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        // ═══ LOAD ═══
        if (action === 'load') {
            const { id } = body;
            const { results } = await env.DB.prepare("SELECT * FROM projects WHERE id = ? AND user_id = ?").bind(id, session.id).all();

            if (results.length === 0) {
                return new Response(JSON.stringify({ error: "Projet non trouvé" }), { status: 404 });
            }

            return new Response(JSON.stringify({ success: true, ...results[0] }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        // ═══ LIST ═══
        if (action === 'list') {
            const { results } = await env.DB.prepare("SELECT id, name, content, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC").bind(session.id).all();
            return new Response(JSON.stringify(results), {
                headers: { "Content-Type": "application/json" }
            });
        }

        // ═══ DELETE ═══
        if (action === 'delete') {
            const { id } = body;
            await env.DB.prepare("DELETE FROM projects WHERE id = ? AND user_id = ?").bind(id, session.id).run();
            return new Response(JSON.stringify({ success: true, message: "Projet supprimé" }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        return new Response(JSON.stringify({ error: "Action inconnue" }), { status: 400 });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
