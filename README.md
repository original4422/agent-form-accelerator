# Agent Form Accelerator — 验证原型

给 Codex 和 Claude Code 共用的网页填表执行工具。已有 Agent 负责理解资料、匹配字段，本地扩展负责批量填写和回读校验，不另行调用模型 API。

**当前状态：工程原型。相对优化后的批量脚本，尚未证明提速；尚未验证真实招聘网站。**

## 看结果

- [原型验证结论](prototype/reports/VALIDATION.md)：结论、Codex 实测、Claude 登录阻塞与下一步。
- [执行层测量报告](prototype/reports/executor-benchmark.md)：三类本地表单、三种执行方式、每组五次。完整失败也保留在 JSON 中。
- [功能检查](prototype/reports/functional-checks.json)：真实 Chromium 扩展、页面自身数据状态与 MCP 协议。
- [产品与验证决策](prototype/DECISIONS.md)：已确定的范围、未验证假设与下一步门槛。

## 一分钟启动本地演示

需要 Node.js 20+。

```bash
npm ci
PLAYWRIGHT_SKIP_BROWSER_GC=1 npx playwright install chromium
npm run demo
```

这会打开**独立的测试浏览器**，自动加载扩展、连接本地表单。它不会使用你常用浏览器的登录资料。表单上的姓名等数据均应使用虚构示例。

运行检查和测量：

```bash
npm run check
npm run bench
node prototype/bench/hosts.mjs
```

最后一个命令会使用本机已有的 Codex/Claude Code 登录，分别调用模型完成一次虚构资料填表。两端只注入本次运行的 MCP 配置，不改全局配置。该测试是**接入验证**，不是原生浏览器工具的速度基准。原始宿主日志保存在被 Git 忽略的 `prototype/reports/private/`。

Codex 测试通过官方 `--approve-for-me` 让自动审查器判断本地表单写入；审批仍可能拒绝操作。Claude 测试显式允许本次连接的两个表单工具。宿主测试的所有尝试都保留在报告中。

## 在日常浏览器中试用

1. 在项目目录执行 `npm start`。
2. Chrome 打开 `chrome://extensions`，启用开发者模式，加载 `prototype/extension/`。
3. 打开要填写的页面，点击扩展。连接地址与配对码见 `.runtime/session.json`；该文件只在本机使用、权限为 0600、已从 Git 排除。
4. 点击“连接当前页”。扩展仅操作该标签页，访问权限来自你点击扩展时授予的 `activeTab`；更换网站需要重新连接。点击“断开”停止连接。
5. 将本项目 MCP 接入所用 Agent，并让它读取 [工作流 Skill](prototype/skills/form-accelerator/SKILL.md)。

Codex 临时接入（保留已有用户配置）：

```bash
codex -c 'mcp_servers.afa.command="node"' \
  -c 'mcp_servers.afa.args=["/ABSOLUTE/PATH/agent-form-accelerator/prototype/src/mcp.mjs"]'
```

Claude Code 临时接入：

```bash
claude --mcp-config '{"mcpServers":{"afa":{"command":"node","args":["/ABSOLUTE/PATH/agent-form-accelerator/prototype/src/mcp.mjs"]}}}'
```

替换示例中的绝对路径。日常使用不必修改全局 Skill 或 MCP 配置；第一版的 Skill 是项目内待验证资源。CLI 演示使用的隔离参数见 `prototype/bench/hosts.mjs`。

## 支持边界

- 主文档内的原生文本、日期、数字、单选、复选、原生下拉框；观察到的添加行按钮。
- 返回带分组的字段列表、选项、引用、页面快照；批量填写后回读值并检查 HTML validity。
- 旧快照、替换的节点、变更的标签/选项会停止旧计划。没有任意脚本、选择器、提交或导航接口。
- 自定义 ARIA 下拉、iframe、shadow DOM、文件上传、跨页流程尚未实现；原型不会把它们报告成已完成。
- 同一时刻只连接一个标签页；不要让两个宿主同时填写同一张表。
- 同步回读不能保证应用/服务器接受，也不能捕获任意延迟的异步修改。宿主需最终独立检查。

资料流向：页面可见字段和值 → 本地连接 → 当前 Agent。执行核心不调用外部模型，但宿主仍会按它的正常机制处理这些资料。扩展不持久保存填写资料；连接码只在扩展会话存储中保留。

## 仓库布局

```text
prototype/extension/    Chrome 扩展与表单运行时
prototype/src/          本地桥接和 stdio MCP
prototype/fixtures/     三个独立可核验的表单应用
prototype/bench/        功能、执行层速度和宿主接入验证
prototype/reports/      可追溯的测量结果
prototype/skills/       两端共用的工作流说明
```

代码在 `prototype/validation` 分支，项目名与正式 API 尚未定稿。依赖锁定在 `package-lock.json`。这是测量原型，不是已发布产品。
