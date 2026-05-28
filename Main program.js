// ==UserScript==
// @name         GeoFS ACARS Controller - Security Edition
// @version      3.1
// @match        http://*.geo-fs.com/geofs.php*
// @match        https://*.geo-fs.com/geofs.php*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const CHAT_URL = "https://geofs-chat-app.vercel.app/";  
    let isOpen   = true;
    let savedPos = JSON.parse(localStorage.getItem('geofs_chat_pos')) || { x: 20, y: 20 };
    let savedRoom = localStorage.getItem('geofs_chat_room_persistent') || "20013";

    let geofsLoggedIn = false;
    let realCallsign  = "";

function detectGeoFSLogin() {
    try {
        const g = window.geofs || (typeof geofs !== 'undefined' ? geofs : null);
        if (!g || !g.userRecord) return false;

        const rec = g.userRecord;
        
        
        if (typeof rec.id === 'number' && rec.id > 0) {
            geofsLoggedIn = true;
            realCallsign  = rec.callsign || "";
            return true;
        }
    } catch (e) {
        console.warn('[ACARS] detectGeoFSLogin error:', e);
    }
    geofsLoggedIn = false;
    realCallsign  = "";
    return false;
}

   
    function buildChatURL() {
        return `${CHAT_URL}`
             + `?room=${encodeURIComponent(savedRoom)}`
             + `&geofs_logged_in=${geofsLoggedIn}`
             + `&geofs_callsign=${encodeURIComponent(realCallsign)}`;
    }


    let container = document.createElement('div');
    container.style.cssText = [
        `position: fixed`,
        `bottom: ${savedPos.y}px`,
        `right: ${savedPos.x}px`,
        `width: 340px`,
        `height: 540px`,
        `z-index: 10001`,
        `border-radius: 8px`,
        `overflow: hidden`,
        `border: 2px solid #2a2a2a`,
        `background: #000`,
        `box-shadow: 0 10px 40px rgba(0,0,0,0.9)`,
        `display: block`,
    ].join('; ');

    let dragHandle = document.createElement('div');
    dragHandle.style.cssText = [
        `width: 100%`,
        `height: 28px`,
        `background: #0d0d0d`,
        `cursor: move`,
        `display: flex`,
        `align-items: center`,
        `padding: 0 10px`,
        `font-size: 10px`,
        `color: #00e5ff`,
        `font-family: monospace`,
        `font-weight: bold`,
        `border-bottom: 1px solid #1a1a1a`,
        `user-select: none`,
        `justify-content: space-between`,
    ].join('; ');

    let titleSpan = document.createElement('span');
    titleSpan.textContent = '> ACARS PANEL [T]';

    // GeoFS status indicator in handle
    let geofsIndicator = document.createElement('span');
    geofsIndicator.style.cssText = 'font-size: 9px; color: #333;';
    geofsIndicator.textContent   = 'GeoFS: --';

    dragHandle.appendChild(titleSpan);
    dragHandle.appendChild(geofsIndicator);
    container.appendChild(dragHandle);

    // ── iframe ───────────────────────────────────────────
    let iframe = document.createElement('iframe');
    iframe.style.cssText = 'width: 100%; height: calc(100% - 28px); border: none;';
    iframe.allow = "popups";  // ← 加這行
    container.appendChild(iframe);
    document.body.appendChild(container);


    function tryDetectAndLoad() {
        detectGeoFSLogin();
        iframe.src = buildChatURL();
        updateGeoFSIndicator();
    }


    let initAttempts = 0;
    const initTimer = setInterval(() => {
        initAttempts++;
        if (detectGeoFSLogin() || initAttempts >= 20) {
            clearInterval(initTimer);
            tryDetectAndLoad();
        }

        if (initAttempts === 20) tryDetectAndLoad();
    }, 1000);


    setInterval(() => {
        const wasLoggedIn = geofsLoggedIn;
        const wasCallsign = realCallsign;
        detectGeoFSLogin();

        if (wasLoggedIn !== geofsLoggedIn || wasCallsign !== realCallsign) {
            // Reload iframe with updated params (Discord token is in localStorage so it persists)
            iframe.src = buildChatURL();
        }
        updateGeoFSIndicator();
    }, 8000);

    function updateGeoFSIndicator() {
        if (geofsLoggedIn) {
            geofsIndicator.style.color = '#00ff88';
            geofsIndicator.textContent = `✈ ${realCallsign || 'LOGGED IN'}`;
        } else {
            geofsIndicator.style.color = '#333';
            geofsIndicator.textContent = 'GeoFS: OFF';
        }
    }

    // ── T Key Toggle ──────────────────────────────────────
    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.key.toLowerCase() === 't') {
            isOpen = !isOpen;
            container.style.display = isOpen ? 'block' : 'none';
        }
    });

    // ── Drag Logic ────────────────────────────────────────
    let isDragging = false;
    let dragStart  = { x: 0, y: 0 };

    dragHandle.addEventListener('mousedown', (e) => {
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
