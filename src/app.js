/**
 * Vue 面板根组件 + 子组件(StageCard / SettingsView)。
 * 状态来自 store.js;基础控件用全局组件 LaInput/LaSelect/LaToggleItem/LaButton;
 * 样式复用现有 M3 class;marked 渲染正文/思维链。
 */
import { defineComponent, ref, computed } from './lib/vue.esm-browser.prod.js';
import { marked } from './lib/marked.esm.js';
import { useEventListener } from './hooks.js';
import * as S from './store.js';

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function md(text) { return marked.parse(text || '', { gfm: true, breaks: true }); }

const STAGE_ICON = { running: '⏳', done: '✅', failed: '❌' };

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
    const icon = computed(() => STAGE_ICON[status.value] || '');
    const isJson = computed(() => stage.value.output === 'json');
    const reasonHtml = computed(() => md(text.value.reasoning));
    const outHtml = computed(() => {
      if (isJson.value && sv.value.mode === 'md') return md(sv.value.md || '');
      if (isJson.value) return esc(text.value.output);
      return md(text.value.output);
    });
    const copy = (kind) => { const v = kind === 'reasoning' ? text.value.reasoning : text.value.output; navigator.clipboard && navigator.clipboard.writeText(v); };
    return { stage, text, sv, status, icon, isJson, reasonHtml, outHtml, copy, toggleMd: S.toggleMd };
  },
  template: `
<div class="la-group" :id="'la-group-'+stage.id" :class="{closed: sv.collapsed}">
  <div class="la-step-head" @click="sv.collapsed=!sv.collapsed">
    <span class="la-step-dot" :id="'la-dot-'+stage.id" :class="status"></span>
    <span class="la-step-title" :id="'la-label-'+stage.id">{{ icon }} {{ stage.id }}</span>
  </div>
  <template v-if="!sv.collapsed">
    <details class="la-reason" :id="'la-reason-'+stage.id" :open="sv.reasonOpen" v-if="text.reasoning">
      <summary @click.prevent="sv.reasonOpen=!sv.reasonOpen">思维链</summary>
      <div class="la-reason-body"><pre class="la-pre" :id="'la-reason-'+stage.id" v-html="reasonHtml"></pre></div>
    </details>
    <details class="la-out" :id="'la-out-'+stage.id" :class="{prose: stage.output==='stream'}" :open="sv.outOpen" v-if="text.output">
      <summary @click.prevent="sv.outOpen=!sv.outOpen">正文</summary>
      <div class="la-card">
        <div class="la-card-head">
          <span>正文</span>
          <LaButton v-if="isJson" class="la-md-toggle" :text="sv.mode==='json' ? 'MD' : 'JSON'" @click="toggleMd(stage.id)"/>
          <LaButton class="la-copy" text="复制" @click="copy('output')"/>
        </div>
        <pre class="la-pre" :id="'la-out-'+stage.id" v-html="outHtml"></pre>
      </div>
    </details>
  </template>
</div>
`
});

const App = defineComponent({
  components: { StageCard },
  setup() {
    const baseInput = ref(S.base.value);
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
        S.ballPos.value.right = Math.min(Math.max(0, ballDrag.sr - dx), Math.max(0, innerWidth - 54 - 8));
        S.ballPos.value.bottom = Math.min(Math.max(0, ballDrag.sb - dy), Math.max(0, innerHeight - 54 - 8));
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
        const pw = Math.min(520, vw);
        // 高度与 CSS 一致(桌面 min(72vh,760) / 移动 min(82vh,720)),保证固定高度且拖不出视口
        const ph = vw <= 768 ? Math.min(vh * 0.82, 720) : Math.min(vh * 0.72, 760);
        S.panelPos.value.right = Math.min(Math.max(0, panelDrag.sr - dx), Math.max(0, vw - pw - 8));
        S.panelPos.value.bottom = Math.min(Math.max(0, panelDrag.sb - dy), Math.max(0, vh - ph - 8));
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
    return { baseInput, visible, ballStyle, panelStyle, onBallDown, onBallMove, onBallUp, onHeadDown, onHeadMove, onHeadUp, onBaseChange, onSettingsBtn, onStop, panelOpen: S.panelOpen, connected: S.connected, clearBody: S.clearBody };
  },
  template: `
<div>
  <div id="lite-agent-ball" :style="ballStyle" @pointerdown="onBallDown">⚡</div>
  <div id="lite-agent-panel" :class="{open: panelOpen}" :style="panelStyle">
    <div id="lite-agent-head" @pointerdown="onHeadDown">
      <span class="la-title">st-lite-agent</span>
      <span id="lite-agent-status" :class="connected ? 'ok' : ''"></span>
      <LaInput type="text" id="lite-agent-base" v-model="baseInput" @change="onBaseChange"/>
      <LaButton text="停止" @click="onStop"/>
      <LaButton text="清空" @click="clearBody"/>
      <LaButton text="⚙️" @click="onSettingsBtn"/>
    </div>
    <div id="lite-agent-body">
      <div v-if="visible.length===0" class="la-dim la-pending-placeholder">等待 agent 执行…</div>
      <StageCard v-for="id in visible" :key="id" :id="id"/>
    </div>
  </div>
</div>
`
});

export default App;
