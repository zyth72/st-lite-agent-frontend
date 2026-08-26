/**
 * st-lite-agent 前端插件入口:悬浮球 + 可拖动悬浮窗(SSE 流式)。
 * 职责:扩展环境探测、状态持有(基址/位置)、模块装配与 resize 处理。
 *
 * 模块划分(单入口,其余为 ES module 拆件):
 *   dom.js        DOM 构建工具
 *   styles.js     样式注入
 *   position.js   位置读写/夹取/拖动
 *   ui.js         悬浮球/面板构建与开合
 *   sse.js        SSE 连接
 *   render.js     面板内容渲染(段分组/markdown/状态图标)
 *   settings.js   ⚙️ 设置面板(agent 段/上游/密钥)
 */
import { css } from './styles.js';
import { buildBall, buildPanel, togglePanel } from './ui.js';
import { loadPos, clampPos } from './position.js';
import { connect } from './sse.js';
import { toggleSettings } from './settings.js';

const IS_THIRD_PARTY = typeof location !== 'undefined' && location.pathname.includes('/extensions/third-party/');
const CORE_PATH = IS_THIRD_PARTY ? '../../../../../' : '../../../../';
const { eventSource, event_types } = await import(CORE_PATH + 'script.js');

const MODULE = 'st-lite-agent';
const LS_BASE = 'st-lite-agent-base';
const LS_BALL = 'st-lite-agent-ball-pos';
const LS_PANEL = 'st-lite-agent-panel-pos';

let base = localStorage.getItem(LS_BASE) || 'http://127.0.0.1:7890';
let ballPos = clampPos(loadPos(LS_BALL, { right: 18, bottom: 18 }), 54, 54);
let panelPos = clampPos(loadPos(LS_PANEL, { right: 18, bottom: 76 }), 520, Math.round(window.innerHeight * 0.66));

function onBaseChange(nextBase) {
  base = nextBase;
  localStorage.setItem(LS_BASE, base);
  connect(base);
}

jQuery(async () => {
  if (document.getElementById('lite-agent-ball')) return;
  css();
  buildBall({ pos: ballPos, onToggle: togglePanel });
  buildPanel({ pos: panelPos, base, onBaseChange, onToggleSettings: () => toggleSettings(base) });
  connect(base);
  console.log('[' + MODULE + '] SSE 面板已就绪,接口基址 ' + base);

  window.addEventListener('resize', () => {
    const ball = document.getElementById('lite-agent-ball');
    const panel = document.getElementById('lite-agent-panel');
    if (ball) {
      clampPos(ballPos, ball.offsetWidth, ball.offsetHeight);
      ball.style.right = ballPos.right + 'px';
      ball.style.bottom = ballPos.bottom + 'px';
    }
    if (panel) {
      clampPos(panelPos, panel.offsetWidth, panel.offsetHeight);
      panel.style.right = panelPos.right + 'px';
      panel.style.bottom = panelPos.bottom + 'px';
    }
  });
});
