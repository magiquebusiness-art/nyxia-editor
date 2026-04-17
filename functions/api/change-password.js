// ══════════════════════════════════════
// NYXIA CHANGE PASSWORD — Cloudflare Pages Function
// Permet a un utilisateur de changer son propre mot de passe
// ══════════════════════════════════════

async function hashPassword(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: encoder.encode(salt),
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        256
    );
    return Array.from(new Uint8Array(bits))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

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

export async function onRequestPost(context) {
    const { request, env } = context;
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    try {
        const body = await request.json();
        const { current_password, new_password, confirm_password } = body;

        // Verifier session
        const token = extractToken(request, body);
        const session = await validateSession(token, env);

        if (!session) {
            return new Response(JSON.stringify({ success: false, error: 'Non autorise.' }), {
                status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        // Validations
        if (!current_password || !new_password || !confirm_password) {
            return new Response(JSON.stringify({ success: false, error: 'Tous les champs sont requis.' }), {
                status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        if (new_password.length < 6) {
            return new Response(JSON.stringify({ success: false, error: 'Le nouveau mot de passe doit avoir au moins 6 caracteres.' }), {
                status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        if (new_password !== confirm_password) {
            return new Response(JSON.stringify({ success: false, error: 'Les mots de passe ne correspondent pas.' }), {
                status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        // Recuperer l'utilisateur avec le salt et hash actuels
        const user = await env.DB.prepare(
            'SELECT id, password_hash, salt FROM users WHERE id = ?'
        ).bind(session.id).first();

        if (!user) {
            return new Response(JSON.stringify({ success: false, error: 'Utilisateur introuvable.' }), {
                status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        // Verifier l'ancien mot de passe
        const currentHash = await hashPassword(current_password, user.salt);
        if (currentHash !== user.password_hash) {
            return new Response(JSON.stringify({ success: false, error: 'Mot de passe actuel incorrect.' }), {
                status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        // Generer nouveau salt et hash
        const newSaltBytes = crypto.getRandomValues(new Uint8Array(16));
        const newSalt = Array.from(newSaltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
        const newHash = await hashPassword(new_password, newSalt);

        // Mettre a jour en base
        await env.DB.prepare(
            'UPDATE users SET password_hash = ?, salt = ? WHERE id = ?'
        ).bind(newHash, newSalt, session.id).run();

        return new Response(JSON.stringify({
            success: true,
            message: 'Mot de passe modifie avec succes !'
        }), {
            status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });

    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: 'Erreur serveur: ' + err.message }), {
            status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    });
}
