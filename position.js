/**
 * 悬浮球/面板位置:统一用 {right, bottom}(px)表示,持久化到 localStorage。
 * 注意:ST 在 ≤1000px 视口把 body 设为 position:fixed 且 html 高度塌缩为 0,
 * 元素必须用 position:absolute(right/bottom 相对 body)定位,见 styles.js。
 */

export function loadPos(key, def) {
  try { const p = JSON.parse(localStorage.getItem(key)); if (p && typeof p.right === 'number') return p; } catch (e) {}
  return def;
}

export function clampPos(p, w, h) {
  const vw = window.innerWidth, vh = window.innerHeight;
  const maxRight = Math.max(0, vw - w - 8);
  const maxBottom = Math.max(0, vh - h - 8);
  if (typeof p.right === 'number') p.right = Math.min(Math.max(0, p.right), maxRight);
  if (typeof p.bottom === 'number') p.bottom = Math.min(Math.max(0, p.bottom), maxBottom);
  return p;
}

export function makeDraggable(handle, target, pos, onSave) {
  handle.addEventListener('pointerdown', (e) => {
    if (e.target.closest('input, select, button, label, summary, .la-copy')) return;
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const startRight = pos.right, startBottom = pos.bottom;
    let dragged = false;
    try { handle.setPointerCapture(e.pointerId); } catch (err) {}
    const move = (ev) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) dragged = true;
      if (dragged) {
        const maxRight = Math.max(0, window.innerWidth - target.offsetWidth - 8);
        const maxBottom = Math.max(0, window.innerHeight - target.offsetHeight - 8);
        pos.right = Math.min(Math.max(0, startRight - dx), maxRight);
        pos.bottom = Math.min(Math.max(0, startBottom - dy), maxBottom);
        target.style.right = pos.right + 'px';
        target.style.bottom = pos.bottom + 'px';
        target.style.left = 'auto';
        target.style.top = 'auto';
      }
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      if (dragged) onSave(pos);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  });
}
