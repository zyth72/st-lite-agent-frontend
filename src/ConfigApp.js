/**
 * 全屏配置界面(扩展菜单入口 → 独立窗口)。
 * 左侧导航 + 右侧内容:模型配置 / 上游与密钥 / 乱入检定 / 服务连接。
 * 数据源:GET/POST /agent/config(保存即热生效,无需重启服务),接口统一走 api.js。
 */
import { defineComponent, ref, reactive, computed } from './lib/vue.esm-browser.prod.js';
import * as S from './store.js';
import { getConfig, saveConfig, loadUpstreamModels } from './api.js';
import LaInput from './components/LaInput.js';
import LaSelect from './components/LaSelect.js';
import LaToggleItem from './components/LaToggleItem.js';
import LaButton from './components/LaButton.js';

const SECTIONS = [
  { id: 'stages', icon: '🧩', label: '模型配置', hint: '每个 llm 段一张卡片,保存即热生效' },
  { id: 'upstreams', icon: '🔗', label: '上游与密钥', hint: '上游地址 / 密钥(.env)/ 模型列表' },
  { id: 'intrude', icon: '🎲', label: '乱入检定', hint: '掷 1-100,≥阈值时随机选 count 名候选' },
  { id: 'connection', icon: '🌐', label: '服务连接', hint: 'agent 服务地址与连接状态' },
];

const StageCards = defineComponent({
  props: { stages: Array, modelOptions: Array },
  setup(props) {
    // 实时校验:合法 JSON 对象返回 '',否则返回错误文案(空文本视为未设置)
    function jsonErr(st) {
      const t = (st.paramsJson || '').trim();
      if (!t) return '';
      let v;
      try { v = JSON.parse(t); } catch (e) { return 'JSON 语法错误:' + String(e.message).slice(0, 90); }
      if (typeof v !== 'object' || v === null || Array.isArray(v)) return 'params 必须是 JSON 对象 { … }';
      return '';
    }
    // 双向同步:JSON 编辑(合法时)→ 控件;避免保存时控件旧值覆盖用户手改的 JSON
    function syncFromJson(st) {
      if (jsonErr(st)) return;
      const p = JSON.parse(st.paramsJson || '{}');
      st.think = !!(p.thinking && p.thinking.type === 'enabled');
      st.stream = !!p.stream;
      st.max = p.max_tokens != null ? String(p.max_tokens) : '';
      st.timeout = p.timeout_s != null ? String(p.timeout_s) : '';
    }
    // 控件变动 → 写回 JSON 文本
    function syncToJson(st) {
      let p;
      try { p = JSON.parse(st.paramsJson || '{}') || {}; } catch (e) { return; }
      if (typeof p !== 'object' || p === null || Array.isArray(p)) return;
      p.stream = !!st.stream;
      p.thinking = (p.thinking && typeof p.thinking === 'object')
        ? { ...p.thinking, type: st.think ? 'enabled' : 'disabled' }
        : { type: st.think ? 'enabled' : 'disabled' };
      if (st.max !== '') p.max_tokens = Number(st.max); else delete p.max_tokens;
      if (st.timeout !== '') p.timeout_s = Number(st.timeout); else delete p.timeout_s;
      st.paramsJson = JSON.stringify(p, null, 2);
    }
    return { jsonErr, syncFromJson, syncToJson };
  },
  template: `
  <div class="lcfg-cards">
    <div v-for="st in stages" :key="st.id" class="lcfg-card">
      <div class="lcfg-card-head"><span class="lcfg-card-icon">🧩</span><span class="lcfg-card-title">{{ st.id }}</span></div>
      <div class="lcfg-row"><span class="lcfg-label">模型</span>
        <LaSelect class="lcfg-input" v-model="st.model" :options="modelOptions"/>
      </div>
      <div class="lcfg-row"><span class="lcfg-label">参数</span>
        <div class="lcfg-toggles">
          <LaToggleItem v-model="st.think" label="thinking" @update:modelValue="syncToJson(st)"/>
          <LaToggleItem v-model="st.stream" label="stream" @update:modelValue="syncToJson(st)"/>
        </div>
      </div>
      <div class="lcfg-row"><span class="lcfg-label">限制</span>
        <div class="lcfg-nums">
          <label class="lcfg-num"><span>max_tokens</span><LaInput type="number" class="lcfg-num-input" v-model="st.max" @update:modelValue="syncToJson(st)"/></label>
          <label class="lcfg-num"><span>timeout_s</span><LaInput type="number" class="lcfg-num-input" v-model="st.timeout" @update:modelValue="syncToJson(st)"/></label>
        </div>
      </div>
      <div class="lcfg-row top"><span class="lcfg-label">params</span>
        <div class="lcfg-json-wrap">
          <textarea class="lcfg-json" :class="{err: jsonErr(st)}" rows="6" spellcheck="false" v-model="st.paramsJson" @input="syncFromJson(st)" placeholder='{"temperature": 0.3}'></textarea>
          <div v-if="jsonErr(st)" class="lcfg-json-err">{{ jsonErr(st) }}</div>
        </div>
      </div>
    </div>
  </div>
  `
});

