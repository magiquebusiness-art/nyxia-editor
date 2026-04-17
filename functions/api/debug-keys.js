/**
 * DEBUG — Diagnostic des clés API
 * A SUPPRIMER après diagnostic !
 */
export async function onRequestGet(context) {
  const { env } = context;

  const results = {};

  // ── WAN_KEY ──
  const wanKey = env.WAN_KEY || env.WAN_API_KEY || env.DASHSCOPE_KEY || env.DASHSCOPE;
  if (wanKey) {
    results.wan = {
      found: true,
      prefix: wanKey.substring(0, 6) + '...' + wanKey.substring(wanKey.length - 4),
      length: wanKey.length,
      startsWithSk: wanKey.trim().startsWith('sk-'),
      hasSpaces: wanKey !== wanKey.trim(),
      hasQuotes: (wanKey.startsWith('"') && wanKey.endsWith('"')) || (wanKey.startsWith("'") && wanKey.endsWith("'"))
    };

    // Test appel DashScope
    try {
      const testResp = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + wanKey.trim(),
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable'
        },
        body: JSON.stringify({
          model: 'wanx2.1-t2i-turbo',
          input: { prompt: 'test' },
          parameters: { size: '1024*1024', n: 1 }
        })
      });
      results.wan.apiStatus = testResp.status;
      results.wan.apiStatusText = testResp.statusText;
      const errBody = await testResp.text();
      results.wan.apiResponse = errBody.substring(0, 500);
    } catch (e) {
      results.wan.apiError = e.message;
    }
  } else {
    results.wan = { found: false, hint: 'Secrets disponibles: ' + Object.keys(env).filter(k => k.toLowerCase().includes('wan') || k.toLowerCase().includes('dash')).join(', ') || 'aucun' };
  }

  // ── OPENROUTER_AI ──
  const orKey = env.OPENROUTER_AI || env.OPENROUTER_API_KEY || env.OPENROUTER_KEY || env.OPENROUTER;
  if (orKey) {
    results.openrouter = {
      found: true,
      prefix: orKey.substring(0, 8) + '...' + orKey.substring(orKey.length - 4),
      length: orKey.length,
      startsWithSk: orKey.trim().startsWith('sk-'),
      hasSpaces: orKey !== orKey.trim(),
      hasQuotes: (orKey.startsWith('"') && orKey.endsWith('"')) || (orKey.startsWith("'") && orKey.endsWith("'"))
    };

    try {
      const testResp = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': 'Bearer ' + orKey.trim() }
      });
      results.openrouter.apiStatus = testResp.status;
      results.openrouter.apiStatusText = testResp.statusText;
      const errBody = await testResp.text();
      results.openrouter.apiResponse = errBody.substring(0, 300);
    } catch (e) {
      results.openrouter.apiError = e.message;
    }
  } else {
    results.openrouter = { found: false };
  }

  // ── PEXELS_KEY ──
  const pxKey = env.PEXELS_KEY;
  if (pxKey) {
    results.pexels = {
      found: true,
      prefix: pxKey.substring(0, 6) + '...' + pxKey.substring(pxKey.length - 4),
      length: pxKey.length
    };
  } else {
    results.pexels = { found: false };
  }

  return Response.json(results);
}
