// ══════════════════════════════════════════════════════════════
// NYXIA STARTER WORKER — Cloudflare Worker
// Route : POST /generate
// Stack : OpenRouter → Gemini Flash 1.5 (vision)
// ══════════════════════════════════════════════════════════════

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'google/gemini-flash-1.5'

// ── CORS headers ──────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// ── Handler principal ─────────────────────────────────────────
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS })
    }

    if (request.method !== 'POST') {
      return json({ success: false, error: 'Method not allowed' }, 405)
    }

    const url = new URL(request.url)

    if (url.pathname === '/generate') {
      return handleGenerate(request, env)
    }

    return json({ success: false, error: 'Not found' }, 404)
  }
}

// ── /generate ─────────────────────────────────────────────────
async function handleGenerate(request, env) {
  let body
  try {
    body = await request.json()
  } catch {
    return json({ success: false, error: 'JSON invalide' }, 400)
  }

  const { prenom, domaine, offre, cible, objectif, imageBase64 } = body

  if (!prenom || !domaine || !offre || !cible || !objectif) {
    return json({ success: false, error: 'Champs manquants' }, 400)
  }

  // ── Construire le message pour Gemini ────────────────────────
  const userContent = []

  if (imageBase64) {
    userContent.push({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
    })
    userContent.push({
      type: 'text',
      text: buildPrompt({ prenom, domaine, offre, cible, objectif, hasImage: true })
    })
  } else {
    userContent.push({
      type: 'text',
      text: buildPrompt({ prenom, domaine, offre, cible, objectif, hasImage: false })
    })
  }

  // ── Appel OpenRouter ─────────────────────────────────────────
  // La clé est lue depuis les Secrets du Worker (Settings → Variables → Secret)
  // Elle n'est jamais écrite en dur dans le code
  let aiResponse
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nyxiapublicationweb.com',
        'X-Title': 'NyXia Starter'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: userContent   }
        ],
        temperature: 0.85,
        max_tokens: 6000
      })
    })

    const aiData = await res.json()
    aiResponse = aiData.choices?.[0]?.message?.content

    if (!aiResponse) throw new Error('Réponse IA vide')
  } catch (err) {
    return json({ success: false, error: `Erreur IA : ${err.message}` }, 500)
  }

  // ── Parser la réponse JSON de Gemini ─────────────────────────
  let parsed
  try {
    const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)```/) ||
                      aiResponse.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch?.[1] || jsonMatch?.[0] || aiResponse
    parsed = JSON.parse(jsonStr.trim())
  } catch {
    return json({ success: false, error: 'Impossible de parser la réponse IA' }, 500)
  }

  // ── Générer un slug unique ────────────────────────────────────
  const slug = prenom.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

  const userId = crypto.randomUUID()

  // ── Sauvegarder le site HTML dans KV ─────────────────────────
  if (env.NYXIA_KV && parsed.siteHtml) {
    await env.NYXIA_KV.put(`site:${slug}`, parsed.siteHtml, {
      expirationTtl: 60 * 60 * 24 * 7 // 7 jours
    })
  }

  return json({
    success: true,
    userId,
    slug,
    livrables: {
      accroche: parsed.accroche || '',
      page:     parsed.page     || '',
      post:     parsed.post     || '',
      email:    parsed.email    || '',
      siteUrl:  `https://nyxiapublicationweb.com/s/${slug}`
    }
  })
}

// ── Prompt système ────────────────────────────────────────────
const SYSTEM_PROMPT = `Tu es NyXia, une IA de création web.
Tu génères des sites web visuellement spectaculaires avec un style "Dark UI glassmorphism neon".
Tu réponds TOUJOURS en JSON valide uniquement, sans texte avant ou après.
Tu utilises obligatoirement les effets NyXia dans tout site que tu génères.`

// ── Prompt utilisateur ────────────────────────────────────────
function buildPrompt({ prenom, domaine, offre, cible, objectif, hasImage }) {
  const imageInstruction = hasImage
    ? `Une image a été fournie. Analyse ses couleurs dominantes et utilise-les comme palette principale du site. Si aucune couleur claire, utilise le violet NyXia (#7B5CFF).`
    : `Utilise la palette NyXia par défaut : violet #7B5CFF, fond #0a0a0f, accents cyan #00f0ff.`

  return `
Génère un site web complet pour ce client :

Prénom   : ${prenom}
Domaine  : ${domaine}
Offre    : ${offre}
Cible    : ${cible}
Objectif : ${objectif}

${imageInstruction}

Le site HTML doit :
- Être un fichier HTML complet autonome (inline CSS + JS, aucune dépendance externe sauf Google Fonts)
- Utiliser OBLIGATOIREMENT ces effets NyXia en CSS :

  @keyframes nx-float {
    0%, 100% { transform: translateY(0px);   box-shadow: 0 8px  32px rgba(123,92,255,0.3); }
    50%       { transform: translateY(-12px); box-shadow: 0 20px 48px rgba(123,92,255,0.6); }
  }

  @keyframes nx-breathe {
    0%, 100% { box-shadow: 0 0 24px rgba(123,92,255,0.4), 0 0 48px rgba(123,92,255,0.2); }
    50%       { box-shadow: 0 0 48px rgba(123,92,255,0.8), 0 0 96px rgba(123,92,255,0.4); }
  }

  .nx-glass {
    background: rgba(255,255,255,0.05);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px;
  }

  @keyframes nx-fade-up {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0);    }
  }

  .nx-ambient {
    background:
      radial-gradient(ellipse at 30% 50%, rgba(123,92,255,0.15) 0%, transparent 60%),
      radial-gradient(ellipse at 70% 80%, rgba(0,240,255,0.08)  0%, transparent 50%);
  }

  .nx-btn {
    box-shadow: 0 0 24px rgba(123,92,255,0.4);
    transition: box-shadow 0.3s ease;
  }
  .nx-btn:hover {
    box-shadow: 0 0 48px rgba(123,92,255,0.8);
  }

- Style global : Dark UI + glassmorphism + neon accents sur fond spatial (#0a0a0f)
- Police : 'Space Grotesk' via Google Fonts
- Sections : Hero accrocheur / Offre / Cible / CTA
- Textes personnalisés pour ${prenom} dans le domaine "${domaine}"
- Visuellement spectaculaire, effet WOW immédiat

Retourne UNIQUEMENT ce JSON (rien d'autre) :
{
  "accroche":  "accroche courte et percutante pour ${prenom}",
  "page":      "description en 2-3 phrases de la page web générée",
  "post":      "premier post LinkedIn ou Instagram prêt à publier",
  "email":     "premier email de bienvenue à envoyer à la cible",
  "siteHtml":  "<!DOCTYPE html>...code HTML complet du site..."
}
`
}

// ── Helper JSON response ──────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  })
}