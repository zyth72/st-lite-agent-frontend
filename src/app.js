/**
 * Vue 面板根组件 + 子组件(StageCard / SettingsView)。
 * 状态来自 store.js;基础控件用全局组件 LaInput/LaSelect/LaToggleItem/LaButton;
 * 样式复用现有 M3 class;marked 渲染正文/思维链。
 */
import { defineComponent, ref, computed, nextTick, onUpdated } from './lib/vue.esm-browser.prod.js';
import { marked } from './lib/marked.esm.js';
import { useEventListener } from './hooks.js';
import * as S from './store.js';

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function md(text) { return marked.parse(text || '', { gfm: true, breaks: true }); }

const STAGE_ICON = {
  roleplay: 'fa-user-group',
  facts: 'fa-clipboard-list',
  parallel: 'fa-code-branch',
  relationships: 'fa-diagram-project',
  reply: 'fa-comment-dots',
  settlement: 'fa-receipt',
  writer: 'fa-pen-nib',
  intrude: 'fa-door-open',
  parse: 'fa-magnifying-glass-chart',
  split: 'fa-scissors',
  state: 'fa-box-archive',
};
const STATUS_TEXT = { running: '运行中', done: '已完成', failed: '失败', stopped: '已停止' };
function fmtLen(s) {
  const n = (s || '').length;
  if (!n) return '';
  return n >= 10000 ? (n / 10000).toFixed(1) + ' 万字' : n + ' 字';
}

