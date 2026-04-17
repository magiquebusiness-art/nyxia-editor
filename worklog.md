# ═══════════════════════════════════════════════════════════
# WORKLOG — NyXia Editor (nyxiaediteur.travail-pour-toi.com)
# ═══════════════════════════════════════════════════════════

## ARCHITECTURE DE RÉFÉRENCE (fichiers de Diane)

### Pages front-end (pages INDIVIDUELLES) :
- `dashboard.html` → Devient `index.html` — Dashboard principal avec header + sidebar + panels + iframes
- `wan-image.html` — Page individuelle Images IA (appel `/api/wan-image`)
- `wan-video.html` — Page individuelle Vidéo IA (appel `/api/wan-video` + `/api/wan-video/status`)
- `medias.html` — Page individuelle Médias (appel `/api/image` + `/api/video`)
- `editor.html` — Éditeur existant
- `generatorsiteweb.html` — Générateur de sites (iframe dans dashboard)

### Modèles WAN (LES BONS — à utiliser tels quels) :
**Images IA :**
- `wan2.7-image-pro` — NyXia Pro (4K)
- `wan2.7-image` — NyXia Rapide (2K)

**Vidéo IA T2V :**
- `wan2.7-t2v` — NyXia 2.7 (dernier)
- `wan2.6-t2v` — NyXia 2.6 (HD)
- `wan2.5-t2v-preview` — NyXia 2.5 (audio sync)

**Vidéo IA I2V :**
- `wan2.6-i2v-flash` — NyXia I2V Rapide
- `wan2.6-i2v` — NyXia I2V HD

### Endpoints API attendus par les pages :
- `POST /api/check-auth` — Vérification session ✅ (existe)
- `POST /api/chat` — Chat avec `{ message, history, userName, agent, attachment }` — Réponse : `{ content: "..." }` (NON streaming!)
- `POST /api/image` — Pexels Photos → base64 `{ prompt, width, height }` → `{ success, dataUrl, photographer, pexelsUrl }`
- `POST /api/video` — Pexels Videos → URLs `{ prompt }` → `{ success, videoUrl, previewUrl, thumbnail, width, height, duration, photographer, pexelsUrl }`
- `POST /api/wan-image` — Génération Images IA `{ prompt, model, size, n }` → `{ success, images: [url...] }`
- `POST /api/wan-video` — Génération Vidéo IA `{ prompt, model, resolution, duration, mode, image_base64? }` → `{ success, taskId }`
- `POST /api/wan-video/status` — Polling vidéo `{ taskId }` → `{ success, status, videoUrl?, errorMsg? }`
- `POST /api/login` — Authentification ✅ (existe, D1)
- `POST /api/logout` — Déconnexion
- Routes admin ✅ (existent)

### Variables CSS (design commun) :
--bg1: #0F1C3F; --bg2: #1A2554; --bg3: #2A3A6E;
--p: #7B5CFF; --p2: #5A6CFF; --p3: #4FA3FF;
--t: #FFFFFF; --t2: #D6D9F0; --t3: #8891B8;
--green: #00E676; --gold: #F4C842;

### Fichiers assets requis :
- `/NyXiaVoix-RobotParfait1.mp3` — Voix de NyXia (audio welcome)
- `/NyXia.png` — Logo
- `/FavIcon.png` — Favicon
- `/js/starry-bg.js` — Fond étoilé animé

### Cloudflare config :
- Domaine : nyxiaediteur.travail-pour-toi.com
- D1 DB : nyxia-db (5c668909-2308-43f5-a3b0-a1e1d3036b48)
- API Token : [CONFIGURED IN CLOUDflare DASHBOARD]
- Secrets configurés : WAN_KEY, OPENROUTER_AI, PEXELS_KEY, GROQ_IA, RESSEND_KEY

---
