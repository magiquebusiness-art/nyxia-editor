// ══════════════════════════════════════
// NYXIA LOGIN — Cloudflare Pages Function
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

function generateToken() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
    const { request, env } = context;
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return new Response(JSON.stringify({ success: false, error: 'Email et mot de passe requis.' }), {
                status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        // Chercher l'utilisateur dans D1
        const user = await env.DB.prepare(
            'SELECT id, email, firstname, password_hash, salt FROM users WHERE email = ?'
        ).bind(email.toLowerCase()).first();

        if (!user) {
            return new Response(JSON.stringify({ success: false, error: 'Identifiants incorrects.' }), {
                status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        // Vérifier le mot de passe avec PBKDF2
        const hash = await hashPassword(password, user.salt);

        if (hash !== user.password_hash) {
            return new Response(JSON.stringify({ success: false, error: 'Identifiants incorrects.' }), {
                status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        // Créer une session (token valide 24h)
        const token = generateToken();
        const expiresAt = Math.floor(Date.now() / 1000) + 86400; // 24 heures

        await env.DB.prepare(
            'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
        ).bind(token, user.id, expiresAt).run();

        // Supprimer les anciennes sessions expirées
        await env.DB.prepare(
            'DELETE FROM sessions WHERE expires_at < ?'
        ).bind(Math.floor(Date.now() / 1000)).run();

        return new Response(JSON.stringify({
            success: true,
            token: token,
            firstname: user.firstname || ''
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });

    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: 'Erreur serveur.' }), {
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
