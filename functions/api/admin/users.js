// ══════════════════════════════════════
// NYXIA ADMIN — Gestion des utilisateurs
// Seul un superadmin peut acceder
// ══════════════════════════════════════

async function validateSession(token, env) {
    if (!token) return null;
    const session = await env.DB.prepare(
        'SELECT s.token, s.expires_at, u.id, u.email, u.firstname, u.lastname, u.is_admin FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ?'
    ).bind(token).first();
    if (!session) return null;
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at < now) {
        await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
        return null;
    }
    return session;
}

function extractToken(request, body) {
    const authHeader = request.headers.get('Authorization') || '';
    if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
    return body.token || null;
}

// ── LIST : Retourne tous les utilisateurs (sauf superadmin) ──
export async function onRequestPost({ env, request }) {
    try {
        const body = await request.json();
        const token = extractToken(request, body);
        const session = await validateSession(token, env);

        if (!session) {
            return new Response(JSON.stringify({ error: 'Non autorise.' }), {
                status: 401, headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!session.is_admin) {
            return new Response(JSON.stringify({ error: 'Acces refuse.' }), {
                status: 403, headers: { 'Content-Type': 'application/json' }
            });
        }

        const { results } = await env.DB.prepare(
            "SELECT id, email, firstname, lastname, address, access_projects, is_admin, created_at FROM users ORDER BY created_at DESC"
        ).all();

        // Ne pas renvoyer le superadmin dans la liste
        const clients = results.filter(u => !u.is_admin);

        return new Response(JSON.stringify({ users: clients }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}

// ── DELETE : Supprime un utilisateur ──
export async function onRequestDelete({ env, request }) {
    try {
        const body = await request.json();
        const token = extractToken(request, body);
        const session = await validateSession(token, env);

        if (!session) {
            return new Response(JSON.stringify({ error: 'Non autorise.' }), {
                status: 401, headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!session.is_admin) {
            return new Response(JSON.stringify({ error: 'Acces refuse.' }), {
                status: 403, headers: { 'Content-Type': 'application/json' }
            });
        }

        const { id } = body;
        if (!id) {
            return new Response(JSON.stringify({ error: 'ID requis.' }), { status: 400 });
        }

        // Empêcher de supprimer un superadmin
        const target = await env.DB.prepare('SELECT is_admin FROM users WHERE id = ?').bind(id).first();
        if (target && target.is_admin) {
            return new Response(JSON.stringify({ error: 'Impossible de supprimer un superadmin.' }), { status: 403 });
        }

        // Supprimer les sessions du user
        await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run();
        // Supprimer les projets du user
        await env.DB.prepare('DELETE FROM projects WHERE user_id = ?').bind(id).run();
        // Supprimer le user
        await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();

        return new Response(JSON.stringify({ success: true, message: 'Client supprime.' }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}

// OPTIONS pour CORS
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    });
}