const UpstreamCards = defineComponent({
  props: { providers: Array },
  setup(props, { emit }) {
    function addModel(p) { const v = (p.newModel || '').trim(); if (v && !p.models.includes(v)) { p.models.push(v); p.newModel = ''; } }
    function remove(i) { emit('remove', i); }
    return { props, addModel, remove };
  },
  template: `
  <div class="lcfg-cards">
    <div v-for="(p,i) in providers" :key="i" class="lcfg-card">
      <div class="lcfg-card-head">
        <span class="lcfg-card-icon">🔗</span><span class="lcfg-card-title">{{ p.name || '(新上游)' }}</span>
        <LaButton class="lcfg-tonal" text="🧭 获取模型" @click="$emit('load', p)"/>
        <LaButton class="lcfg-danger" text="删除" @click="remove(i)"/>
      </div>
      <div class="lcfg-row"><span class="lcfg-label">名称</span><LaInput class="lcfg-input" v-model="p.name" placeholder="如 deepseek / 火山"/></div>
      <div class="lcfg-row"><span class="lcfg-label">Base URL</span><LaInput class="lcfg-input" v-model="p.baseurl" placeholder="https://api.deepseek.com/v1"/></div>
      <div class="lcfg-row"><span class="lcfg-label">密钥</span><LaInput class="lcfg-input" type="password" v-model="p.key" :placeholder="p.keyHint ? '已配置(···'+p.keyHint+')，留空保持不变' : '填入 API Key'"/></div>
      <div class="lcfg-row"><span class="lcfg-label">模型</span>
        <div class="lcfg-models">
          <span v-for="(m,j) in p.models" :key="j" class="lcfg-chip">{{ m }}<b class="lcfg-chip-x" @click="p.models.splice(j,1)">×</b></span>
          <LaInput class="lcfg-chip-input" v-model="p.newModel" placeholder="手动添加模型名" @keyup.enter="addModel(p)"/>
        </div>
      </div>
    </div>
  </div>
  `
});

