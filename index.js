/**
 * st-lite-agent 前端插件入口(ST 扩展)。
 * 职责:环境探测(第三方/内置路径)、注入样式、挂载 Vue 应用、启动轮询。
 * 底层:Vue 3(esm-browser,含模板编译器)+ store/hooks + components,无构建。
 */
import { css } from './styles.js';
import { createApp } from './lib/vue.esm-browser.prod.js';
import App from './app.js';
import LaInput from './components/LaInput.js';
import LaSelect from './components/LaSelect.js';
import LaToggleItem from './components/LaToggleItem.js';
import LaButton from './components/LaButton.js';
import { connect, base } from './store.js';

const IS_THIRD_PARTY = typeof location !== 'undefined' && location.pathname.includes('/extensions/third-party/');
const CORE_PATH = IS_THIRD_PARTY ? '../../../../../' : '../../../../';
const { eventSource, event_types } = await import(CORE_PATH + 'script.js');

const MODULE = 'st-lite-agent';

function boot() {
  if (document.getElementById('lite-agent-root')) return;
  css();
  const mount = document.createElement('div');
  mount.id = 'lite-agent-root';
  document.body.appendChild(mount);
  const app = createApp(App);
  app.component('LaInput', LaInput);
  app.component('LaSelect', LaSelect);
  app.component('LaToggleItem', LaToggleItem);
  app.component('LaButton', LaButton);
  app.mount(mount);
  connect();
  console.log('[' + MODULE + '] Vue 面板已就绪,接口基址 ' + base.value);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
