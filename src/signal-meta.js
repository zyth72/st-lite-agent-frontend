'use strict';
// SignalMeta 包装:发送前给最后一条 user 消息挂元数据(类型/楼层号/隐藏楼层)。
// 挂载点:CHAT_COMPLETION_PROMPT_READY(只改发出去的 prompt,不动酒馆存储的消息)。
// 服务端 write_back 依赖:floor 与酒馆楼层号同一坐标系(index+1)。
//   type=new   → Signal 写 floor,正文写 floor+1
//   type=reroll→ 正文覆盖 floor(重roll不涨楼)
//   hidden     → 这些楼层从 lin-test messages 移除(隐藏=不入历史)

function stCtx() {
  try {
    return (window.SillyTavern && window.SillyTavern.getContext) ? window.SillyTavern.getContext() : null;
  } catch (e) { return null; }
}

// 当前聊天状态 → 元数据
function collectMeta() {
  const ctx = stCtx();
  const chat = (ctx && Array.isArray(ctx.chat)) ? ctx.chat : [];
  const floor = chat.length; // 最后一条消息的楼层号(1-based);追加/覆盖/删除同步全由服务端据此推导
  return { floor };
}

// prompt 就绪:包装最后一条 user 消息
function onPromptReady(data) {
  const arr = Array.isArray(data) ? data : (data && Array.isArray(data.chat) ? data.chat : null);
  if (!arr) return;
  let ui = -1;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] && arr[i].role === 'user') { ui = i; break; }
  }
  if (ui < 0) return;
  const m = arr[ui];
  if (typeof m.content !== 'string' || !m.content.trim() || m.content.includes('<SignalMeta>')) return;
  // 若预设正则已包过 <Signal>,剥壳取内文(双保险:预设停了正则也能用)
  let body = m.content;
  const sw = body.match(/<Signal>([\s\S]*?)<\/Signal>/);
  if (sw) body = sw[1].trim();
  const meta = collectMeta();
  m.content = '<SignalMeta>\n'
    + 'floor: ' + meta.floor + '\n'
    + '</SignalMeta>\n'
    + '<Signal>\n' + body + '\n</Signal>';
}

export function installSignalMeta() {
  const ctx = stCtx();
  if (ctx && ctx.eventSource && ctx.event_types && ctx.event_types.CHAT_COMPLETION_PROMPT_READY) {
    ctx.eventSource.makeFirst && ctx.eventSource.makeFirst
      ? ctx.eventSource.makeFirst(ctx.event_types.CHAT_COMPLETION_PROMPT_READY, onPromptReady)
      : ctx.eventSource.on(ctx.event_types.CHAT_COMPLETION_PROMPT_READY, onPromptReady);
    console.log('[st-lite-agent] SignalMeta 包装已挂载');
  } else {
    console.warn('[st-lite-agent] 未找到 CHAT_COMPLETION_PROMPT_READY,SignalMeta 包装未启用');
  }
}
