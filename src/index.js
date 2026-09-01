/**
 * st-lite-agent 前端插件入口(ST 扩展)。
 * 职责:环境探测(第三方/内置路径)、注入样式、挂载悬浮球/进度面板、
 *       注册扩展菜单(魔法棒)入口、挂载全屏配置界面、启动轮询。
 * 源码在 src/,manifest.json 的 js 字段指向 src/index.js。
 * 底层:Vue 3(esm-browser,含模板编译器)+ store/hooks + components,无构建。
 */
import { css } from './styles.js';
import { createApp } from './lib/vue.esm-browser.prod.js';
import App from './app.js';
import ConfigApp from './ConfigApp.js';
import LaInput from './components/LaInput.js';
import LaSelect from './components/LaSelect.js';
import LaToggleItem from './components/LaToggleItem.js';
import LaButton from './components/LaButton.js';
import { connect, base, openConfig } from './store.js';

// 第三方扩展路径比内置多一层目录;src/ 又比根多一层,故各再退一级
const IS_THIRD_PARTY = typeof location !== 'undefined' && location.pathname.includes('/extensions/third-party/');
const CORE_PATH = (IS_THIRD_PARTY ? '../../../../../..' : '../../../../') + 'script.js';

const MODULE = 'st-lite-agent';

function registerComponents(app) {
  app.component('LaInput', LaInput);
  app.component('LaSelect', LaSelect);
  app.component('LaToggleItem', LaToggleItem);
  app.component('LaButton', LaButton);
}

// 扩展菜单(魔法棒)入口:点击打开全屏配置界面
function addWandEntry() {
  const menu = document.getElementById('extensionsMenu');
  if (!menu) { console.warn('[' + MODULE + '] 未找到扩展菜单,配置入口改为悬浮球 ⚙️'); return; }
  const entry = document.createElement('div');
  entry.id = 'lite-agent-wand-entry';
  entry.className = 'list-group-item flex-container flexGap5 interactable';
  entry.innerHTML = '<div class="fa-fw fa-solid fa-bolt extensionsMenuExtensionButton" style="color:#a8c8ff"></div><span>Agent 控制台</span>';
  entry.addEventListener('click', () => openConfig());
  menu.prepend(entry);
}

function boot() {
  if (document.getElementById('lite-agent-root')) return;
  css();

  // 主应用:悬浮球 + 进度面板
  const mount = document.createElement('div');
  mount.id = 'lite-agent-root';
  document.body.appendChild(mount);
  const app = createApp(App);
  registerComponents(app);
  app.mount(mount);

  // 配置界面:全屏窗口(默认隐藏,扩展菜单入口/⚙️ 打开)
  const cfgRoot = document.createElement('div');
  cfgRoot.id = 'lite-agent-config-root';
  document.body.appendChild(cfgRoot);
  const cfgApp = createApp(ConfigApp);
  registerComponents(cfgApp);
  cfgApp.mount(cfgRoot);

  addWandEntry();
  connect();
  console.log('[' + MODULE + '] Vue 面板与配置界面已就绪,接口基址 ' + base.value);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
