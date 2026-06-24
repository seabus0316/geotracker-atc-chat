// ==UserScript==
// @name         GeoFS ACARS Controller - Security Edition (Fast Load)
// @version      3.2
// @match        http://*.geo-fs.com/geofs.php*
// @match        https://*.geo-fs.com/geofs.php*
// @grant        none
// ==/UserScript==
(function () {
    'use strict';
    const CHAT_URL = "https://geofs-chat-app.vercel.app/";
    let isOpen   = false;
    let savedPos = JSON.parse(localStorage.getItem('geofs_chat_pos')) || { x: 20, y: 20 };
    let savedRoom = localStorage.getItem('geofs_chat_room_persistent') || "20013";

    // ── 快捷鍵設定（從 localStorage 讀取，預設 T）──
    let toggleKey = (localStorage.getItem('geofs_acars_hotkey') || 't').toLowerCase();

    function buildChatURL() {
        return `${CHAT_URL}?room=${encodeURIComponent(savedRoom)}&geofs_logged_in=false&geofs_callsign=`;
    }

    // ── 建立 UI 外殼 ──
    let container = document.createElement('div');
    container.style.cssText = [
        `position: fixed`,
        `bottom: ${savedPos.y}px`,
        `right: ${savedPos.x}px`,
        `width: 340px`,
        `height: 540px`,
        `z-index: 10001`,
        `border-radius: 10px`,
        `overflow: hidden`,
        `border: 1.5px solid #3a4a7a`,
        `background: #070b14`,
        `box-shadow: 0 8px 32px rgba(0,0,0,0.85), 0 0 0 1px rgba(58,74,122,0.25), 0 0 24px rgba(60,100,255,0.15)`,
        `display: none`,
    ].join('; ');

    let dragHandle = document.createElement('div');
    dragHandle.style.cssText = [
        `width: 100%`,
        `height: 30px`,
        `background: rgba(13,18,40,0.88)`,
        `cursor: move`,
        `display: flex`,
        `align-items: center`,
        `padding: 0 11px`,
        `font-size: 10px`,
        `color: #c8d8ff`,
        `font-family: 'Courier New', Courier, monospace`,
        `font-weight: bold`,
        `border-bottom: 1px solid rgba(58,74,122,0.6)`,
        `user-select: none`,
        `justify-content: flex-start`,
        `gap: 5px`,
        `letter-spacing: 0.5px`,
        `backdrop-filter: blur(4px)`,
    ].join('; ');

    let titleSpan = document.createElement('span');
    titleSpan.textContent = '> ACARS PANEL';
    titleSpan.style.cssText = 'flex-shrink: 0;';

    // ── 快捷鍵 badge（點擊進入綁定模式）──
    let keyBadge = document.createElement('span');
    keyBadge.title = '點擊以更換快捷鍵';
    keyBadge.style.cssText = [
        `font-size: 9px`,
        `color: #070b14`,
        `background: #c8d8ff`,
        `border-radius: 3px`,
        `padding: 1px 5px`,
        `cursor: pointer`,
        `letter-spacing: 0.5px`,
        `font-family: 'Courier New', monospace`,
        `flex-shrink: 0`,
        `transition: background 0.15s, color 0.15s`,
    ].join('; ');
    keyBadge.textContent = `[${toggleKey.toUpperCase()}]`;

    let geofsIndicator = document.createElement('span');
    geofsIndicator.style.cssText = [
        `font-size: 9px`,
        `color: #f5c842`,
        `letter-spacing: 0.5px`,
        `margin-left: auto`,
        `flex-shrink: 0`,
    ].join('; ');
    geofsIndicator.textContent = 'ACARS: READY';

    // ── 快捷鍵綁定模式 ──
    let isBindingKey = false;

    function enterBindMode() {
        isBindingKey = true;
        keyBadge.textContent = '[按下新按鍵]';
        keyBadge.style.background = '#f5c842';
        keyBadge.style.color = '#070b14';
        geofsIndicator.textContent = 'BINDING...';
    }

    function exitBindMode(newKey) {
        isBindingKey = false;
        toggleKey = newKey.toLowerCase();
        localStorage.setItem('geofs_acars_hotkey', toggleKey);
        // 顯示名稱：單字元直接大寫，多字元（如 F1、ArrowUp）原樣
        const displayName = newKey.length === 1 ? newKey.toUpperCase() : newKey;
        keyBadge.textContent = `[${displayName}]`;
        keyBadge.style.background = '#c8d8ff';
        keyBadge.style.color = '#070b14';
        geofsIndicator.textContent = 'ACARS: READY';
    }

    keyBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isBindingKey) enterBindMode();
    });

    // capture phase 確保比 GeoFS 快捷鍵系統優先攔截
    window.addEventListener('keydown', (e) => {
        if (!isBindingKey) return;
        if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return; // 忽略純修飾鍵
        e.stopImmediatePropagation();
        e.preventDefault();
        if (e.key === 'Escape') {
            // ESC = 取消，維持原本的鍵
            exitBindMode(toggleKey);
        } else {
            exitBindMode(e.key);
        }
    }, true);

    dragHandle.appendChild(titleSpan);
    dragHandle.appendChild(keyBadge);
    dragHandle.appendChild(geofsIndicator);
    container.appendChild(dragHandle);

    // ── 建立 Iframe ──
    let iframe = document.createElement('iframe');
    iframe.style.cssText = 'width: 100%; height: calc(100% - 30px); border: none;';
    iframe.allow = "popups";
    iframe.src = buildChatURL();
    container.appendChild(iframe);
    document.body.appendChild(container);

    // ── 建立底部欄按鈕（等 GeoFS UI 載入後插入）──
    const ACARS_ICON = 'https://cdn.phototourl.com/free/2026-06-23-8980ac3f-2fcb-4161-882b-af37cdba8503.png';

    function syncBtn() {
        const btn = document.getElementById('acars-toggle-btn');
        if (btn) btn.style.opacity = isOpen ? '1' : '0.45';
    }

    function togglePanel() {
        isOpen = !isOpen;
        container.style.display = isOpen ? 'block' : 'none';
        syncBtn();
    }

    function injectBottomButton() {
        const bottomBar = document.querySelector('.geofs-ui-bottom');
        if (!bottomBar) return false;

        const btn = document.createElement('button');
        btn.id    = 'acars-toggle-btn';
        btn.title = 'ACARS Panel';
        btn.className = 'mdl-button mdl-js-button geofs-f-standard-ui geofs-mediumScreenOnly';
        btn.setAttribute('data-tooltip-classname', 'mdl-tooltip--top');
        btn.setAttribute('data-upgraded', ',MaterialButton');
        btn.style.opacity = '0.45';

        const img = document.createElement('img');
        img.src    = ACARS_ICON;
        img.height = 30;
        img.style.cssText = 'display:block; pointer-events:none;';
        btn.appendChild(img);

        btn.addEventListener('click', togglePanel);

        const insertPos = (typeof geofs !== 'undefined' && geofs.version >= 3.6) ? 4 : 3;
        bottomBar.insertBefore(btn, bottomBar.children[insertPos] || null);
        return true;
    }

    const btnTimer = setInterval(() => {
        if (injectBottomButton()) clearInterval(btnTimer);
    }, 500);

    // ── 快捷鍵切換面板（使用者自訂按鍵）──
    window.addEventListener('keydown', (e) => {
        if (isBindingKey) return; // 綁定模式中不觸發切換
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.key.toLowerCase() === toggleKey) togglePanel();
    });

    // ── 拖曳面板邏輯 ──
    let isDragging = false;
    let dragStart  = { x: 0, y: 0 };

    dragHandle.addEventListener('mousedown', (e) => {
        if (e.target === keyBadge) return; // 點 badge 不觸發拖曳
        isDragging = true;
        dragStart.x = e.clientX + parseInt(container.style.right  || 0);
        dragStart.y = e.clientY + parseInt(container.style.bottom || 0);
        iframe.style.pointerEvents = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const newX = Math.max(0, dragStart.x - e.clientX);
        const newY = Math.max(0, dragStart.y - e.clientY);
        container.style.right  = newX + 'px';
        container.style.bottom = newY + 'px';
        localStorage.setItem('geofs_chat_pos', JSON.stringify({ x: newX, y: newY }));
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            iframe.style.pointerEvents = 'auto';
        }
    });
})();
