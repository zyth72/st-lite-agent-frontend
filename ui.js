/**
 * 悬浮球 + 悬浮窗 DOM:构建、拖动、开合。
 * 位置对象 {right,bottom} 由入口持有并传入(引用共享,拖动结束后回调负责持久化);
 * 基址变更、打开设置面板等行为通过回调交给入口。
 */
import { h } from './dom.js';
import { makeDraggable } from './position.js';

const LS_BALL = 'st-lite-agent-ball-pos';
const LS_PANEL = 'st-lite-agent-panel-pos';

export function buildBall({ pos, onToggle }) {
  if (document.getElementById('lite-agent-ball')) return;
  if (window.innerWidth <= 768 && !localStorage.getItem(LS_BALL)) {
    pos.right = 12;
    pos.bottom = 12;
  }
  const ball = h('div', { id: 'lite-agent-ball', title: 'st-lite-agent 面板', text: '⚡' });
  ball.style.right = pos.right + 'px';
  ball.style.bottom = pos.bottom + 'px';
  let down = false, moved = false, sx = 0, sy = 0, sr = 0, sb = 0;
  ball.addEventListener('pointerdown', (e) => {
    down = true; moved = false;
    sx = e.clientX; sy = e.clientY;
    sr = pos.right; sb = pos.bottom;
    e.preventDefault();
  });
  window.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) + Math.abs(dy) > 8) moved = true;
    if (moved) {
      const maxRight = Math.max(0, window.innerWidth - ball.offsetWidth - 8);
      const maxBottom = Math.max(0, window.innerHeight - ball.offsetHeight - 8);
      pos.right = Math.min(Math.max(0, sr - dx), maxRight);
      pos.bottom = Math.min(Math.max(0, sb - dy), maxBottom);
      ball.style.right = pos.right + 'px';
      ball.style.bottom = pos.bottom + 'px';
      ball.style.left = 'auto';
      ball.style.top = 'auto';
    }
  });
  window.addEventListener('pointerup', () => {
    if (down) {
      down = false;
      if (moved) localStorage.setItem(LS_BALL, JSON.stringify(pos));
    }
  });
  ball.addEventListener('click', () => {
    if (!moved) onToggle();
    moved = false;
  });
  document.body.appendChild(ball);
}

export function buildPanel({ pos, base, onBaseChange, onToggleSettings }) {
  if (document.getElementById('lite-agent-panel')) return;
  const baseInput = h('input', { type: 'text', id: 'lite-agent-base', value: base, style: 'width:150px' });
  baseInput.addEventListener('change', () => {
    onBaseChange(baseInput.value.trim() || 'http://127.0.0.1:7890');
  });
  const status = h('span', { id: 'lite-agent-status' });
  const clearBtn = h('button', { text: '清空', onclick: () => { const b = document.getElementById('lite-agent-body'); if (b) b.innerHTML = ''; } });
  const settingsBtn = h('button', { text: '⚙️', title: '设置', onclick: () => onToggleSettings() });
  const bodyEl = h('div', { id: 'lite-agent-body' });
  const head = h('div', { id: 'lite-agent-head' }, [
    h('span', { class: 'la-title', text: 'st-lite-agent' }),
    status, baseInput, clearBtn, settingsBtn,
  ]);
  if (window.innerWidth <= 768) { pos.right = 0; pos.bottom = 0; }
  const panel = h('div', { id: 'lite-agent-panel' }, [head, bodyEl]);
  panel.style.right = pos.right + 'px';
  panel.style.bottom = pos.bottom + 'px';
  makeDraggable(head, panel, pos, (p) => localStorage.setItem(LS_PANEL, JSON.stringify(p)));
  document.body.appendChild(panel);
}

export function togglePanel() {
  const panel = document.getElementById('lite-agent-panel');
  if (panel) panel.classList.toggle('open');
}
