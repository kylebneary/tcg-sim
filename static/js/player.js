// video upload → play → capture → POST (multipart) → swap tile
(() => {
  'use strict';

  // --- DOM ---
  const video      = document.getElementById('vid');
  const fileInput  = document.getElementById('videoFile');
  const loadBtn    = document.getElementById('loadBtn');
  const captureBtn = document.getElementById('captureBtn');
  const clearBtn   = document.getElementById('clearBtn');
  const statusEl   = document.getElementById('status');

  // --- State ---
  const MAX_SLOTS = 10;
  let nextSlot = 1;
  let objectUrl = null;
  let busy = false; // prevent overlapping captures

  // --- Utils ---
  const setStatus = (msg) => { statusEl.textContent = msg; };

  const resetGrid = () => {
    for (let i = 1; i <= MAX_SLOTS; i += 1) {
      const slot = document.getElementById(`slot-${i}`);
      slot.className = 'tile empty';
      slot.innerHTML = `<div class="hint">Empty slot ${i}</div>`;
    }
    nextSlot = 1;
    setStatus('Grid cleared.');
  };

  const getNextSlotEl = () => {
    const el = document.getElementById(`slot-${nextSlot}`);
    nextSlot = (nextSlot % MAX_SLOTS) + 1; // circular advance
    return el;
  };

  // --- Handlers ---
  loadBtn.addEventListener('click', () => {
    const file = fileInput.files?.[0];
    if (!file) { setStatus('Please choose a video file first.'); return; }

    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);

    video.src = objectUrl;
    video.play().catch(() => { /* user gesture may be needed */ });

    captureBtn.disabled = false;
    setStatus('Video loaded. Seek to a frame, then press Capture (or C).');
  });

  clearBtn.addEventListener('click', resetGrid);

  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'c' && !captureBtn.disabled) {
      e.preventDefault();
      captureFrameAndSend();
    }
  });

  // --- Core ---
  async function captureFrameAndSend() {
    if (busy) return;
    if (!video.videoWidth) { setStatus('Video not ready yet.'); return; }
    busy = true;

    // Draw current frame
    const canvas = document.createElement('canvas');
    const MAX_W = 960;
    const scale = Math.min(1, MAX_W / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
    if (!blob) { setStatus('Failed to capture frame.'); busy = false; return; }

    const slotEl = getNextSlotEl();
    if (!slotEl) { console.error('No slot element found'); setStatus('No slot available.'); busy = false; return; }
    const slotId = slotEl.id;

    // Local preview while uploading
    const tempURL = URL.createObjectURL(blob);
    slotEl.className = 'tile';
    slotEl.innerHTML = `
      <img class="thumb" src="${tempURL}" alt="preview" />
      <div class="meta">
        <div class="title">Identifying…</div>
        <div class="sub">Please hold</div>
        <div class="muted">Uploading frame</div>
      </div>
    `;

    // Build multipart payload
    const form = new FormData();
    form.append('frame', blob, 'frame.jpg');
    form.append('slot_id', slotId);

    setStatus('Identifying…');

    try {
      const resp = await fetch('/identify', { method: 'POST', body: form });
      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        console.error('Identify failed', resp.status, errText);
        throw new Error(`HTTP ${resp.status}`);
      }
      const html = await resp.text();

      // Swap returned fragment into the chosen slot
      if (window.htmx && typeof window.htmx.swap === 'function') {
        window.htmx.swap(slotEl, html, { swapStyle: 'outerHTML' });
      } else {
        const tpl = document.createElement('template');
        tpl.innerHTML = html.trim();
        const newNode = tpl.content.firstElementChild;
        if (!newNode) throw new Error('Empty fragment from /identify');
        slotEl.replaceWith(newNode);
        if (window.htmx && typeof window.htmx.process === 'function') {
          window.htmx.process(newNode);
        }
      }

      setStatus('Done. Capture another frame when ready.');
    } catch (err) {
      console.error('Capture/send error:', err);
      setStatus('Error during identification.');
    } finally {
      URL.revokeObjectURL(tempURL);
      busy = false;
    }
  }

  captureBtn.addEventListener('click', captureFrameAndSend);

  // Cleanup object URL on leave
  window.addEventListener('beforeunload', () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  });
})();
