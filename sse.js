/**
 * SSE 连接:订阅服务端 /agent/stream 的 reset/text/stage 事件,数据喂给 render.js。
 * 连接状态圆点写 #lite-agent-status。
 */
import { renderGroups, appendText, setStageStatus } from './render.js';

let es = null;

function setStatus(ok) {
  const st = document.getElementById('lite-agent-status');
  if (st) st.className = ok ? 'ok' : 'err';
}

export function connect(base) {
  if (es) es.close();
  es = new EventSource(base + '/agent/stream');
  es.onopen = () => setStatus(true);
  es.onerror = () => setStatus(false);
  es.addEventListener('reset', (ev) => {
    try {
      const data = JSON.parse(ev.data);
      renderGroups(data.stages || []);
    } catch (e) {}
  });
  es.addEventListener('text', (ev) => {
    try {
      const data = JSON.parse(ev.data);
      appendText(data.stage, data.kind, data.text);
    } catch (e) {}
  });
  es.addEventListener('stage', (ev) => {
    try {
      const data = JSON.parse(ev.data);
      setStageStatus(data.stageId, data.status);
    } catch (e) {}
  });
}

export function disconnect() {
  if (es) { es.close(); es = null; }
}
