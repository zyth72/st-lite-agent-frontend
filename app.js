/**
 * Vue 面板根组件 + 子组件(StageCard / SettingsView)。
 * 状态全部来自 store.js;样式复用现有 M3 class;marked 渲染正文/思维链。
 */
import { defineComponent, ref, computed, watch } from './vue.esm-browser.prod.js';
import { marked } from './marked.esm.js';
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
      if (isJson.value) return esc(text.value.output);           // 原始 JSON 直显
      return md(text.value.output);
    });
    const copy = (kind) => {
      const v = kind === 'reasoning' ? text.value.reasoning : text.value.output;
      navigator.clipboard && navigator.clipboard.writeText(v);
    };
    return { stage, text, sv, status, icon, isJson, reasonHtml, outHtml, copy, toggleMd: (id) => S.toggleMd(id) };
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
          <button v-if="isJson" class="la-md-toggle" @click="toggleMd(stage.id)">{{ sv.mode==='json' ? 'MD' : 'JSON' }}</button>
          <button class="la-copy" @click="copy('output')">复制</button>
        </div>
        <pre class="la-pre" :id="'la-out-'+stage.id" v-html="outHtml"></pre>
      </div>
    </details>
  </template>
</div>
`
});

const SettingsView = defineComponent({
  setup() {
    const cfg = ref({ keys: [], providers: [], stages: [] });
    const tip = ref('');
    function toEditable(d) {
      return {
        keys: (d.keys || []).map((k) => ({ name: k.name, hint: k.hint, key: '' })),
        providers: (d.providers || []).map((p) => ({ name: p.name, baseurl: p.baseurl, models: p.models || [], _new: '' })),
        stages: (d.stages || []).filter((s) => s.type === 'llm').map((st) => ({
          id: st.id, model: st.model || '', think: st.thinking === 'enabled', stream: !!st.stream, max: st.max_tokens || null,
        })),
      };
    }
    async function load() {
      try {
        const r = await fetch(S.base.value + '/agent/config');
        const d = await r.json();
        cfg.value = toEditable(d);
        tip.value = '';
      } catch (e) { tip.value = '读取配置失败: ' + e.message; }
    }
    load();
    const modelOptions = computed(() => {
      const all = [];
      (cfg.value.providers || []).forEach((p) => (p.models || []).forEach((m) => all.push(p.name + '/' + m)));
      (cfg.value.stages || []).forEach((st) => { if (st.model && !all.includes(st.model)) all.unshift(st.model); });
      return all;
    });
    function addModel(p) { const v = (p._new || '').trim(); if (v && !p.models.includes(v)) { p.models.push(v); p._new = ''; } }
    async function save() {
      const stages = (cfg.value.stages || []).map((st) => ({ id: st.id, model: st.model, thinking: st.think ? 'enabled' : 'disabled', stream: st.stream, max_tokens: st.max || null }));
      const providers = (cfg.value.providers || []).map((p) => ({ name: p.name, baseurl: p.baseurl, models: p.models }));
      const keys = (cfg.value.keys || []).map((k) => ({ name: k.name, key: k.key }));
      try {
        const r = await fetch(S.base.value + '/agent/config', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stages, providers, keys }),
        });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        tip.value = '已保存并热生效(上游/段配置即读即用)';
        await load();
      } catch (e) { tip.value = '保存失败: ' + e.message; }
    }
    return { cfg, tip, modelOptions, addModel, save, back: S.closeSettings };
  },
  template: `
