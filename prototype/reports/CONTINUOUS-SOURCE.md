# 同一 Codex 会话补资料后继续填写

2026-09-30。Codex CLI 0.155.1，复用已有登录与默认 `gpt-6-astra / high`。生产代码基线 `be5f660`；新增 app-server 实验驱动和透明 MCP 观测代理，原速度 benchmark 未改。

**修复审批驱动后，一组真实两 turn 连续填写通过。** 第一轮填写 10 个已知目标、保留并报告缺少的到岗日期；测试所有者修改同一个临时资料文件。第二轮提示不含日期值，Codex 调用 `form_reload_source`，随后用新版本绑定日期；原字段、第一轮历史回执均保留，零提交。

## 实测证据

完整记录：[修复后结果](continuous-source-model-1790725814097.json)。两 turn 分别 28.895 s、15.004 s；本项是功能验证，没有速度对照。

| 检查 | 结果 |
| --- | --- |
| 工具序列 | `apply(v1)` → 用户修改原文件 → `reload` → `apply(v2)` |
| 第一轮 oracle | 10 个已知目标、两个教育经历及校区正确；日期空；明确报告缺失 |
| 第二轮 oracle | fixture 完整状态等于第一轮状态加新日期；日期 DOM 正确；零提交 |
| source | 相同 session 前缀，generation 1→2，内容 hash 变化；第二次 apply 使用新版 |
| 会话身份 | 一个 app-server、同一 thread、一个真实 MCP 子进程、一个 Chromium 主进程；三检查点 PID/启动时间、MCP 启动 nonce 相同 |
| 页面身份 | `performance.timeOrigin` 全程不变 |
| 回执 | 第一轮导出内容未被覆盖；新回执记录新版 source |
| 原生权限 | ephemeral thread，read-only，on-request/user；只暴露 5 个 AFA 工具 |
| 单次审批 | 两次 `form_apply_bindings` 各批准一次，没有 session/always 持久授权 |
| 清理 | app-server/MCP/代理/Chromium 退出，fixture 关闭，临时 profile/session config 删除；用户 config.toml hash 未变 |

**工具目录没有自动刷新。** AFA 发出一次 `notifications/tools/list_changed`，该通知之后没有观察到 Codex 请求 `tools/list`。成功续填来自 reload 返回的完整新版上下文；更新 server 端工具描述并不等于宿主已重新取得描述。

两次真实尝试分别冻结、核对了 42 项运行源码。最终批次测前后 hash 一致，见 [最终指纹](continuous-final-hashes.json)；首次驱动与指纹单独保留在 [初次指纹](continuous-initial-hashes.json) 和 `source-snapshots/continuous-initial/`。生产代码在两次尝试之间未改。

真实成功样本对应可追溯提交 [51cedd2](https://github.com/original4422/agent-form-accelerator/commit/51cedd2)。随后独立审查发现并修复三个失败处理边界：turn/start 等待期间取消后立即 interrupt，以及取消后不再开新 turn；拒绝 `properties:true/1` 等非对象审批 schema；缺失 Codex 命令时等待真实 close 事件并关闭日志。这些后续修复只跑了无模型回归，没有重跑实测；上面的 hash 与成功结果对应测量提交。

## 保留的失败与修复

首次真实尝试在第一轮收到 `mcpServer/elicitation/request` 时停止，尚未执行填写、未进入第二轮：[失败记录](continuous-source-model-1790725580165.json)。请求是当前 AFA 在指定 localhost 页面执行 `form_apply_bindings`；最初驱动没有处理原生 MCP 工具审批协议。该结果不计作两 turn 成功。

随后只补充单次白名单审批：精确匹配当前 thread/turn、`afa`、form 模式、`codex_approval_kind=mcp_tool_call`、空表单 schema、精确工具消息、apply/search/expand、owner 的完整 fixture URL 与已观察的当前 sourceVersion。返回 `action:accept, content:{}`，不持久授权。其它审批仍停止。修复后另执行上面一组真实验证，没有再次重试。

无模型准备还发现了三项协议细节：

- `thread/start.config` 的 dotted key 不能照搬 CLI TOML 的名字引号；首次因此出现 invalid transport。并修复了清理后 session 路径 getter 已清空的检查错误。
- 禁用用户配置中的单个插件还会保留 `codex_apps`。加入本次线程的 apps/plugins/hooks 等 feature 覆盖，且逐名禁用无关 MCP 后只剩 AFA。全局配置未修改。[准备失败](continuous-source-preflight-1790725383650.json)
- `mcpServerStatus/list` 即使传 threadId，在本机版本也额外启动了第二个 AFA 进程。移除这项观察，用 thread-scoped startup ready 事件与实际 stdio 工具目录确认就绪。[双进程失败](continuous-source-preflight-1790725411004.json)

最终无模型准备通过：[审批修复前](continuous-source-preflight-1790725506794.json)、[审批修复后](continuous-source-preflight-1790725750606.json)。直接通过 app-server 调用 context/reload，MCP 与浏览器不变；同样没有观察到通知后的 tools/list 重取。

## 复现入口

安装仓库依赖、Chromium 和已登录的 Codex CLI 后：

```bash
npm run check:continuous                 # 不需 Codex/浏览器；协议边界检查
npm run bench:continuous -- --preflight  # 真实 app-server/MCP/浏览器，无模型
npm run bench:continuous -- --model      # 一组真实两 turn，使用当前默认模型和额度
```

最终检查包括 3 个允许与 18 个拒绝审批用例、缺失可执行文件、初始化无响应时关闭自有子进程、超时后迟到的 config/read 响应不进入日志、启动 turn 前/等待响应时取消、turn/interrupt 通知和定向退出。`check:continuous` 已加入 CI。

驱动创建专用 stdio app-server，持续保留 stdin；不调用 exec resume、MCP 配置 reload 或全局配置写接口。用户认证正常复用，不复制凭据。只读 sandbox 与审批保持原生协议；测试所有者在模型外修改虚构资料。

原始 stdout/stderr、协议、资料和历史回执在 gitignored 的 `prototype/reports/private/continuous-*`，目录 0700、文件 0600。公开 JSON 只保留检查结果、模型、版本关系、进程身份和调用顺序。实验结束会清理连接和 profile，私有诊断记录留在本机。
