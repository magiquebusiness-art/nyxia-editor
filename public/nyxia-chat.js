/**
 * ══════════════════════════════════════
 * NYXIA CHAT WIDGET — Identique partout
 * Auto-contenu : CSS + HTML + JS
 * ══════════════════════════════════════
 */
(function() {
    'use strict';

    // --- INJECTER LE CSS ---
    var styleId = 'nyxia-chat-styles';
    if (!document.getElementById(styleId)) {
        var css = document.createElement('style');
        css.id = styleId;
        css.textContent = `
            #nyxia-toggle {
                position: fixed; bottom: 24px; right: 24px; width: 60px; height: 60px;
                border-radius: 50%; background: linear-gradient(135deg, #7B5CFF, #9B7BFF);
                border: none; cursor: pointer; z-index: 99999;
                display: flex; align-items: center; justify-content: center;
                box-shadow: 0 4px 24px rgba(123,92,255,0.4);
                transition: transform 0.2s, box-shadow 0.2s;
            }
            #nyxia-toggle:hover { transform: scale(1.08); box-shadow: 0 6px 32px rgba(123,92,255,0.6); }
            #nyxia-toggle svg { width: 28px; height: 28px; fill: #fff; }
            #nyxia-toggle.active { background: linear-gradient(135deg, #FF4B6E, #FF1744); }

            #nyxia-chat {
                position: fixed; bottom: 100px; right: 24px;
                width: 400px; max-width: calc(100vw - 48px); height: 560px;
                background: #0B0D17; border: 1px solid rgba(123,92,255,0.15);
                border-radius: 20px; z-index: 99998;
                display: flex; flex-direction: column; overflow: hidden;
                box-shadow: 0 8px 48px rgba(0,0,0,0.5);
                transform: translateY(20px) scale(0.95); opacity: 0; pointer-events: none;
                transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s;
            }
            #nyxia-chat.open { transform: translateY(0) scale(1); opacity: 1; pointer-events: auto; }

            #nyxia-header {
                display: flex; align-items: center; gap: 10px;
                padding: 16px 18px; background: #13152A;
                border-bottom: 1px solid rgba(123,92,255,0.15);
            }
            #nyxia-header .nx-info { flex: 1; }
            #nyxia-header .nx-name { font-size: 15px; font-weight: 700; color: #fff; font-family: 'Outfit', sans-serif; }
            #nyxia-header .nx-status { font-size: 11px; color: #00E676; display: flex; align-items: center; gap: 4px; }
            #nyxia-header .nx-status::before { content: ''; width: 6px; height: 6px; background: #00E676; border-radius: 50%; display: inline-block; box-shadow: 0 0 8px #00E676; }

            #nyxia-close {
                background: none; border: 1px solid rgba(255,255,255,0.1);
                border-radius: 8px; width: 30px; height: 30px; cursor: pointer;
                color: #6B7094; font-size: 18px;
                display: flex; align-items: center; justify-content: center;
            }
            #nyxia-close:hover { background: rgba(255,255,255,0.05); color: #fff; }

            #nyxia-messages {
                flex: 1; overflow-y: auto; padding: 16px;
                display: flex; flex-direction: column; gap: 12px;
            }
            .nx-msg { display: flex; flex-direction: column; max-width: 85%; }
            .nx-msg.bot { align-self: flex-start; }
            .nx-msg.user { align-self: flex-end; }
            .nx-bubble { padding: 10px 14px; border-radius: 16px; font-size: 13.5px; line-height: 1.5; font-family: 'Outfit', sans-serif; }
            .nx-msg.bot .nx-bubble { background: #1A1D35; color: #C8CCF0; border-bottom-left-radius: 4px; }
            .nx-msg.user .nx-bubble { background: linear-gradient(135deg, #7B5CFF, #9B7BFF); color: #fff; border-bottom-right-radius: 4px; }

            #nyxia-input-area {
                padding: 12px 16px 16px; background: #13152A;
                border-top: 1px solid rgba(123,92,255,0.15);
            }
            #nyxia-input-row {
                display: flex; align-items: flex-end; gap: 8px;
                background: #1A1D35; border: 1px solid rgba(123,92,255,0.15);
                border-radius: 14px; padding: 6px 6px 6px 14px;
            }
            #nyxia-input {
                flex: 1; background: none; border: none; outline: none;
                color: #C8CCF0; font-size: 13.5px; font-family: 'Outfit', sans-serif;
                resize: none; max-height: 80px; line-height: 1.4;
            }
            #nyxia-input::placeholder { color: #6B7094; }
            #nyxia-send {
                width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
                background: linear-gradient(135deg, #7B5CFF, #9B7BFF);
                border: none; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                transition: transform 0.15s;
            }
            #nyxia-send:hover:not(:disabled) { transform: scale(1.06); }
            #nyxia-send:disabled { opacity: 0.4; cursor: not-allowed; }
            #nyxia-send svg { width: 18px; height: 18px; fill: #fff; }
            .nx-avatar { width: 36px; height: 36px; border-radius: 50%; overflow: hidden; flex-shrink: 0; }
            .nx-avatar img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
        `;
        document.head.appendChild(css);
    }

    // --- INJECTER LE HTML ---
    if (!document.getElementById('nyxia-toggle')) {
        var chatHTML = document.createElement('div');
        chatHTML.innerHTML = `
            <button id="nyxia-toggle" aria-label="Ouvrir l'assistant NyXia">
                <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
            </button>
            <div id="nyxia-chat">
                <div id="nyxia-header">
                    <div class="nx-avatar"><img src="/NyXia.png" alt="NyXia"></div>
                    <div class="nx-info">
                        <div class="nx-name">NyXia Assistant</div>
                        <div class="nx-status">En ligne</div>
                    </div>
                    <button id="nyxia-close" title="Fermer">&times;</button>
                </div>
                <div id="nyxia-messages">
                    <div class="nx-msg bot">
                        <div class="nx-bubble">Bonjour ! Je suis NyXia, votre assistante de creation web. Comment puis-je vous aider ?</div>
                    </div>
                </div>
                <div id="nyxia-input-area">
                    <div id="nyxia-input-row">
                        <textarea id="nyxia-input" rows="1" placeholder="Ecrivez votre message..."></textarea>
                        <button id="nyxia-send" disabled>
                            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(chatHTML);
    }

    // --- LOGIQUE ---
    var toggleBtn = document.getElementById('nyxia-toggle');
    var chatPanel = document.getElementById('nyxia-chat');
    var closeBtn = document.getElementById('nyxia-close');
    var input = document.getElementById('nyxia-input');
    var sendBtn = document.getElementById('nyxia-send');
    var messagesContainer = document.getElementById('nyxia-messages');

    function toggleChat() {
        chatPanel.classList.toggle('open');
        toggleBtn.classList.toggle('active');
        if (chatPanel.classList.contains('open')) {
            setTimeout(function() { input.focus(); }, 300);
        }
    }

    toggleBtn.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);

    // Auto-resize textarea
    input.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.value.trim().length > 0) {
            sendBtn.removeAttribute('disabled');
        } else {
            sendBtn.setAttribute('disabled', 'true');
        }
    });

    // Envoi avec Enter
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendBtn.addEventListener('click', sendMessage);

    function sendMessage() {
        var text = input.value.trim();
        if (!text) return;

        addMessage(text, 'user');
        input.value = '';
        input.style.height = 'auto';
        sendBtn.setAttribute('disabled', 'true');

        // Reponse bot simulee
        var responses = [
            "Je prends note de votre demande pour NyXia.",
            "Excellente question ! Laissez-moi verifier cela.",
            "Merci pour votre message. NyXia est la pour vous aider !",
            "Je comprends votre besoin. Je vais travailler dessus.",
            "Super ! N'hesitez pas si vous avez d'autres questions.",
            "NyXia Publication Web est la pour transformer vos idees en realite."
        ];

        setTimeout(function() {
            var response = responses[Math.floor(Math.random() * responses.length)];
            addMessage(response, 'bot');
        }, 800 + Math.random() * 1200);
    }

    function addMessage(text, type) {
        var msgDiv = document.createElement('div');
        msgDiv.className = 'nx-msg ' + type;

        var bubble = document.createElement('div');
        bubble.className = 'nx-bubble';
        bubble.textContent = text;

        msgDiv.appendChild(bubble);
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
})();
