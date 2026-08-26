/**
 * 响应式状态 + SSE 连接。Vue 组件只读状态/调 action,不直接碰 SSE。
 */
import { ref, reactive } from './lib/vue.esm-browser.prod.js';
import { useLocalStorage } from './hooks.js';

export const base = useLocalStorage('st-lite-agent-base', 'http://127.0.0.1:7890');
export const ballPos = useLocalStorage('st-lite-agent-ball-pos', { right: 18, bottom: 18 });
export const panelPos = useLocalStorage('st-lite-agent-panel-pos', { right: 18, bottom: 76 });

export const panelOpen = ref(false);
export const view = ref('stages');            // 'stages' | 'settings'
export const connected = ref(false);
export const stages = ref([]);                // llm 清单 [{id,type,output}]
export const statuses = reactive({});         // stageId -> running/done/failed
export const stageText = reactive({});        // stageId -> {reasoning, output}
export const stageView = reactive({});        // stageId -> {md, mode, reasonOpen, outOpen, collapsed}

export function visibleStageIds() {
  return Object.keys(statuses).filter((id) => stages.value.some((s) => s.id === id));
}

let es = null;
export function connect() {
  if (es) es.close();
  es = new EventSource(base.value + '/agent/stream');
  es.onopen = () => { connected.value = true; };
  es.onerror = () => { connected.value = false; };
  es.addEventListener('reset', (ev) => {
    if (view.value === 'settings') return;
    try {
      const d = JSON.parse(ev.data);
      stages.value = (d.stages || []).filter((s) => s.type === 'llm');
    } catch (e) {}
    resetData();
  });
  es.addEventListener('stage', (ev) => {
    if (view.value === 'settings') return;
    try {
      const d = JSON.parse(ev.data);
      if (!stages.value.some((s) => s.id === d.stageId)) return;
      statuses[d.stageId] = d.status;
    } catch (e) {}
  });
  es.addEventListener('text', (ev) => {
    if (view.value === 'settings') return;
    try {
      const d = JSON.parse(ev.data);
      const t = stageText[d.stage] || (stageText[d.stage] = { reasoning: '', output: '' });
      if (d.kind === 'reasoning') t.reasoning += d.text; else t.output += d.text;
    } catch (e) {}
  });
}
export function disconnect() { if (es) { es.close(); es = null; } }

export function resetData() {
  for (const k of Object.keys(statuses)) delete statuses[k];
  for (const k of Object.keys(stageText)) delete stageText[k];
  for (const k of Object.keys(stageView)) delete stageView[k];
}

export function togglePanel() { panelOpen.value = !panelOpen.value; }
export function openSettings() { view.value = 'settings'; }
export function closeSettings() { view.value = 'stages'; }
export function clearBody() { resetData(); }
export function setBase(v) { base.value = v || 'http://127.0.0.1:7890'; connect(); }

/** json 段:正文 原始JSON ↔ 渲染MD(懒加载后端 /agent/render-md)。 */
export async function toggleMd(id) {
  const sv = stageView[id] || (stageView[id] = { md: null, mode: 'json' });
  const content = (stageText[id] && stageText[id].output) || '';
  if (sv.mode === 'json') {
    if (sv.md == null) {
      try {
        const r = await fetch(base.value + '/agent/render-md', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }),
        });
        const j = await r.json();
        sv.md = (j && j.md) || '';
      } catch (e) { sv.md = ''; }
    }
    sv.mode = 'md';
  } else {
    sv.mode = 'json';
  }
}
