/**
 * 后端接口统一出口(st-lite-agent-server v0.2.0,/docs/openapi.json)。
 * 全部 fetch 收拢在此,组件/store 只 import 具名函数,不再自拼 URL。
 *
 * 约定:非 2xx 一律抛 Error,message 取服务端 error.message(缺省 HTTP 状态码)。
 * SSE 类(/agent/stream)返回 EventSource,由调用方自己挂监听。
 */
import { useLocalStorage } from './hooks.js';

/** 服务地址(持久化),所有请求的基址。 */
export const base = useLocalStorage('st-lite-agent-base', 'http://127.0.0.1:6789');

async function request(path, opts, retries) {
  let res;
  try {
    res = await fetch(base.value + path, opts);
  } catch (e) {
    // GET 幂等,网络错误时自动重试一次(SOCKS 代理偶发瞬断);POST 不盲重试
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 400));
      return request(path, opts, retries - 1);
    }
    throw new Error('网络错误:无法连接 ' + base.value);
  }
  if (!res.ok) {
    let msg = 'HTTP ' + res.status;
    try { const j = await res.json(); if (j && j.error && j.error.message) msg = j.error.message; } catch (e) {}
    throw new Error(msg);
  }
  return res.json();
}

function get(path) {
  return request(path, undefined, 1);
}

function post(path, body) {
  return request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }, 0);
}

/* ── 面板与前端 ─────────────────────────────────────────────── */

/** 最近请求列表 + 段元数据(轮询组装进度面板)。 */
export function getRequests() {
  return get('/agent/requests');
}

/**
 * 增量续读单段日志(reasoning/output/prompt)。
 * @param {string} reqId 请求 id(logs/steps 目录名)
 * @param {string} file  文件名,如 writer.output.txt(可含中文,如 roleplay.凛.output.txt)
 * @param {number} offset 上次响应返回的字节偏移;首次传 0
 * @returns {{offset:number, text:string, exists:boolean}} 文件尚不存在时 exists:false
 */
export function getStepTail(reqId, file, offset) {
  return get('/agent/steps/' + encodeURIComponent(reqId) + '/' + encodeURIComponent(file) + '?offset=' + (offset || 0));
}

/** 读取完整配置(段 params + 上游 + 密钥后四位)。 */
export function getConfig() {
  return get('/agent/config');
}

/**
 * 保存配置并热重载。提交什么保存什么,字段可选、只更新出现的部分。
 * @param {{stages?:Array, upstreams?:Array, builtins?:Object, keys?:Array}} update
 */
export function saveConfig(update) {
  return post('/agent/config', update);
}

/**
 * 按上游拉取模型列表(「获取模型」按钮)。
 * key 缺省用该 name 已配置密钥;上游不支持自动获取时 resolve {unsupported:true},不算错误。
 */
export function loadUpstreamModels({ name, baseurl, key }) {
  return post('/agent/config/load-models', { name, baseurl, key });
}

/** 段输出 JSON → Markdown。顶层含 scene 按空间结算格式渲染,否则通用转换。 */
export function renderMd(content) {
  return post('/agent/render-md', { content });
}

/** 中止当前正在运行的流水线;无进行中请求时也无副作用。 */
export function stopPipeline() {
  return post('/agent/stop');
}

/** 已注册 LLM 工具清单(只读)。 */
export function getTools() {
  return get('/agent/tools');
}

/** 流水线实时推送(SSE)。返回 EventSource,断连不自愈,面板轮询方案未使用,备用。 */
export function openAgentStream() {
  return new EventSource(base.value + '/agent/stream');
}

/* ── 酒馆接入(OpenAI 兼容) ────────────────────────────────── */

/** 模型列表,标识为 `上游名/模型名`。 */
export function getModels() {
  return get('/v1/models');
}

/**
 * 对话补全(整条请求进 agent 流水线,轮次串行)。
 * stream=false:流水线跑完一次性返回(标准 OpenAI 格式);
 * stream=true:返回原始 Response(text/event-stream),由调用方自行消费 SSE。
 * @returns {Promise<Object|Response>}
 */
export async function chatCompletions(body) {
  const res = await fetch(base.value + '/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = 'HTTP ' + res.status;
    try { const j = await res.json(); if (j && j.error && j.error.message) msg = j.error.message; } catch (e) {}
    throw new Error(msg);
  }
  return body && body.stream ? res : res.json();
}

/* ── 系统 ──────────────────────────────────────────────────── */

/** 健康检查;models 为当前发现的所有模型标识。 */
export function healthz() {
  return get('/healthz');
}