export default defineComponent({
  components: { LaInput, LaSelect, LaToggleItem, LaButton, StageCards, UpstreamCards },
  setup() {
    const section = ref('stages');
    const navOpen = ref(false);
    const tip = ref('');
    const tipKind = ref('');
    const loaded = ref(false);
    const stages = ref([]);
    const providers = ref([]);
    const intrude = reactive({ threshold: 90, count: 3 });
    const baseInput = ref(S.base.value);
    const enabled = ref(false);

    const modelOptions = computed(() => {
      const all = [];
      (providers.value || []).forEach((p) => (p.models || []).forEach((m) => all.push(p.name + '/' + m)));
      (stages.value || []).forEach((st) => { if (st.model && !all.includes(st.model)) all.unshift(st.model); });
      return all;
    });

    function toEditable(d) {
      const keys = d.keys || [];
      providers.value = (d.providers || []).map((p) => {
        const ki = keys.find((k) => k.name === p.name);
        return { name: p.name, baseurl: p.baseurl, models: (p.models || []).slice(), keyHint: ki ? ki.hint : '', key: '', newModel: '' };
      });
      stages.value = (d.stages || []).filter((s) => s.type === 'llm').map((st) => {
        const p = (st.params && typeof st.params === 'object') ? st.params : {};
        return {
          id: st.id,
          model: st.model || '',
          think: st.thinking === 'enabled',
          stream: !!st.stream,
          max: st.max_tokens != null ? String(st.max_tokens) : '',
          timeout: p.timeout_s != null ? String(p.timeout_s) : '',
          paramsJson: JSON.stringify(p, null, 2),
        };
      });
      const ri = (d.builtins && d.builtins.roll_intrude) || {};
      intrude.threshold = Number.isInteger(ri.threshold) ? ri.threshold : 90;
      intrude.count = Number.isInteger(ri.count) ? ri.count : 3;
      enabled.value = !!d.enabled;
    }

    async function load() {
      try {
        toEditable(await getConfig());
        loaded.value = true;
        tip.value = '';
      } catch (e) {
        tip.value = '读取配置失败: ' + e.message;
        tipKind.value = 'err';
      }
    }

    function watchOpen() {
      if (S.configOpen.value && !loaded.value) load();
      if (!S.configOpen.value) loaded.value = false;
    }

    // params 键写删:空值 = 删除该键(未设置)
    function setNum(p, k, v) { if (v !== '' && v != null && !Number.isNaN(Number(v))) p[k] = Number(v); else delete p[k]; }

    async function saveStages() {
      const payload = [];
      for (const st of stages.value) {
        const t = (st.paramsJson || '').trim();
        let p;
        try { p = t ? JSON.parse(t) : {}; }
        catch (e) { tip.value = '保存失败:' + st.id + ' 段 params 不是合法 JSON'; tipKind.value = 'err'; return; }
        if (typeof p !== 'object' || p === null || Array.isArray(p)) {
          tip.value = '保存失败:' + st.id + ' 段 params 必须是 JSON 对象'; tipKind.value = 'err'; return;
        }
        // 服务端语义:提交 params 即整体替换,同请求的顶层 thinking/stream/max_tokens 被忽略——
        // 卡片控件(thinking/stream/max_tokens/timeout_s)为准写回 params 后整体提交。
        p.stream = !!st.stream;
        p.thinking = (p.thinking && typeof p.thinking === 'object')
          ? { ...p.thinking, type: st.think ? 'enabled' : 'disabled' }
          : { type: st.think ? 'enabled' : 'disabled' };
        setNum(p, 'max_tokens', st.max);
        setNum(p, 'timeout_s', st.timeout);
        payload.push({ id: st.id, model: st.model, params: p });
      }
      try {
        await saveConfig({ stages: payload });
        await load(); // 重开拉取,textarea 归一化为服务端最新内容(load 会清 tip,故提示放在其后)
        tip.value = '模型配置已保存并热生效';
        tipKind.value = 'ok';
      } catch (e) { tip.value = '保存失败: ' + e.message; tipKind.value = 'err'; }
    }

    async function saveUpstreams() {
      try {
        const list = providers.value.filter((p) => p.name && p.baseurl).map((p) => {
          const u = { name: p.name, baseurl: p.baseurl, models: p.models };
          if (p.key) u.apiKey = p.key; // 填了才带;留空 = 保持 config 已有密钥
          return u;
        });
        await saveConfig({ upstreams: list });
        tip.value = '上游与密钥已保存并热生效';
        tipKind.value = 'ok';
        await load();
      } catch (e) { tip.value = '保存失败: ' + e.message; tipKind.value = 'err'; }
    }

    function addProvider() { providers.value.push({ name: '', baseurl: '', models: [], keyHint: '', key: '', newModel: '' }); }
    function removeProvider(i) { providers.value.splice(i, 1); }

    async function loadModels(p) {
      if (!p.name || !p.baseurl) { tip.value = '请先填写该上游的名称与 Base URL'; tipKind.value = 'err'; return; }
      if (!p.key && !p.keyHint) { tip.value = '请先填入该上游的 API Key 再点获取模型'; tipKind.value = 'err'; return; }
      try {
        const j = await loadUpstreamModels({ name: p.name, baseurl: p.baseurl, key: p.key });
        if (j.unsupported) { p.models = []; tip.value = '该上游不支持自动获取,请手动添加模型'; tipKind.value = 'err'; return; }
        p.models = j.models || [];
        await saveUpstreams(); // 直接写 config.json 并热生效,不再依赖手动保存
        tip.value = '已获取 ' + p.models.length + ' 个模型并写入 config';
        tipKind.value = 'ok';
      } catch (e) { tip.value = '获取模型失败: ' + e.message; tipKind.value = 'err'; }
    }

    async function saveIntrude() {
      try {
        await saveConfig({
          builtins: { roll_intrude: { threshold: Number(intrude.threshold), count: Number(intrude.count) } },
        });
        tip.value = '乱入检定已保存并热生效';
        tipKind.value = 'ok';
      } catch (e) { tip.value = '保存失败: ' + e.message; tipKind.value = 'err'; }
    }

    function saveBase() { S.setBase(baseInput.value); tip.value = '服务地址已更新'; tipKind.value = 'ok'; }
    // 移动端抽屉导航:选中即收起
    function pickSection(id) { section.value = id; navOpen.value = false; }
    function onBaseInput(v) { baseInput.value = v; }

    return {
      SECTIONS, section, navOpen, pickSection, tip, tipKind, stages, providers, intrude, baseInput, enabled,
      modelOptions, load, saveStages, saveUpstreams, saveIntrude, addProvider, removeProvider,
      loadModels, saveBase, onBaseInput,
      configOpen: S.configOpen, closeConfig: S.closeConfig, connected: S.connected,
    };
  },
  watch: {
    configOpen(open) { if (open) { this.tip = ''; this.load(); } else { this.navOpen = false; } },
  },
  template: `
<div id="lite-agent-config" :class="{open: configOpen}">
  <div class="lcfg-shell">
    <div class="lcfg-head">
      <button class="lcfg-burger" type="button" aria-label="菜单" @click="navOpen=!navOpen">☰</button>
      <span class="lcfg-brand">st-lite-agent 控制台</span>
      <span class="lcfg-status" :class="{ok: connected}"></span>
      <LaButton class="lcfg-close" text="✕ 关闭" @click="closeConfig"/>
    </div>
    <div class="lcfg-body">
      <div class="lcfg-backdrop" :class="{open: navOpen}" @click="navOpen=false"></div>
      <div class="lcfg-nav" :class="{open: navOpen}">
        <div v-for="s in SECTIONS" :key="s.id" class="lcfg-nav-item" :class="{active: section===s.id}" @click="pickSection(s.id)">
          <span class="lcfg-nav-icon">{{ s.icon }}</span><span>{{ s.label }}</span>
        </div>
      </div>
      <div class="lcfg-content">
        <div class="lcfg-section-title">{{ (SECTIONS.find(s=>s.id===section)||{}).label }}</div>
        <div class="lcfg-section-hint">{{ (SECTIONS.find(s=>s.id===section)||{}).hint }}</div>

        <template v-if="section==='stages'">
          <StageCards :stages="stages" :model-options="modelOptions"/>
          <div class="lcfg-actions"><LaButton text="💾 保存模型配置" @click="saveStages"/></div>
          <div class="lcfg-hint">params 整体替换,直接编辑 JSON;JSON ↔ 控件(thinking/stream/max_tokens/timeout_s)双向同步;输入留空 = 删除该键。</div>
        </template>

        <template v-if="section==='upstreams'">
          <UpstreamCards :providers="providers" @remove="removeProvider" @load="loadModels"/>
          <div class="lcfg-actions"><LaButton class="lcfg-tonal" text="+ 新增上游" @click="addProvider"/></div>
          <div class="lcfg-actions">
            <LaButton text="💾 保存上游与密钥" @click="saveUpstreams"/>
          </div>
          <div class="lcfg-hint">密钥留空 = 保持 .env 现状;保存后热生效,无需重启服务。</div>
        </template>

        <template v-if="section==='intrude'">
          <div class="lcfg-card lcfg-intrude">
            <div class="lcfg-row"><span class="lcfg-label">命中阈值</span>
              <LaInput type="number" class="lcfg-num-input" v-model="intrude.threshold"/>
              <span class="lcfg-hint">掷 1-100,≥ 阈值即命中</span>
            </div>
            <div class="lcfg-row"><span class="lcfg-label">候选数量</span>
              <LaInput type="number" class="lcfg-num-input" v-model="intrude.count"/>
              <span class="lcfg-hint">命中时随机给出的候选舰娘数</span>
            </div>
          </div>
          <div class="lcfg-actions"><LaButton text="💾 保存乱入检定" @click="saveIntrude"/></div>
        </template>

        <template v-if="section==='connection'">
          <div class="lcfg-card">
            <div class="lcfg-row"><span class="lcfg-label">服务地址</span>
              <LaInput class="lcfg-input" v-model="baseInput" placeholder="http://127.0.0.1:6789"/>
            </div>
            <div class="lcfg-row"><span class="lcfg-label">连接状态</span>
              <span class="lcfg-status" :class="{ok: connected}">{{ connected ? '已连接' : '未连接' }}</span>
            </div>
            <div class="lcfg-row"><span class="lcfg-label">流水线</span>
              <span class="lcfg-status" :class="{ok: enabled}">{{ enabled ? '运行中' : '未启用' }}</span>
            </div>
          </div>
          <div class="lcfg-actions"><LaButton text="💾 保存服务地址" @click="saveBase"/></div>
        </template>

        <div v-if="tip" class="lcfg-tip" :class="tipKind">{{ tip }}</div>
      </div>
    </div>
  </div>
</div>
`
});
