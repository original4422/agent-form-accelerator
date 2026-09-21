# 登录后再冻结：Codex 表单诊断入口

2026-09-21。工程接入验证，无新的速度测量，无真实账户登录或申请提交。

## 结果

新增可选 `--offline-after-ready`：独立临时浏览器先联网，由用户手动登录并进入最终表单。按 Enter 后切断页面 HTTP(S)/WebSocket 连接，完成检查才发布 Codex MCP 连接文件。默认在线入口行为保留。

本地虚构登录、懒加载脚本、长连接、真实 stdio MCP 填写、关闭与取消检查 10/10；转发器 TCP/TLS 检查 3/3；原 companion 回归 11/11。仅证明这套本地检查中的行为，不证明 Moka/飞书登录后的兼容性。测试没有调用模型；MCP 协议检查不等于新的 Codex 模型任务实测。

```bash
npm run browser -- --url "https://目标招聘页" --source "/绝对路径/虚构资料.md" --offline-after-ready
```

在浏览器中手动登录、进入目标表单、等待必要内容加载；回终端按 Enter，再在另一终端运行打印的 Codex 命令。等待期间没有可用连接文件或控制服务。EOF、关闭初始标签页或 Ctrl+C 都会撤销连接并删除本次临时资料。不要关闭后再用该临时 profile 在线重开，离线草稿可能存于页面本地存储；正常退出会删除整个 profile。

## 失败如何改变了设计

第一版用 Playwright 的 request/requestfinished/requestfailed 集合判断请求是否结束。模拟登录调用 `await fetch()` 后立刻导航，服务端已响应，但 `/test-login` 没有产生结束事件，永久剩余一个请求。CDP Network 同样未报告 loadingFinished/loadingFailed；response.finished() 没有完成。尝试 Page.stopLoading 也没有解决该样本。门禁拒绝开放连接，不能靠忽略该请求来“修好”测试，也不能据此断言具体浏览器内部根因。

最终由浏览器专用、本地回环地址上的 SOCKS5 CONNECT 转发器持有 TCP 连接。冻结先同步关闭新连接入口，再销毁并等待现有客户端及上游连接关闭。Playwright offline、HTTP 路由拦截、WebSocket 双向消息门禁和关闭作为第二层。缺失的请求结束事件仍作为诊断计数 `observedUnfinishedRequests` 保留；放行依据是传输连接已切断，不再声称请求计数归零。

转发器不解密 TLS、不安装证书、不记录 URL/请求体/凭据、不更改系统代理。浏览器仅配置这一代理，不设置 DIRECT fallback，并显式去掉默认 localhost bypass。SOCKS 仅实现 CONNECT，拒绝其他命令。只对该离线实验模式启用；正常 companion 不经过此转发器。初始化前禁用 Service Worker，使用一次性 profile，避免遗留后台 worker 和后续在线重放草稿。

实现过程中两次失败均保留：冻结时新到达的拒绝连接也进入计数，造成 PROXY_CONNECTIONS_REMAIN；修为拒绝连接不进入已放行连接集合。随后流测试错误监听请求对象关闭，改成监听持续响应对象关闭，才正确观测服务端流终止。没有改动模拟登录消费响应体来规避原始缺失事件。

## 验证范围与限制

- 本地测试服务在冻结前收到登录、脚本和 WebSocket 消息；冻结后 MCP 填入两个来源字段，缺失日期留空并报告，提交次数为零。
- 字段输入触发 fetch POST、sendBeacon、既有/新 WebSocket、Worker fetch/WebSocket 和 iframe 请求；服务端新增 HTTP/WS 记录均为零。
- 冻结前创建的 EventSource 持续响应在开放 Codex 前被切断；TLS 流也会终止，冻结后不能建立新隧道。TLS 测试只信任临时本地测试证书，未削弱运行时证书验证。
- 退出删除连接文件与包含虚构离线草稿的 profile；CLI 的 Enter/EOF/SIGINT 检查通过。强杀进程或系统崩溃的清理无法保证，不应复用残留临时 profile。
- 这是页面 HTTP(S)/WebSocket 的诊断模式，**不是系统级断网沙箱**。没有验证 WebRTC、WebTransport 或浏览器扩展的其他通信通道；遇到这些通道的站点不适用当前隔离结论。用户手动登录期间仍正常联网。
- 断网后远程选项搜索、附件、跨页、服务器校验与懒加载可能失效。其失败应记录为实验环境限制，不能直接认定原型或网站不支持。此模式不能测完整在线申请耗时。
- 新转发器可能影响某些网络或企业代理环境，尚未验证。没有真实账户或真实招聘表单数据。

## 复现与证据

```bash
node prototype/bench/offline-ready-check.mjs
node prototype/bench/freeze-proxy-check.mjs
node prototype/bench/companion-check.mjs
node prototype/bench/offline-ready-probe.mjs
```

最终结果：`offline-ready-checks.json`、`freeze-proxy-checks.json`、`companion-checks.json`。失败记录：`offline-ready-initial-failure.json`、`offline-ready-proxy-initial-failure.json`、`offline-ready-stream-check-failure.json`。诊断：`offline-ready-network-probe-initial.json`、`offline-ready-network-probe-cdp.json` 和最终 `offline-ready-network-probe.json`；旧探针包含本地 data: 图标，不含真实账户资料。最初失败检查还存在重复 setup 未关闭旧实例的测试清理问题，已修复并终止当次进程。

官方依据：[Chromium 代理文档](https://chromium.googlesource.com/chromium/src/+/HEAD/net/docs/proxy.md) 描述 SOCKS5 的 TCP 范围与 `<-loopback>`；[CDP Page 文档](https://chromedevtools.github.io/devtools-protocol/1-3/Page/) 描述 stopLoading，但本地反例没有因此恢复缺失的请求结束事件。

## 对主方向的影响

这次修复的是验证入口，不是加速算法。此前浏览器局部 6.51→2.11 秒而完整任务 48.95→47.82 秒，说明主要收益应来自减少宿主模型往返。条件搜索合并后的 47.32→30.53 秒，以及两个目录的小样本恢复结果，支持继续验证这一方向；仍不支持完整招聘流程稳定 2×。下一项有效证据应来自用户实际使用的登录后表单、未预映射资料及完整任务，不再通过同一合成页反复采样追求倍数。
