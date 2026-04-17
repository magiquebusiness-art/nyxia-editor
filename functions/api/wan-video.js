/**
 * ══════════════════════════════════════════
 * API WAN — Text-to-Image & Text-to-Video
 * Modèles Wan (DashScope)
 * ══════════════════════════════════════════
 */

// POST: Créer une tâche (image ou vidéo)
export async function onRequestPost(context) {
  const { request, env } = context;
  // Support multiple secret name variations
  const WAN_API_KEY = env.WAN_KEY || env.WAN_API_KEY || env.DASHSCOPE_KEY || env.DASHSCOPE;

  if (!WAN_API_KEY) {
    return new Response(JSON.stringify({ 
      error: 'Cle Wan non configuree.',
      hint: 'Secrets disponibles: ' + Object.keys(env || {}).filter(k => k.toLowerCase().includes('wan') || k.toLowerCase().includes('dash')).join(', ') || 'aucun'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { prompt, type } = body;

    if (!prompt || !prompt.trim()) {
      return new Response(JSON.stringify({ error: 'Prompt requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const headers = {
      'Authorization': 'Bearer ' + WAN_API_KEY,
      'Content-Type': 'application/json'
    };

    // ── Text-to-Image (asynchrone — compatible toutes régions) ──
    if (type === 'image') {
      headers['X-DashScope-Async'] = 'enable';

      const response = await fetch(
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: 'wanx2.1-t2i-turbo',
            input: { prompt: prompt.trim() },
            parameters: { size: '1024*1024', n: 1 }
          })
        }
      );

      if (!response.ok) {
        const err = await response.text();
        console.error('Wan Image error:', response.status, err);
        let errMsg = 'Erreur Wan Image: ' + response.status;
        try {
          const errJson = JSON.parse(err);
          errMsg += ' — ' + (errJson.message || errJson.code || err);
        } catch(e) {}
        return new Response(JSON.stringify({
          error: errMsg
        }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const data = await response.json();
      return Response.json({
        task_id: data.output?.task_id,
        status: data.output?.task_status || 'PENDING',
        type: 'image'
      });
    }

    // ── Text-to-Video (asynchrone) ──
    if (type === 'video') {
      headers['X-DashScope-Async'] = 'enable';

      const response = await fetch(
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/generations',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: 'wan2.1-t2v-plus',
            input: { prompt: prompt.trim() }
          })
        }
      );

      if (!response.ok) {
        const err = await response.text();
        console.error('Wan Video error:', response.status, err);
        let errMsg = 'Erreur Wan Video: ' + response.status;
        try {
          const errJson = JSON.parse(err);
          errMsg += ' — ' + (errJson.message || errJson.code || err);
        } catch(e) {}
        return new Response(JSON.stringify({
          error: errMsg
        }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const data = await response.json();
      return Response.json({
        task_id: data.output?.task_id,
        status: data.output?.task_status || 'PENDING',
        type: 'video'
      });
    }

    return new Response(JSON.stringify({
      error: 'Type non supporté. Utilisez "image" ou "video".'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('Wan error:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// GET: Vérifier le statut d'une tâche (polling)
// Accepte ?task_id= ou ?taskId=
export async function onRequestGet(context) {
  const { request, env } = context;
  const WAN_API_KEY = env.WAN_KEY || env.WAN_API_KEY || env.DASHSCOPE_KEY || env.DASHSCOPE;

  if (!WAN_API_KEY) {
    return new Response(JSON.stringify({ error: 'Cle Wan non configuree.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = new URL(request.url);
    // Accepter les deux formats : task_id et taskId
    const taskId = url.searchParams.get('task_id') || url.searchParams.get('taskId');

    if (!taskId) {
      return new Response(JSON.stringify({ error: 'task_id requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const response = await fetch(
      `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
      {
        headers: { 'Authorization': 'Bearer ' + WAN_API_KEY }
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('Wan poll error:', response.status, err);
      return new Response(JSON.stringify({
        error: 'Erreur polling Wan: ' + response.status
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const output = data.output || {};

    // Transformer la réponse DashScope pour le client
    // DashScope: task_status = PENDING / RUNNING / SUCCEEDED / FAILED / CANCELED
    // Client attend: status = pending / running / completed / failed
    const statusMap = {
      'PENDING': 'pending',
      'RUNNING': 'running',
      'SUCCEEDED': 'completed',
      'FAILED': 'failed',
      'CANCELED': 'failed'
    };

    const mappedStatus = statusMap[output.task_status] || 'pending';
    const results = output.results || [];
    const resultUrl = results.length > 0 ? (results[0].url || results[0].b64_image) : null;

    return Response.json({
      task_id: output.task_id,
      status: mappedStatus,
      url: resultUrl || null,
      progress: output.task_status === 'RUNNING' ? 'Generation en cours...' : null
    });
  } catch (e) {
    console.error('Wan poll error:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
