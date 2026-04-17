/**
 * NYXIA STARFIELD & CHAT LOGIC
 */
(function () {
  'use strict';

  // --- 1. ANIMATION ÉTOILÉE ---
  const canvas = document.getElementById('starry-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let stars = [];
    let shootingStars = [];
    
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    }

    function initStars() {
      stars = [];
      for (let i = 0; i < 300; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 1.2 + 0.2,
          alpha: Math.random(),
          velocity: Math.random() * 0.05 + 0.01
        });
      }
    }

    function createShootingStar() {
      shootingStars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * (canvas.height / 3),
        length: Math.random() * 100 + 50,
        speed: Math.random() * 10 + 5,
        angle: Math.PI / 4,
        life: 1.0
      });
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Étoiles fixes
      stars.forEach(star => {
        star.alpha += star.velocity;
        if (star.alpha > 1 || star.alpha < 0.2) star.velocity = -star.velocity;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 204, 240, ${star.alpha})`; // Couleur texte Nyxia
        ctx.fill();
      });

      // Étoiles filantes
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        const tailX = s.x - Math.cos(s.angle) * s.length;
        const tailY = s.y - Math.sin(s.angle) * s.length;

        const gradient = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
        gradient.addColorStop(0, 'rgba(123,92,255,0)');
        gradient.addColorStop(1, `rgba(123,92,255, ${s.life})`);

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(s.x, s.y);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();

        s.x += Math.cos(s.angle) * s.speed;
        s.y += Math.sin(s.angle) * s.speed;
        s.life -= 0.02;

        if (s.life <= 0) shootingStars.splice(i, 1);
      }

      requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    resize();
    animate();
    setInterval(createShootingStar, 2500);
  }

  // --- 2. LOGIQUE DU WIDGET CHAT ---
  const toggleBtn = document.getElementById('nyxia-toggle');
  const chatPanel = document.getElementById('nyxia-chat');
  const closeBtn = document.getElementById('nyxia-close');
  const input = document.getElementById('nyxia-input');
  const sendBtn = document.getElementById('nyxia-send');
  const messagesContainer = document.getElementById('nyxia-messages');

  function toggleChat() {
    chatPanel.classList.toggle('open');
    toggleBtn.classList.toggle('active');
    if (chatPanel.classList.contains('open')) {
      setTimeout(() => input.focus(), 300);
    }
  }

  toggleBtn.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);

  // Auto-resize textarea
  input.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    if(this.value.trim().length > 0) {
      sendBtn.removeAttribute('disabled');
    } else {
      sendBtn.setAttribute('disabled', 'true');
    }
  });

  // Envoi factice
  sendBtn.addEventListener('click', () => {
    const text = input.value.trim();
    if(!text) return;

    // Message utilisateur
    addMessage(text, 'user');
    input.value = '';
    input.style.height = 'auto';
    sendBtn.setAttribute('disabled', 'true');

    // Réponse bot simulée
    setTimeout(() => {
      addMessage("Je prends note de votre demande pour Nyxia Publication Web.", 'bot');
    }, 1000);
  });

  function addMessage(text, type) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `nx-msg ${type}`;
    
    const rowDiv = document.createElement('div');
    rowDiv.className = 'nx-msg-row';
    
    const bubble = document.createElement('div');
    bubble.className = 'nx-bubble';
    bubble.textContent = text;
    
    rowDiv.appendChild(bubble);
    msgDiv.appendChild(rowDiv);
    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

})();