/**
 * API CHAT NYXIA - Proxy OpenRouter
 * Modele: z-ai/glm-5v-turbo (streaming)
 * Support: messages[] + agent (persona)
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  // Support multiple secret name variations
  const OPENROUTER_API_KEY = env.OPENROUTER_AI || env.OPENROUTER_API_KEY || env.OPENROUTER_KEY || env.OPENROUTER;

  if (!OPENROUTER_API_KEY) {
    return new Response(JSON.stringify({
      error: 'Cle API OpenRouter non configuree.',
      hint: 'Secrets disponibles: ' + Object.keys(env || {}).filter(k => k.toLowerCase().includes('open') || k.toLowerCase().includes('router')).join(', ') || 'aucun'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { messages, agent } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Agent personas
    const agents = {
      default: `Tu es NyXia, l'assistante IA intelligente de Nyxia Publication Web. Tu es une experte creative en developpement web, design, et technologie. Tu aides les utilisateurs a creer des sites web magnifiques et fonctionnels. Tu es toujours amicale, professionnelle et passionnee. Tu reponds principalement en francais. Tu peux discuter de tout : code HTML/CSS/JS, design UX/UI, marketing digital, business en ligne, referencement, et bien plus encore. Tu utilises un style moderne et engageant. Quand tu donnes du code, utilise des blocs de code clairs.`,
      webdesign: `Tu es NyXia, specialiste en design web. Tu es experte en UI/UX, typography, color theory, layout design, et web trends. Tu aides a creer des interfaces modernes, elegantes et accessibles. Tu donnes des conseils sur les palettes de couleurs, les polices, les espacements, les animations CSS, et les bonnes pratiques de design responsive. Tu reponds en francais avec un style creatif et inspirant.`,
      seo: `Tu es NyXia, experte en referencement (SEO) et marketing digital. Tu aides a optimiser le positionnement sur Google, la structure des pages, les meta tags, le contenu, les backlinks, la vitesse de chargement, et l'experience utilisateur. Tu connais les dernieres mises a jour des algorithmes Google et les bonnes pratiques SEO. Tu reponds en francais avec des conseils pratiques et actionnables.`,
      code: `Tu es NyXia, experte en developpement web full-stack. Tu maitrises HTML5, CSS3, JavaScript (ES6+), React, Vue, Node.js, PHP, Python, SQL, Git, et les API REST. Tu ecris du code propre, optimise et bien commente. Quand tu donnes du code, utilise toujours des blocs de code avec le langage specifie. Tu expliques chaque partie du code et proposes des ameliorations. Tu reponds en francais.`
    };

    const systemMsg = {
      role: 'system',
      content: agents[agent] || agents.default
    };

    const allMessages = [systemMsg, ...messages];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + OPENROUTER_API_KEY,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nyxiaediteur.travail-pour-toi.com/',
        'X-Title': 'Nyxia Publication Web'
      },
      body: JSON.stringify({
        model: 'z-ai/glm-5v-turbo',
        messages: allMessages,
        stream: true,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter error:', response.status, errText);
      return new Response(JSON.stringify({
        error: 'Erreur API OpenRouter (' + response.status + '): ' + (errText || 'Inconnu')
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Forward the SSE stream directly
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (e) {
    console.error('Chat error:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
