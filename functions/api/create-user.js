// ══════════════════════════════════════
// NYXIA CREATE USER — Cloudflare Pages Function
// - Si aucun user existe : permet de créer le premier superadmin
// - Sinon : seul un superadmin peut créer des utilisateurs
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
        const { email, password, firstname, lastname, address, access_projects } = body;

        if (!email || !password) {
            return new Response(JSON.stringify({ success: false, error: 'Email et mot de passe requis.' }), {
                status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        if (password.length < 6) {
            return new Response(JSON.stringify({ success: false, error: 'Le mot de passe doit avoir au moins 6 caracteres.' }), {
                status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        // ═══ PREMIER UTILISATEUR = SUPERADMIN ═══
        const userCount = await env.DB.prepare('SELECT COUNT(*) as cnt FROM users').first();

        if (userCount.cnt === 0) {
            const saltBytes = crypto.getRandomValues(new Uint8Array(16));
            const salt = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
            const passwordHash = await hashPassword(password, salt);
            const userId = 'user-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

            await env.DB.prepare(
                'INSERT INTO users (id, email, password_hash, salt, firstname, lastname, address, access_projects, is_admin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)'
            ).bind(
                userId,
                email.toLowerCase(),
                passwordHash,
                salt,
                firstname || 'Superadmin',
                lastname || '',
                address || '',
                access_projects || '["editeur","marketplace"]',
                Math.floor(Date.now() / 1000)
            ).run();

            return new Response(JSON.stringify({
                success: true,
                message: 'Superadmin cree avec succes !'
            }), {
                status: 201, headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        // ═══ SINON : VÉRIFICATION SUPERADMIN ═══
        const token = extractToken(request, body);
        const session = await validateSession(token, env);

        if (!session) {
            return new Response(JSON.stringify({ success: false, error: 'Non autorise.' }), {
                status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        if (!session.is_admin) {
            return new Response(JSON.stringify({ success: false, error: 'Acces refuse.' }), {
                status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        // Vérifier doublon email
        const existing = await env.DB.prepare(
            'SELECT id FROM users WHERE email = ?'
        ).bind(email.toLowerCase()).first();

        if (existing) {
            return new Response(JSON.stringify({ success: false, error: 'Cet email est deja utilise.' }), {
                status: 409, headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        // Créer le client
        const saltBytes = crypto.getRandomValues(new Uint8Array(16));
        const salt = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
        const passwordHash = await hashPassword(password, salt);
        const userId = 'user-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

        await env.DB.prepare(
            'INSERT INTO users (id, email, password_hash, salt, firstname, lastname, address, access_projects, is_admin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)'
        ).bind(
            userId,
            email.toLowerCase(),
            passwordHash,
            salt,
            firstname || '',
            lastname || '',
            address || '',
            access_projects || '[]',
            Math.floor(Date.now() / 1000)
        ).run();

        return new Response(JSON.stringify({
            success: true,
            message: 'Client inscrit avec succes !'
        }), {
            status: 201, headers: { 'Content-Type': 'application/json', ...corsHeaders }
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
