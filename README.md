# st-lite-agent 前端插件

SillyTavern 前端插件:悬浮球 ⚡ + 悬浮窗,实时查看服务端 agent 各步日志。

## 功能

- 悬浮球:可拖动,点击开合悬浮窗
- 悬浮窗四个页签:**思维链**(writer reasoning,流式)/ **正文** / **结算**(backstage 输出)/ **写作提示词**
- 请求下拉列表:历史请求按时间排列,勾选「跟随最新」自动切换
- 流式传输:每 0.8s 增量拉取文件新内容,边生成边显示,自动滚到底部
- 接口基址可改(默认 `http://127.0.0.1:7890`,保存在浏览器 localStorage)

## 安装

1. 把本目录拷贝到 `<SillyTavern>/data/<你的用户名>/extensions/st-lite-agent/`
2. 重启酒馆,在「扩展」面板勾选启用 ST Lite Agent

## 目录结构

单入口 `index.js`(manifest 声明的加载文件),其余为 ES module 拆件,随目录一起部署:

| 文件 | 职责 |
|---|---|
| `index.js` | 入口:环境探测、状态持有(基址/位置)、模块装配、resize 处理 |
| `dom.js` | `h()` DOM 构建工具 |
| `styles.js` | 样式注入(球/面板为 `position:absolute`,适配 ST 移动端 body:fixed) |
| `position.js` | 位置读写 localStorage / 夹取 / 拖动 |
| `ui.js` | 悬浮球与面板构建、开合 |
| `sse.js` | SSE 连接(`/agent/stream` 的 reset/text/stage 事件) |
| `render.js` | 面板内容渲染(段分组/markdown 队列/状态图标) |
| `settings.js` | ⚙️ 设置面板(读写 `/agent/config`) |
| `marked.esm.js` | vendored marked(v12) |

## 依赖

- 服务端插件 `sillytavern-server-plugin` 的 `/agent/requests` 与 `/agent/steps/...` 接口(自带,无需配置)
- 仅当服务端 `agent.json` 启用流水线后才有日志数据

