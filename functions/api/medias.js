/**
 * API MEDIAS - Proxy Pexels (Images + Videos)
 * Support: ?type=image|video&query=...&page=...&per_page=...
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const PEXELS_KEY = env.PEXELS_KEY;

  if (!PEXELS_KEY) {
    return new Response(JSON.stringify({ error: 'Cle Pexels non configuree. Ajoutez PEXELS_KEY dans les secrets Cloudflare.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'image';
    const query = url.searchParams.get('query') || 'nature';
    const page = url.searchParams.get('page') || '1';
    const perPage = Math.min(parseInt(url.searchParams.get('per_page') || '20'), 80);

    let apiUrl, pexelsResponse;

    if (type === 'video') {
      apiUrl = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&size=medium`;
    } else {
      apiUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;
    }

    pexelsResponse = await fetch(apiUrl, {
      headers: { 'Authorization': PEXELS_KEY }
    });

    if (!pexelsResponse.ok) {
      const errText = await pexelsResponse.text();
      console.error('Pexels error:', pexelsResponse.status, errText);
      return new Response(JSON.stringify({
        error: 'Erreur API Pexels: ' + pexelsResponse.status + ' - ' + errText
      }), {
        status: pexelsResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await pexelsResponse.json();
    return Response.json(data);
  } catch (e) {
    console.error('Medias error:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