const StageCard = defineComponent({
  props: { id: String },
  setup(props) {
    const stage = computed(() => S.stages.value.find((s) => s.id === props.id) || { id: props.id });
    const sv = computed(() => {
      let x = S.stageView[props.id];
      if (!x) x = S.stageView[props.id] = { md: null, mode: 'json', reasonOpen: false, outOpen: false, collapsed: false };
      return x;
    });
    const status = computed(() => S.statuses[props.id] || '');
    const text = computed(() => S.stageText[props.id] || { reasoning: '', output: '' });
    // 子段(roleplay.凛)继承父段图标
    const stageIcon = computed(() => STAGE_ICON[props.id]
      || Object.keys(STAGE_ICON).filter((k) => props.id.startsWith(k + '.')).map((k) => STAGE_ICON[k])[0]
      || 'fa-gear');
    const statusText = computed(() => STATUS_TEXT[status.value] || '');
    // 显示名:主段用中文名;fan-out 子段 roleplay.凛 → 凛 · 居民扮演
    const STAGE_NAME = { settlement: '空间结算', roleplay: '居民扮演', facts: '事实核验', reply: '通讯结算', draft: '草稿', review: '审稿', parallel: '并行播报', writer: '写作' };
    const title = computed(() => {
      if (STAGE_NAME[props.id]) return STAGE_NAME[props.id];
      for (const [k, v] of Object.entries(STAGE_NAME)) {
        if (props.id.startsWith(k + '.')) return props.id.slice(k.length + 1) + ' · ' + v;
      }
      return props.id;
    });
    const reasonLen = computed(() => fmtLen(text.value.reasoning));
    const outLen = computed(() => fmtLen(text.value.output));
    const isJson = computed(() => stage.value.output === 'json');
    const reasonHtml = computed(() => md(text.value.reasoning));
    const outHtml = computed(() => {
      if (isJson.value && sv.value.mode === 'md') return md(sv.value.md || '');
      if (isJson.value) return esc(text.value.output);
      return md(text.value.output);
    });
    const copy = (kind) => { const v = kind === 'reasoning' ? text.value.reasoning : text.value.output; navigator.clipboard && navigator.clipboard.writeText(v); };
    // 展开较高段落时,把段顶对齐到面板顶部,阅读动线:段顶可见 → 滚内窗 → 滚链接到面板
    const expandIntoView = (e) => {
      const d = e.currentTarget.closest('.la-sec');
      nextTick(() => {
        const bodyEl = document.getElementById('lite-agent-body');
        if (!d || !bodyEl) return;
        if (d.offsetHeight <= bodyEl.clientHeight * 0.5) return; // 短段落不跳动
        const br = bodyEl.getBoundingClientRect(), dr = d.getBoundingClientRect();
        bodyEl.scrollTo({ top: bodyEl.scrollTop + dr.top - br.top - 6, behavior: 'smooth' });
      });
    };
    const toggleReason = (e) => { sv.value.reasonOpen = !sv.value.reasonOpen; if (sv.value.reasonOpen) expandIntoView(e); };
    const toggleOut = (e) => { sv.value.outOpen = !sv.value.outOpen; if (sv.value.outOpen) expandIntoView(e); };
    // 流式阶段每次轮询都会 v-html 替换正文,内层 scrollTop 会被重置:
    // 记住滚动位置(在底部则自动跟流),更新后恢复,否则长流永远"滑不到底"。
    const reasonRef = ref(null);
    const outRef = ref(null);
    const scrollMem = { reason: { top: 0, atEnd: false }, out: { top: 0, atEnd: false } };
    function onPreScroll(kind, e) {
      const el = e.target, m = scrollMem[kind];
      m.top = el.scrollTop;
      m.atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    }
    onUpdated(() => {
      for (const [kind, el] of [['reason', reasonRef.value], ['out', outRef.value]]) {
        if (!el) continue;
        const m = scrollMem[kind];
        if (m.atEnd) el.scrollTop = el.scrollHeight;
        else if (el.scrollTop !== m.top) el.scrollTop = m.top;
      }
    });
    return { stage, text, sv, status, stageIcon, statusText, title, reasonLen, outLen, isJson, reasonHtml, outHtml, copy, toggleReason, toggleOut, toggleMd: S.toggleMd, reasonRef, outRef, onPreScroll };
  },
  template: `
<div class="la-group" :id="'la-group-'+stage.id" :class="{closed: sv.collapsed}">
  <div class="la-step-head" @click="sv.collapsed=!sv.collapsed">
    <span class="la-step-dot" :id="'la-dot-'+stage.id" :class="status"></span>
    <i class="fa-solid la-stage-icon" :class="stageIcon"></i>
    <span class="la-step-title" :id="'la-label-'+stage.id">{{ title }}</span>
    <span v-if="statusText" class="la-status-text" :class="status">{{ statusText }}</span>
  </div>
  <template v-if="!sv.collapsed">
    <div class="la-sec" :class="{open: sv.reasonOpen}" v-if="text.reasoning">
      <div class="la-sec-head" @click="toggleReason($event)">
        <i class="fa-solid fa-brain la-sum-icon"></i>
        <span>思维链</span>
        <span v-if="reasonLen" class="la-sum-meta">{{ reasonLen }}</span>
      </div>
      <div class="la-reason-body" v-show="sv.reasonOpen"><pre ref="reasonRef" class="la-pre markdown-body" :id="'la-reason-pre-'+stage.id" @scroll.passive="onPreScroll('reason', $event)" v-html="reasonHtml"></pre></div>
    </div>
    <div class="la-sec" :class="{open: sv.outOpen, prose: stage.output==='stream'}" v-if="text.output">
      <div class="la-sec-head" @click="toggleOut($event)">
        <i class="fa-solid fa-file-lines la-sum-icon"></i>
        <span>正文</span>
        <span v-if="outLen" class="la-sum-meta">{{ outLen }}</span>
      </div>
      <div class="la-card" v-show="sv.outOpen">
        <div class="la-card-head">
          <span>正文</span>
          <LaButton v-if="isJson" class="la-md-toggle" :class="{disabled: status!=='done'}" :text="sv.mode==='json' ? 'MD' : 'JSON'" @click="status==='done' && toggleMd(stage.id)"/>
          <LaButton class="la-copy" text="复制" @click="copy('output')"/>
        </div>
        <pre ref="outRef" class="la-pre" :class="{'markdown-body': !(isJson && sv.mode==='json')}" @scroll.passive="onPreScroll('out', $event)" v-html="outHtml"></pre>
      </div>
    </div>
  </template>
</div>
`
});

