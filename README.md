# st-lite-agent 前端插件

SillyTavern 前端插件:悬浮球 ⚡ + 悬浮窗,实时查看服务端 agent 流水线各段日志;全屏配置控制台,改完即热生效。

## 功能

**悬浮窗(实时日志)**

- 悬浮球 ⚡ 可拖动,点击开合悬浮窗;悬浮窗头部可拖动、可改接口基址(默认 `http://127.0.0.1:6789`,存 localStorage)
- 按服务端下发的段元数据(stageMeta)渲染流水线卡片:每段显示 状态(运行中/已完成/失败/中止)、**思维链**(流式)、输出;fan-out 子段(如 `roleplay.凛`)展开为独立卡
- json 段输出支持 原始 JSON ↔ Markdown 渲染 切换(服务端 `/agent/render-md`);一键复制
- 轮询 1.5s 增量续读落盘文件(offset 语义),服务重启/断连自愈,无需刷新页面
- 「停止」按钮中止当前轮次流水线;「清空」重置面板

**配置控制台(⚙️,全屏)**

- **模型配置**:每个 llm 段一张卡——模型下拉、thinking/stream 开关、max_tokens / timeout_s、**params JSON 编辑框**(实时校验,与上方控件双向同步;服务端语义为 params 整体替换);保存即热重载,无需重启服务
- **上游与密钥**:上游增删、Base URL、密钥(留空保持 `.env` 现状)、一键向上游拉取模型列表
- **乱入检定**:命中阈值 / 候选数量
- **服务连接**:服务地址、连接状态、流水线启停状态
- 移动端(<768px):面板近全屏;配置界面改汉堡 + 左侧抽屉导航,表单纵向堆叠

## 安装

1. 把本目录放到 `<SillyTavern>/data/<你的用户名>/extensions/st-lite-agent-frontend/`(目录名任意,但**不要**与 `public/scripts/extensions/third-party/` 下的全局扩展重名——同名时 ST 的静态层会优先伺服全局旧副本,导致改代码不生效)
2. 重启酒馆,在「扩展」面板启用 ST Lite Agent

开发调试推荐符号链接,改完刷新页面即生效:

```bash
ln -sfn /path/to/st-lite-agent-frontend <SillyTavern>/data/<用户名>/extensions/st-lite-agent-frontend
```

## 目录结构

单入口 `index.js`(manifest 声明),其余为 ES module 拆件,无构建、git pull 即用。

| 文件 | 职责 |
|---|---|
| `index.js` | 入口:环境探测、SignalMeta 包装(楼层号归一)、注入样式、挂载 面板/配置 两个 Vue 应用、启动轮询 |
| `app.js` | 悬浮球 + 悬浮窗面板(段卡片:思维链/输出/JSON↔MD/复制/折叠,球与窗拖动) |
| `store.js` | 响应式状态 + 轮询(1.5s:`getRequests` → 增量 `getStepTail`),组件只读状态、不碰网络 |
| `api.js` | **接口统一出口**:openapi 全部 12 个端点的具名封装;统一错误(非 2xx 抛 `Error`,message 取服务端 `error.message`);GET 带一次瞬断重试,POST 不盲重试 |
| `ConfigApp.js` | 全屏配置控制台(模型配置/上游与密钥/乱入检定/服务连接),params JSON 编辑器(校验 + 与控件双向同步) |
| `signal-meta.js` | SignalMeta.floor 归一:统一取最后一条 user 消息的楼层号 |
| `hooks.js` | VueUse 同名小实现(useLocalStorage / useToggle / useEventListener) |
| `components/La*.js` | 全局小组件:LaInput / LaSelect(含空项文案)/ LaToggleItem / LaButton |
| `styles.js` | M3 风格样式注入(桌面 + 移动端断点;球/面板 `position:absolute` 适配 ST 移动端 body:fixed) |
| `lib/` | vendored:Vue 3(esm-browser,含模板编译器)、marked(v12)、github-markdown-dark.css |

## 接口约定

服务端为 `st-lite-agent-server`,OpenAPI 文档由服务自托管:

```bash
# 通用形式:文档与接口同源
curl http://<server.host>:<server.port>/docs/openapi.json

# 本机当前用法(10.7.0.1 需经代理可达):
proxychains -q curl 10.7.0.1:6789/docs/openapi.json
```

| 调用点 | 端点 |
|---|---|
| store 轮询 | `GET /agent/requests`、`GET /agent/steps/{reqId}/{file}?offset=` |
| 配置控制台 | `GET`/`POST /agent/config`、`POST /agent/config/load-models` |
| 面板 | `POST /agent/render-md`、`POST /agent/stop` |
| api.js 备用(未接入 UI) | `GET /agent/stream`(SSE)、`GET /agent/tools`、`GET /v1/models`、`GET /healthz`、`POST /v1/chat/completions` |

模型名一律为 `上游名/模型名`;错误格式统一 `{"error":{"message","type"}}`;CORS 全开,可跨域直连。

## 依赖

- 服务端插件 `st-lite-agent-server`(接口自托管,含 openapi 文档)
- 仅当服务端 `agent.json` 启用流水线后才有日志数据
