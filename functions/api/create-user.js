// ══════════════════════════════════════
// NYXIA CREATE USER — Cloudflare Pages Function
// Pour creer un utilisateur initial
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

export async function onRequestPost(context) {
    const { request, env } = context;
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    try {
        const body = await request.json();
        const { email, password, firstname } = body;

        if (!email || !password) {
            return new Response(JSON.stringify({ success: false, error: 'Email et mot de passe requis.' }), {
                status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        // Vérifier si l'utilisateur existe déjà
        const existing = await env.DB.prepare(
            'SELECT id FROM users WHERE email = ?'
        ).bind(email.toLowerCase()).first();

        if (existing) {
            return new Response(JSON.stringify({ success: false, error: 'Cet email est deja utilise.' }), {
                status: 409, headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        // Générer un salt et hasher le mot de passe
        const saltBytes = crypto.getRandomValues(new Uint8Array(16));
        const salt = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
        const passwordHash = await hashPassword(password, salt);

        // Créer l'utilisateur
        const userId = 'user-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

        await env.DB.prepare(
            'INSERT INTO users (id, email, password_hash, salt, firstname, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(
            userId,
            email.toLowerCase(),
            passwordHash,
            salt,
            firstname || '',
            Math.floor(Date.now() / 1000)
        ).run();

        return new Response(JSON.stringify({
            success: true,
            message: 'Utilisateur cree avec succes !'
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
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
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
