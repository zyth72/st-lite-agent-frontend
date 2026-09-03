/**
 * 响应式状态 + 轮询。Vue 组件只读状态/调 action,不直接碰网络细节。
 *
 * 数据获取用轮询(默认 1.5s)而非 EventSource:服务重启/断连后轮询天然自愈,
 * 不需要刷新页面。数据源全部来自落盘文件,与后端解耦;网络细节统一在 api.js。
 */
import { ref, reactive } from './lib/vue.esm-browser.prod.js';
import { useLocalStorage } from './hooks.js';
import { base, getRequests, getStepTail, stopPipeline, renderMd } from './api.js';

export { base }; // 兼容既有导入:api.js 是唯一定义处
export const ballPos = useLocalStorage('st-lite-agent-ball-pos', { right: 18, bottom: 18 });
export const panelPos = useLocalStorage('st-lite-agent-panel-pos', { right: 18, bottom: 76 });

export const panelOpen = ref(false);
export const view = ref('stages');            // 'stages' | 'settings'(旧内嵌设置,保留兼容)
export const configOpen = ref(false);         // 全屏配置界面(扩展菜单入口)
export const connected = ref(false);
export const stages = ref([]);                // llm 清单 [{id,type,output}]
export const statuses = reactive({});         // stageId -> running/done/failed
export const stageText = reactive({});        // stageId -> {reasoning, output}
export const stageView = reactive({});        // stageId -> {md, mode, reasonOpen, outOpen, collapsed}

export function visibleStageIds() {
  // 按服务端 stageMeta(流水线顺序)排序;fan-out 子段(roleplay.凛 等)展开为独立卡挂在父段位
  const keys = Object.keys(statuses);
  const out = [];
  for (const s of stages.value) {
    if (s.type && s.type !== 'llm') continue; // builtin 段不进面板(毫秒级内部步骤;日志仍有)
    const subs = keys.filter((k) => k.startsWith(s.id + '.'));
    if (subs.length) { out.push(...subs); continue; }
    if (statuses[s.id]) out.push(s.id);
  }
  return out;
}

const POLL_MS = 1500;
let pollTimer = null;
let pollBusy = false;
let currentReqId = null;
const offsets = {}; // 'reqId/file' -> 已读偏移(增量续读)
const lineBuf = {}; // 'reqId/file' -> 半行缓冲(落盘标记行过滤)

// 落盘文件里的头/分隔/结束标记行不进面板:
//   ========== 段 [x](llm) 输出(正文) ==========
//   ----- 输出 -----
//   ----- 输出结束 (tok=…|bytes=…|失败: …) -----
function appendClean(stageId, kind, key, text) {
  const t = stageText[stageId] || (stageText[stageId] = { reasoning: '', output: '' });
  const buf = (lineBuf[key] || '') + text;
  const lines = buf.split('\n');
  lineBuf[key] = lines[lines.length - 1]; // 末尾半行留到下一次拼齐
  for (const line of lines.slice(0, -1)) {
    const trimmed = line.trim();
    if (/^={5,}/.test(trimmed) || /^-{5,}/.test(trimmed)) continue;
    if (kind === 'reasoning') t.reasoning += line + '\n';
    else t.output += line + '\n';
  }
}

async function pollOnce() {
  if (pollBusy) return;
  pollBusy = true;
  try {
    const j = await getRequests();
    connected.value = true;

    const latest = (j.requests || [])[0];
    const metas = (j.stageMeta || []);
    if (!latest) return;
    if (latest.id !== currentReqId) {
      // 新请求:清空上一轮的面板数据
      currentReqId = latest.id;
      for (const k of Object.keys(offsets)) delete offsets[k];
      for (const k of Object.keys(lineBuf)) delete lineBuf[k];
      resetData();
      if (view.value !== 'settings') stages.value = metas;
    }
    if (view.value === 'settings') return;

    for (const f of latest.files || []) {
      if (!/\.(reasoning|output)\.txt$/.test(f)) continue;
      const stageId = f.replace(/\.(reasoning|output)\.txt$/, ''); // 完整前缀:roleplay.凛
      if (!metas.some((s) => s.id === stageId || stageId.startsWith(s.id + '.'))) continue;
      const kind = f.endsWith('.reasoning.txt') ? 'reasoning' : 'output';
      const key = latest.id + '/' + f;
      let d;
      try { d = await getStepTail(latest.id, f, offsets[key] || 0); }
      catch (e) { continue; } // 单文件读失败只跳过该文件,不影响其余段轮询
      if (!d || !d.exists) continue;
      offsets[key] = d.offset || offsets[key] || 0;
      if (!d.text) continue;
      appendClean(stageId, kind, key, d.text);
      const done = /输出结束/.test(d.text);
      const failed = /输出结束 \(失败/.test(d.text);
      const stopped = /输出结束 \(中止/.test(d.text);
      if (!statuses[stageId]) statuses[stageId] = failed ? 'failed' : 'running';
      if (done) statuses[stageId] = failed ? 'failed' : (stopped ? 'stopped' : 'done');
    }
  } catch (e) {
    connected.value = false;
  } finally {
    pollBusy = false;
  }
}

export function connect() {
  if (pollTimer) clearInterval(pollTimer);
  pollOnce();
  pollTimer = setInterval(pollOnce, POLL_MS);
}
export function disconnect() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

export function resetData() {
  for (const k of Object.keys(statuses)) delete statuses[k];
  for (const k of Object.keys(stageText)) delete stageText[k];
  for (const k of Object.keys(stageView)) delete stageView[k];
}

export function togglePanel() { panelOpen.value = !panelOpen.value; }
export function openConfig() { configOpen.value = true; }
export function closeConfig() { configOpen.value = false; }
export function openSettings() { view.value = 'settings'; openConfig(); } // 兼容旧入口:⚙️ 直接进全屏配置
export function closeSettings() { view.value = 'stages'; closeConfig(); }
export function clearBody() { resetData(); }
export function setBase(v) { base.value = v || 'http://127.0.0.1:6789'; connect(); }

/** 面板"停止":中止当前正在进行的 agent 请求。 */
export function stopCurrent() {
  stopPipeline().catch(() => {});
}

/** json 段:正文 原始JSON ↔ 渲染MD(懒加载后端渲染)。 */
export async function toggleMd(id) {
  const sv = stageView[id] || (stageView[id] = { md: null, mode: 'json' });
  const content = (stageText[id] && stageText[id].output) || '';
  if (sv.mode === 'json') {
    if (sv.md == null) {
      try {
        const j = await renderMd(content);
        sv.md = (j && j.md) || '';
      } catch (e) { sv.md = ''; }
    }
    sv.mode = 'md';
  } else {
    sv.mode = 'json';
  }
}
