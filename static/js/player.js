// Minimal client helper for: video upload → play → capture → send via HTMX → place in next slot.
(function () {
  const video = document.getElementById('vid');
  const fileInput = document.getElementById('videoFile');
  const loadBtn = document.getElementById('loadBtn');
  const captureBtn = document.getElementById('captureBtn');
  const clearBtn = document.getElementById('clearBtn');
  const statusEl = document.getElementById('status');
  const grid = document.getElementById('resultGrid');

  let nextSlot = 1;
  const maxSlots = 10;
  let objectUrl = null;

  function setStatus(msg){ statusEl.textContent = msg; }

  loadBtn.addEventListener('click', () => {
    if (!fileInput.files || !fileInput.files[0]) { setStatus('Please choose a video file first.'); return; }
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(fileInput.files[0]);
    video.src = objectUrl;
    video.play().catch(()=>{ /* user gesture may be needed */ });
    captureBtn.disabled = false;
    setStatus('Video loaded. Seek to a frame, then press Capture (or C).');
  });

  clearBtn.addEventListener('click', () => {
    for (let i = 1; i <= maxSlots; i++) {
      const slot = document.getElementById(`slot-${i}`);
      slot.className = 'tile empty';
      slot.innerHTML = `<div class="hint">Empty slot ${i}</div>`;
    }
    nextSlot = 1;
    setStatus('Grid cleared.');
  });

  function findNextSlotEl() {
    const slot = document.getElementById(`slot-${nextSlot}`);
    nextSlot = nextSlot % maxSlots + 1; // advance circularly
    return slot;
  }

  async function captureFrameAndSend() {
  if (!video.videoWidth) { setStatus('Video not ready yet.'); return; }

  const canvas = document.createElement('canvas');
  const maxW = 960;
  const scale = Math.min(1, maxW / video.videoWidth);
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.9));
  if (!blob) { setStatus('Failed to capture frame.'); return; }

  const slotEl = findNextSlotEl();
  if (!slotEl) { console.error('No slot element found'); setStatus('No slot available.'); return; }
  const slotId = slotEl.id;

  const form = new FormData();
  form.append('frame', blob, 'frame.jpg');
  form.append('slot_id', slotId);

  // Preview while uploading
  slotEl.className = 'tile';
  const tempURL = URL.createObjectURL(blob);
  slotEl.innerHTML = `
    <img class="thumb" src="${tempURL}" alt="preview"/>
    <div class="meta">
      <div class="title">Identifying…</div>
      <div class="sub">Please hold</div>
      <div class="muted">Uploading frame</div>
    </div>
  `;

  setStatus('Identifying…');
  try {
    const resp = await fetch('/identify', { method: 'POST', body: form });
    const ct = resp.headers.get('content-type') || '';
    if (!resp.ok) {
      const errText = await resp.text().catch(()=> '');
      console.error('Identify failed', resp.status, errText);
      throw new Error(`HTTP ${resp.status}`);
    }
    const html = await resp.text();

    // SAFER SWAP: use HTMX if available, else plain DOM replace
    try {
      if (window.htmx && typeof window.htmx.swap === 'function') {
        window.htmx.swap(slotEl, html, { swapStyle: 'outerHTML' });
      } else {
        // Replace the node manually
        const tmp = document.createElement('template');
        tmp.innerHTML = html.trim();
        const newNode = tmp.content.firstElementChild;
        if (!newNode) throw new Error('Empty fragment from /identify');
        slotEl.replaceWith(newNode);
        // Let HTMX scan the new node for any hx- attributes
        if (window.htmx && typeof window.htmx.process === 'function') {
          window.htmx.process(newNode);
        }
      }
    } catch (swapErr) {
      console.error('Swap error:', swapErr);
      throw swapErr; // bubble to outer catch so status shows error
    }

    setStatus('Done. Capture another frame when ready.');
  } catch (e) {
    console.error('Capture/send error:', e);
    setStatus('Error during identification.');
  } finally {
    URL.revokeObjectURL(tempURL);
  }
}

  captureBtn.addEventListener('click', captureFrameAndSend);
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'c' && !captureBtn.disabled) {
      e.preventDefault();
      captureFrameAndSend();
    }
  });
})();
