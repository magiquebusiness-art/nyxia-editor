// functions/api/projects/[[path]].js


export async function onRequestPost({ env, request }) {
  const url = new URL(request.url);
  const action = url.pathname.split('/').pop(); // save, load, list, delete
 
  try {
    const body = await request.json();


    if (action === 'save') {
      const { id, name, content } = body;
      const now = Date.now();
     
      // Upsert (Insert or Update)
      const stmt = env.DB.prepare(`
        INSERT INTO projects (id, name, content, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET content = ?, updated_at = ?, name = ?
      `);
     
      await stmt.bind(id, name, content, now, content, now, name).run();
     
      return new Response(JSON.stringify({ success: true, message: "Projet sauvegardé !" }), {
        headers: { "Content-Type": "application/json" }
      });
    }


    if (action === 'load') {
      const { id } = body;
      const { results } = await env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(id).all();
     
      if (results.length === 0) {
        return new Response(JSON.stringify({ error: "Projet non trouvé" }), { status: 404 });
      }
     
      return new Response(JSON.stringify(results[0]), {
        headers: { "Content-Type": "application/json" }
      });
    }
   
    if (action === 'list') {
      const { results } = await env.DB.prepare("SELECT id, name, updated_at FROM projects ORDER BY updated_at DESC").all();
      return new Response(JSON.stringify(results), {
        headers: { "Content-Type": "application/json" }
      });
    }


    return new Response(JSON.stringify({ error: "Action inconnue" }), { status: 400 });


  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