const App = defineComponent({
  components: { StageCard },
  setup() {
    const baseInput = ref(S.base.value);
    const panelEl = ref(null);
    const ballEl = ref(null);
    const visible = computed(() => S.visibleStageIds());
    const ballStyle = computed(() => ({ right: S.ballPos.value.right + 'px', bottom: S.ballPos.value.bottom + 'px' }));
    const panelStyle = computed(() => ({ right: S.panelPos.value.right + 'px', bottom: S.panelPos.value.bottom + 'px' }));
    let ballDrag = null;
    function onBallDown(e) { ballDrag = { sx: e.clientX, sy: e.clientY, sr: S.ballPos.value.right, sb: S.ballPos.value.bottom, moved: false }; }
    function onBallMove(e) {
      if (!ballDrag) return;
      const dx = e.clientX - ballDrag.sx, dy = e.clientY - ballDrag.sy;
      if (Math.abs(dx) + Math.abs(dy) > 8) {
        ballDrag.moved = true;
        // 实测悬浮球当前渲染尺寸,不与 CSS 互追
        const bw = ballEl.value ? ballEl.value.getBoundingClientRect().width : 54;
        S.ballPos.value.right = Math.min(Math.max(0, ballDrag.sr - dx), Math.max(0, innerWidth - bw - 8));
        S.ballPos.value.bottom = Math.min(Math.max(0, ballDrag.sb - dy), Math.max(0, innerHeight - bw - 8));
      }
    }
    function onBallUp() { if (ballDrag) { if (!ballDrag.moved) S.togglePanel(); ballDrag = null; } }
    let panelDrag = null;
    function onHeadDown(e) { if (e.target.closest('input,select,button,summary,label')) return; panelDrag = { sx: e.clientX, sy: e.clientY, sr: S.panelPos.value.right, sb: S.panelPos.value.bottom, moved: false }; }
    function onHeadMove(e) {
      if (!panelDrag) return;
      const dx = e.clientX - panelDrag.sx, dy = e.clientY - panelDrag.sy;
      if (Math.abs(dx) + Math.abs(dy) > 3) {
        panelDrag.moved = true;
        const vw = innerWidth, vh = innerHeight;
        // 实测面板当前渲染尺寸,不与 CSS 互相追
        const rect = panelEl.value ? panelEl.value.getBoundingClientRect() : { width: 440, height: vh * 0.64 };
        S.panelPos.value.right = Math.min(Math.max(0, panelDrag.sr - dx), Math.max(0, vw - rect.width - 8));
        S.panelPos.value.bottom = Math.min(Math.max(0, panelDrag.sb - dy), Math.max(0, vh - rect.height - 8));
      }
    }
    function onHeadUp() { panelDrag = null; }
    function onBaseChange() { S.setBase(baseInput.value); }
    function onSettingsBtn() { S.openConfig(); }
    function onStop() { S.stopCurrent(); }
    useEventListener(window, 'pointermove', onBallMove);
    useEventListener(window, 'pointerup', onBallUp);
    useEventListener(window, 'pointermove', onHeadMove);
    useEventListener(window, 'pointerup', onHeadUp);
    return { baseInput, panelEl, ballEl, visible, ballStyle, panelStyle, onBallDown, onBallMove, onBallUp, onHeadDown, onHeadMove, onHeadUp, onBaseChange, onSettingsBtn, onStop, panelOpen: S.panelOpen, connected: S.connected, clearBody: S.clearBody };
  },
  template: `
<div>
  <div id="lite-agent-ball" ref="ballEl" :style="ballStyle" @pointerdown="onBallDown">⚡</div>
  <div id="lite-agent-panel" ref="panelEl" :class="{open: panelOpen}" :style="panelStyle">
    <div id="lite-agent-head" @pointerdown="onHeadDown">
      <span class="la-title">st-lite-agent</span>
      <span id="lite-agent-status" :class="connected ? 'ok' : ''"></span>
      <LaInput type="text" id="lite-agent-base" v-model="baseInput" @change="onBaseChange"/>
      <LaButton text="停止" @click="onStop"/>
      <LaButton text="清空" @click="clearBody"/>
      <LaButton text="⚙️" @click="onSettingsBtn"/>
    </div>
    <div id="lite-agent-body">
      <div id="lite-agent-content">
        <div v-if="visible.length===0" class="la-dim la-pending-placeholder">等待 agent 执行…</div>
        <StageCard v-for="id in visible" :key="id" :id="id"/>
      </div>
    </div>
  </div>
</div>
`
});

export default App;
