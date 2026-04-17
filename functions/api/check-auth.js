// ══════════════════════════════════════
// NYXIA CHECK AUTH — Cloudflare Pages Function
// ══════════════════════════════════════

export async function onRequestPost(context) {
    const { request, env } = context;
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    try {
        const body = await request.json();
        const { token } = body;

        if (!token) {
            return new Response(JSON.stringify({ valid: false }), {
                status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        // Vérifier le token dans la base
        const session = await env.DB.prepare(
            'SELECT s.token, s.expires_at, u.id, u.email, u.firstname FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ?'
        ).bind(token).first();

        if (!session) {
            return new Response(JSON.stringify({ valid: false }), {
                status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        // Vérifier si le token n'est pas expiré
        const now = Math.floor(Date.now() / 1000);
        if (session.expires_at < now) {
            // Supprimer la session expirée
            await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
            return new Response(JSON.stringify({ valid: false }), {
                status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        return new Response(JSON.stringify({
            valid: true,
            firstname: session.firstname || ''
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });

    } catch (err) {
        return new Response(JSON.stringify({ valid: false }), {
            status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
