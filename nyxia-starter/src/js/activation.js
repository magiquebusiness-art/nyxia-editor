// ── État global ──────────────────────────────────────────
const state = {
  prenom: '',
  domaine: '',
  offre: '',
  cible: '',
  objectif: '',
  userId: null,
  livrables: null
}

// URL de ton Worker Cloudflare
const WORKER_URL = 'https://nyxia-starter-worker.TON-COMPTE.workers.dev'

// ── Navigation entre écrans ──────────────────────────────
function goTo(screenIndex) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
  document.getElementById('screen-' + screenIndex).classList.add('active')
  updateDots(screenIndex)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function updateDots(active) {
  document.querySelectorAll('.progress-dot').forEach((dot, i) => {
    dot.classList.remove('active', 'done')
    if (i < active) dot.classList.add('done')
    if (i === active) dot.classList.add('active')
  })
}

// ── Validation étape 1 ───────────────────────────────────
function validateStep1() {
  const prenom = document.getElementById('inputPrenom').value.trim()
  const domaine = document.getElementById('inputDomaine').value.trim()
  const offre = document.getElementById('inputOffre').value.trim()

  if (!prenom || !domaine || !offre) {
    showToast('Remplis tous les champs pour continuer ✦')
    return
  }

  state.prenom = prenom
  state.domaine = domaine
  state.offre = offre
  goTo(2)
}

// ── Sélection objectif (Q4) ──────────────────────────────
function selectObjectif(el, value) {
  document.querySelectorAll('.objectif-option').forEach(o => o.classList.remove('selected'))
  el.classList.add('selected')
  state.objectif = value

  const btn = document.getElementById('btnGenerate')
  btn.disabled = false
  btn.style.opacity = '1'
}

// ── Validation étape 2 + lancement génération ────────────
function validateStep2() {
  const cible = document.getElementById('inputCible').value.trim()

  if (!cible) {
    showToast('Décris ta clientèle idéale ✦')
    return
  }
  if (!state.objectif) {
    showToast('Choisis ton objectif principal ✦')
    return
  }

  state.cible = cible
  goTo(3)
  lancerGeneration()
}

// ── Animation de chargement séquentielle ─────────────────
const LOADING_STEPS = ['step-site', 'step-accroche', 'step-post', 'step-email', 'step-visuel']

function activerStep(id) {
  const el = document.getElementById(id)
  if (!el) return
  el.classList.add('active')
  el.querySelector('.step-status').innerHTML = `<span class="step-spinner"></span>`
}

function completerStep(id) {
  const el = document.getElementById(id)
  if (!el) return
  el.classList.remove('active')
  el.classList.add('done')
  el.querySelector('.step-status').innerHTML = `<span style="color:var(--green);font-size:16px;">✓</span>`
}

async function animerSteps(dureeMs) {
  const delai = dureeMs / LOADING_STEPS.length
  for (let i = 0; i < LOADING_STEPS.length; i++) {
    activerStep(LOADING_STEPS[i])
    await wait(delai * 0.6)
    completerStep(LOADING_STEPS[i])
    await wait(delai * 0.4)
  }
}

// ── Appel Worker + affichage résultats ───────────────────
async function lancerGeneration() {
  const startTime = Date.now()

  // Lancer l'animation ET l'appel API en parallèle
  const [_, response] = await Promise.all([
    animerSteps(6000), // animation sur 6 secondes
    fetch(`${WORKER_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prenom: state.prenom,
        domaine: state.domaine,
        offre: state.offre,
        cible: state.cible,
        objectif: state.objectif
      })
    })
  ])

  const data = await response.json()

  if (!data.success) {
    showToast('Une erreur est survenue. Réessaie.')
    goTo(2)
    return
  }

  state.userId = data.userId
  state.livrables = data.livrables

  afficherResultats()
  goTo(4)
}

// ── Affichage des livrables ───────────────────────────────
function afficherResultats() {
  const prenom = state.prenom
  const l = state.livrables

  document.getElementById('resultTitle').textContent = `${prenom}, ton univers est prêt.`
  document.getElementById('resultSub').textContent = `Ce n'est pas une démo. C'est vraiment à toi.`

  const container = document.getElementById('resultLivrables')
  container.innerHTML = ''

  const livrables = [
    { icon: '✍️', titre: 'Ton accroche', contenu: l.accroche },
    { icon: '🌐', titre: 'Ta page web', contenu: l.page },
    { icon: '📱', titre: 'Ton premier post', contenu: l.post },
    { icon: '📧', titre: 'Ton premier email', contenu: l.email },
  ]

  livrables.forEach((item, index) => {
    const div = document.createElement('div')
    div.className = 'result-livrable nx-fade-up'
    div.style.animationDelay = `${index * 0.1}s`
    div.innerHTML = `
      <div class="livrable-header">
        <span class="livrable-icon">${item.icon}</span>
        <span class="livrable-title">${item.titre}</span>
      </div>
      <div class="livrable-content">${item.contenu}</div>
      <div class="livrable-copy">
        <button class="nx-btn-sm" onclick="copier(this, \`${escapeBacktick(item.contenu)}\`)">
          Copier
        </button>
      </div>
    `
    container.appendChild(div)
  })
}

// ── Actions boutons résultat ─────────────────────────────
function voirSite() {
  // Redirige vers le sous-domaine généré
  const slug = state.prenom.toLowerCase().replace(/\s+/g, '-')
  window.open(`https://${slug}.nyxiapublicationweb.com`, '_blank')
}

function voirPlan() {
  // Redirige vers le plan de lancement avec userId
  window.location.href = `/plan?uid=${state.userId}`
}

// ── Copier dans le presse-papiers ────────────────────────
async function copier(btn, texte) {
  try {
    await navigator.clipboard.writeText(texte)
    btn.textContent = '✓ Copié !'
    btn.style.color = 'var(--green)'
    setTimeout(() => {
      btn.textContent = 'Copier'
      btn.style.color = ''
    }, 2000)
  } catch {
    showToast('Copie manuelle nécessaire')
  }
}

// ── Toast ─────────────────────────────────────────────────
function showToast(msg) {
  const existing = document.querySelector('.nx-toast')
  if (existing) existing.remove()

  const toast = document.createElement('div')
  toast.className = 'nx-toast'
  toast.textContent = msg
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 3000)
}

// ── Utils ─────────────────────────────────────────────────
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

function escapeBacktick(str) {
  return (str || '').replace(/`/g, '\\`').replace(/\$/g, '\\$')
}