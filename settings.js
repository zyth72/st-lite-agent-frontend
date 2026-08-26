/**
 * ⚙️ 设置面板:读/写服务端 /agent/config(agent 段 / 上游 / 密钥)。
 * 进入设置模式替换面板内容,返回时恢复最近一次 llm 段分组。
 */
import { h } from './dom.js';
import { restoreGroups } from './render.js';

let settingsMode = false;
let cfgData = null;
let currentBase = '';
let savedBodyHTML = '';

export function toggleSettings(base) {
  currentBase = base;
  settingsMode = !settingsMode;
  if (settingsMode) {
    const bodyEl = document.getElementById('lite-agent-body');
    savedBodyHTML = bodyEl ? bodyEl.innerHTML : '';
    if (bodyEl) bodyEl.dataset.mode = 'settings';
    loadSettings(base);
  } else {
    const bodyEl = document.getElementById('lite-agent-body');
    if (bodyEl) bodyEl.removeAttribute('data-mode');
    if (bodyEl && savedBodyHTML) {
      bodyEl.innerHTML = savedBodyHTML;
    } else {
      restoreGroups();
    }
  }
}

async function loadSettings(base) {
  const bodyEl = document.getElementById('lite-agent-body');
  try {
    const resp = await fetch(base + '/agent/config');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    cfgData = await resp.json();
  } catch (e) {
    if (bodyEl) {
      bodyEl.innerHTML = '';
      bodyEl.appendChild(h('div', { class: 'la-dim', text: '读取配置失败: ' + e.message }));
    }
    return;
  }
  renderSettings();
}

function sRow(id, label, node) {
  return h('div', { style: 'display:flex;align-items:center;gap:6px;margin:3px 0;font-size:12px;flex-wrap:wrap' }, [
    h('span', { text: label, style: 'min-width:72px;color:#9bb8d0' }), node,
  ]);
}

function renderSettings() {
  const bodyEl = document.getElementById('lite-agent-body');
  if (!bodyEl) return;
  bodyEl.innerHTML = '';
  const d = cfgData || { stages: [], providers: [], keys: [] };
  const L = [];

  L.push(h('div', { class: 'la-dim', text: '上游密钥(key 留空 = 删除该行)' }));
  (d.keys || []).forEach((k, i) => {
    L.push(sRow('k' + i, k.name, h('input', { type: 'password', id: 'cfg-key-' + i, placeholder: '···' + k.hint, style: 'flex:1;min-width:120px' })));
  });

  L.push(h('div', { class: 'la-dim', text: '上游(models 逗号分隔,留空=自动发现)' }));
  (d.providers || []).forEach((p, i) => {
    L.push(sRow('p' + i, p.name, h('input', { type: 'text', id: 'cfg-purl-' + i, value: p.baseurl, style: 'flex:1;min-width:150px', title: 'baseurl' })));
    L.push(sRow('p' + i + 'm', p.name + ' models', h('input', { type: 'text', id: 'cfg-pmodels-' + i, value: (p.models || []).join(', '), style: 'flex:1;min-width:150px' })));
  });

  L.push(h('div', { class: 'la-dim', text: 'agent 段配置(模型 / thinking / 流式 / max_tokens)' }));
  (d.stages || []).forEach((st, i) => {
    if (st.type !== 'llm') return;
    const model = h('input', { type: 'text', id: 'cfg-model-' + i, value: st.model || '', placeholder: '(继承外层)', style: 'flex:1;min-width:120px;font-size:12px' });
    const think = h('input', { type: 'checkbox', id: 'cfg-think-' + i, checked: st.thinking === 'enabled' ? 'checked' : null });
    const stream = h('input', { type: 'checkbox', id: 'cfg-stream-' + i, checked: st.stream ? 'checked' : null });
    const max = h('input', { type: 'number', id: 'cfg-max-' + i, value: st.max_tokens || '', style: 'width:74px;font-size:12px' });
    const row1 = sRow('s' + i, st.id, model);
    const row2 = sRow('s' + i + 'a', 'thinking', think);
    row2.appendChild(h('span', { text: 'stream', style: 'color:#5f7488;margin-left:12px' }));
    row2.appendChild(stream);
    row2.appendChild(h('span', { text: 'max', style: 'color:#5f7488;margin-left:12px' }));
    row2.appendChild(max);
    L.push(row1, row2);
  });

  const saveBtn = h('button', { text: '保存', onclick: () => saveSettings(currentBase) });
  const backBtn = h('button', { text: '返回', class: 'la-btn-tonal', onclick: () => toggleSettings(currentBase) });
  L.push(h('div', { style: 'display:flex;gap:8px;margin-top:10px' }, [saveBtn, backBtn]));

  bodyEl.appendChild(h('div', { style: 'display:flex;flex-direction:column;gap:2px' }, L));
}

async function saveSettings(base) {
  currentBase = base;
  const bodyEl = document.getElementById('lite-agent-body');
  try {
    const stages = (cfgData.stages || []).map((st, i) => ({
      id: st.id,
      model: document.getElementById('cfg-model-' + i) ? document.getElementById('cfg-model-' + i).value : st.model,
      thinking: document.getElementById('cfg-think-' + i) && document.getElementById('cfg-think-' + i).checked ? 'enabled' : 'disabled',
      stream: document.getElementById('cfg-stream-' + i) ? !!document.getElementById('cfg-stream-' + i).checked : st.stream,
      max_tokens: document.getElementById('cfg-max-' + i) ? Number(document.getElementById('cfg-max-' + i).value) || null : st.max_tokens,
    }));
    const providers = (cfgData.providers || []).map((p, i) => ({
      name: p.name,
      baseurl: document.getElementById('cfg-purl-' + i) ? document.getElementById('cfg-purl-' + i).value : p.baseurl,
      models: document.getElementById('cfg-pmodels-' + i) ? document.getElementById('cfg-pmodels-' + i).value.split(',').map((s) => s.trim()).filter(Boolean) : (p.models || []),
    }));
    const keys = (cfgData.keys || []).map((k, i) => ({
      name: k.name,
      key: document.getElementById('cfg-key-' + i) ? document.getElementById('cfg-key-' + i).value : '',
    }));
    const resp = await fetch(base + '/agent/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stages, providers, keys }),
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    settingsMode = false;
    await loadSettings(base);
    const tip = h('div', { class: 'la-dim', text: '已保存并热生效(上游/段配置即读即用)' });
    if (bodyEl) bodyEl.insertBefore(tip, bodyEl.firstChild);
  } catch (e) {
    const tip = h('div', { class: 'la-dim', text: '保存失败: ' + e.message });
    if (bodyEl) bodyEl.insertBefore(tip, bodyEl.firstChild);
  }
}
