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

const SettingsView = defineComponent({
  setup() {
    const cfg = ref({ providers: [], stages: [] });
    const tip = ref('');
    function toEditable(d) {
      const keys = d.keys || [];
      return {
        providers: (d.providers || []).map((p) => {
          const ki = keys.find((k) => k.name === p.name);
          return { name: p.name, baseurl: p.baseurl, models: p.models || [], keyHint: ki ? ki.hint : '', key: '', _new: '' };
        }),
        stages: (d.stages || []).filter((s) => s.type === 'llm').map((st) => ({ id: st.id, model: st.model || '', think: st.thinking === 'enabled', stream: !!st.stream, max: st.max_tokens || null })),
      };
    }
    async function load() {
      try { const r = await fetch(S.base.value + '/agent/config'); const d = await r.json(); cfg.value = toEditable(d); tip.value = ''; }
      catch (e) { tip.value = '读取配置失败: ' + e.message; }
    }
    load();
    const modelOptions = computed(() => {
      const all = [];
      (cfg.value.providers || []).forEach((p) => (p.models || []).forEach((m) => all.push(p.name + '/' + m)));
      (cfg.value.stages || []).forEach((st) => { if (st.model && !all.includes(st.model)) all.unshift(st.model); });
      return all;
    });
    function addModel(p) { const v = (p._new || '').trim(); if (v && !p.models.includes(v)) { p.models.push(v); p._new = ''; } }
    function addProvider() { cfg.value.providers.push({ name: '', baseurl: '', models: [], keyHint: '', key: '', _new: '' }); }
    function removeProvider(i) { cfg.value.providers.splice(i, 1); }
    async function loadModels(p) {
      try {
        const r = await fetch(S.base.value + '/agent/config/load-models', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: p.name, baseurl: p.baseurl, key: p.key }) });
        if (!r.ok) {
          let msg = 'HTTP ' + r.status;
          try { const j = await r.json(); if (j && (j.error || j.message)) msg = j.error || j.message; } catch (e) {}
          throw new Error(msg);
        }
        const j = await r.json();
        p.models = j.models || [];
        tip.value = p.models.length
          ? '已加载 ' + p.models.length + ' 个模型'
          : '该上游未返回模型,请在下方手动添加(留空则按名称直发)';
      } catch (e) {
        tip.value = '加载模型失败:' + e.message + '。该上游可能不支持 /models,可在下方手动添加模型(留空则按名称直发)';
      }
    }
    async function save() {
      const stages = (cfg.value.stages || []).map((st) => ({ id: st.id, model: st.model, thinking: st.think ? 'enabled' : 'disabled', stream: st.stream, max_tokens: st.max ? Number(st.max) : null }));
      // key 按 provider 名写入 .env;空 = 删除该行(后端处理)
      const providers = (cfg.value.providers || []).map((p) => ({ name: p.name, baseurl: p.baseurl, models: p.models }));
      const keys = (cfg.value.providers || []).map((p) => ({ name: p.name, key: p.key }));
      try {
        const r = await fetch(S.base.value + '/agent/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stages, providers, keys }) });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        tip.value = '已保存并热生效(上游/段配置即读即用)';
        await load();
      } catch (e) { tip.value = '保存失败: ' + e.message; }
    }
    return { cfg, tip, modelOptions, addModel, addProvider, removeProvider, loadModels, save, back: S.closeSettings };
  },
  template: `
<div class="la-settings">
  <div class="la-set-group">
    <div class="la-set-group-title">API 配置</div>
    <div class="la-set-hint">上游名称 / Base URL / 密钥 / 模型列表(每行一个,留空 = 自动发现)</div>
    <div v-for="(p,i) in cfg.providers" :key="i" class="la-provider">
      <div class="la-set-row">
        <span class="la-set-label">名称</span>
        <LaInput class="la-set-input" v-model="p.name" placeholder="如 deepseek / 火山"/>
      </div>
      <div class="la-set-row">
        <span class="la-set-label">Base URL</span>
        <LaInput class="la-set-input" v-model="p.baseurl" placeholder="https://api.deepseek.com/v1"/>
      </div>
      <div class="la-set-row">
        <span class="la-set-label">密钥</span>
        <LaInput class="la-set-input" type="password" v-model="p.key" :placeholder="p.keyHint ? '···'+(p.keyHint) : '留空 = 删除该行'"/>
      </div>
      <details class="la-models">
        <summary>模型管理({{ (p.models||[]).length }})</summary>
        <div class="la-model-list">
          <div v-for="(m,j) in p.models" :key="j" class="la-model-row">
            <span class="la-model-name">{{m}}</span>
            <LaButton class="la-model-del" text="删" @click="p.models.splice(j,1)"/>
          </div>
          <div v-if="!(p.models||[]).length" class="la-set-empty">(暂无模型,留空 = 自动发现)</div>
          <div class="la-model-add-row">
            <LaInput class="la-set-input" v-model="p._new" placeholder="模型名,如 deepseek-v4-pro" @keyup.enter="addModel(p)"/>
            <LaButton class="la-model-add" text="添加" @click="addModel(p)"/>
          </div>
        </div>
      </details>
      <div class="la-model-tools">
        <LaButton class="la-model-load" text="加载模型" @click="loadModels(p)"/>
        <span class="la-set-hint">从上游 /models 拉取并覆盖模型列表</span>
      </div>
      <div class="la-provider-actions">
        <LaButton class="la-set-danger" text="删除该上游" @click="removeProvider(i)"/>
      </div>
    </div>
    <div class="la-set-actions">
      <LaButton class="la-btn-tonal" text="+ 新增上游" @click="addProvider"/>
    </div>
  </div>
  <div class="la-set-group">
    <div class="la-set-group-title">agent 段配置</div>
    <div class="la-set-hint">模型 / thinking / 流式 / max_tokens</div>
    <template v-for="(st,i) in cfg.stages" :key="st.id">
      <div class="la-set-stage">
        <span class="la-set-stage-name">{{st.id}}</span>
        <LaSelect class="la-set-input" v-model="st.model" :options="modelOptions"/>
      </div>
      <div class="la-set-toggle">
        <LaToggleItem v-model="st.think" label="thinking"/>
        <LaToggleItem v-model="st.stream" label="stream"/>
        <label class="la-set-toggle-item"><span>max</span><LaInput class="la-set-max" type="number" v-model="st.max"/></label>
      </div>
    </template>
  </div>
  <div v-if="tip" class="la-set-hint">{{tip}}</div>
  <div class="la-set-actions">
    <LaButton text="保存" @click="save"/>
    <LaButton class="la-btn-tonal" text="返回" @click="back"/>
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
      <LaInput type="text" id="lite-agent-base" v-model="baseInput" @change="onBaseChange"/>
      <LaButton text="清空" @click="clearBody"/>
      <LaButton :text="view==='settings' ? '返回' : '⚙️'" @click="onSettingsBtn"/>
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
