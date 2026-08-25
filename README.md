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

## 依赖

- 服务端插件 `sillytavern-server-plugin` 的 `/agent/requests` 与 `/agent/steps/...` 接口(自带,无需配置)
- 仅当服务端 `agent.json` 启用流水线后才有日志数据