<div class="la-settings">
  <div class="la-set-group">
    <div class="la-set-group-title">上游密钥</div>
    <div class="la-set-hint">key 留空 = 删除该行</div>
    <div v-for="(k,i) in cfg.keys" :key="i" class="la-set-row">
      <span class="la-set-label">{{k.name}}</span>
      <input class="la-set-input" type="password" v-model="k.key" :placeholder="'···'+(k.hint||'')">
    </div>
  </div>
  <div class="la-set-group">
    <div class="la-set-group-title">上游</div>
    <div class="la-set-hint">baseurl 与模型列表(每行一个,空 = 自动发现)</div>
    <div v-for="(p,i) in cfg.providers" :key="i" class="la-provider">
      <div class="la-set-row">
        <span class="la-set-label">{{p.name}}</span>
        <input class="la-set-input" v-model="p.baseurl">
      </div>
      <details class="la-models">
        <summary>模型管理({{ (p.models||[]).length }})</summary>
        <div class="la-model-list">
          <div v-for="(m,j) in p.models" :key="j" class="la-model-row">
            <span class="la-model-name">{{m}}</span>
            <button class="la-model-del" @click="p.models.splice(j,1)">删</button>
          </div>
          <div v-if="!(p.models||[]).length" class="la-set-empty">(暂无模型,留空 = 自动发现)</div>
          <div class="la-model-add-row">
            <input class="la-set-input" v-model="p._new" placeholder="模型名,如 deepseek-v4-pro" @keyup.enter="addModel(p)">
            <button class="la-model-add" @click="addModel(p)">添加</button>
          </div>
        </div>
      </details>
    </div>
  </div>
  <div class="la-set-group">
    <div class="la-set-group-title">agent 段配置</div>
    <div class="la-set-hint">模型 / thinking / 流式 / max_tokens</div>
    <template v-for="(st,i) in cfg.stages" :key="st.id">
      <div class="la-set-stage">
        <span class="la-set-stage-name">{{st.id}}</span>
        <select class="la-set-input" v-model="st.model">
          <option value="">(继承外层)</option>
          <option v-for="opt in modelOptions" :value="opt" :key="opt">{{opt}}</option>
        </select>
      </div>
      <div class="la-set-toggle">
        <label class="la-set-toggle-item"><input type="checkbox" v-model="st.think"><span>thinking</span></label>
        <label class="la-set-toggle-item"><input type="checkbox" v-model="st.stream"><span>stream</span></label>
        <label class="la-set-toggle-item"><span>max</span><input class="la-set-max" type="number" v-model="st.max"></label>
      </div>
    </template>
  </div>
  <div v-if="tip" class="la-set-hint">{{tip}}</div>
  <div class="la-set-actions">
    <button @click="save">保存</button>
    <button class="la-btn-tonal" @click="back">返回</button>
  </div>
</div>
`
});

const App = defineComponent({
  components: { StageCard, SettingsView },
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
        const vw = innerWidth, vh = innerHeight;
        S.ballPos.value.right = Math.min(Math.max(0, ballDrag.sr - dx), Math.max(0, vw - 54 - 8));
        S.ballPos.value.bottom = Math.min(Math.max(0, ballDrag.sb - dy), Math.max(0, vh - 54 - 8));
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
        const vw = innerWidth, vh = innerHeight, pw = Math.min(520, vw), ph = vh * 0.66;
        S.panelPos.value.right = Math.min(Math.max(0, panelDrag.sr - dx), Math.max(0, vw - pw - 8));
        S.panelPos.value.bottom = Math.min(Math.max(0, panelDrag.sb - dy), Math.max(0, vh - ph - 8));
      }
    }
    function onHeadUp() { panelDrag = null; }
    function onBaseChange() { S.setBase(baseInput.value); }
    function onSettingsBtn() { if (S.view.value === 'settings') S.closeSettings(); else S.openSettings(); }
    useEventListener(window, 'pointermove', onBallMove);
    useEventListener(window, 'pointerup', onBallUp);
    useEventListener(window, 'pointermove', onHeadMove);
    useEventListener(window, 'pointerup', onHeadUp);
    return { baseInput, visible, ballStyle, panelStyle, onBallDown, onBallMove, onBallUp, onHeadDown, onHeadMove, onHeadUp, onBaseChange, onSettingsBtn, panelOpen: S.panelOpen, connected: S.connected, view: S.view, clearBody: S.clearBody };
  },
  template: `
<div>
  <div id="lite-agent-ball" :style="ballStyle" @pointerdown="onBallDown">⚡</div>
  <div id="lite-agent-panel" :class="{open: panelOpen}" :style="panelStyle">
    <div id="lite-agent-head" @pointerdown="onHeadDown">
      <span class="la-title">st-lite-agent</span>
      <span id="lite-agent-status" :class="connected ? 'ok' : ''"></span>
      <input type="text" id="lite-agent-base" v-model="baseInput" @change="onBaseChange">
      <button @click="clearBody">清空</button>
      <button @click="onSettingsBtn">{{ view==='settings' ? '返回' : '⚙️' }}</button>
    </div>
    <div id="lite-agent-body">
      <SettingsView v-if="view==='settings'"/>
      <template v-else>
        <div v-if="visible.length===0" class="la-dim la-pending-placeholder">等待 agent 执行…</div>
        <StageCard v-for="id in visible" :key="id" :id="id"/>
      </template>
    </div>
  </div>
</div>
`
});

export default App;
