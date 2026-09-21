# Agent Form Accelerator — 验证原型

给 Codex 和 Claude Code 共用的网页填表执行工具。已有 Agent 负责理解资料、匹配字段，本地扩展负责批量填写和回读校验，不另行调用模型 API。

**当前状态：工程原型。已能用 Codex 将未映射的中文 Markdown 资料绑定到英文表单。React/Radix 样本中，复用重复组模板把两次宿主请求合并为一次，完整中位耗时减少约 27%。官方工具生成脚本出现了定位错误，不能用恢复造成的差距宣称稳定倍数。尚未证明真实招聘页完整流程稳定提速 2 倍。**

## 看结果

- [按问题表达复选集合](prototype/reports/DECISION-CONTEXT.md)：同样59目标、相同Codex权限，三组对照中位49.24→42.61秒，约减少13.5%；完整任务两倍目标仍未达成。
- [Codex与工具之间的耗时分解](prototype/reports/HOST-PHASES.md)：浏览器执行约2.3秒，主要等待发生在宿主侧；不再用本地执行提速代替用户体验。

- [批中校验与全表回传分离](prototype/reports/VALIDATION-GUARD.md)：相同59绑定，本地中位6.51→2.11秒，保留全页语义校验；完整Codex速度单独报告。

- [真实公开页离线填写与上下文实验](prototype/reports/PUBLIC-PAGE-CONTEXT.md)：从真实招聘控件发现问题名称缺失、3,302项下拉列表；网络隔离下核验虚构资料，服务器/附件/地点服务仍未验证。

- [批量发现与必填项覆盖](prototype/reports/DISCOVERY-AND-COVERAGE.md)：别名/翻译/同校不同校区，6 次 Codex 正确；内部对照中位 51.42 → 44.68 秒，约减少 13%，一组略慢。明确保留资料缺失的必填项。

- [异步搜索选择验证](prototype/reports/SEARCH-CONTROLS.md)：React Select 单选搜索与实体状态，3 次 Codex 均一次调用完成，完整中位约 29 秒；无速度对照。
- [同一任务接口替换动作后端](prototype/reports/BACKEND-SUBSTITUTION.md)：扩展与可复用 Playwright 均一次调用成功；速度接近，不支持自研动作层有倍数优势。
- [React/Radix 动态表单验证](prototype/reports/FRAMEWORK-VALIDATION.md)：受控状态、自定义下拉、重复组和 700 ms 延迟校验。
- [官方 Playwright MCP 强基线](prototype/reports/OFFICIAL-BASELINE.md)：相同资料引用与预取机会，保留脚本失败、恢复和补强结果。
- [未映射文档与上下文预取](prototype/reports/DOCUMENT-BINDINGS.md)：九次 Codex 任务、资料/字段打乱与真实页观察修复。
- [继续减少模型往返](prototype/reports/ONE-CALL.md)：三类表单的一次调用对照、异常恢复及当前瓶颈。
- [资料引用实验](prototype/reports/SOURCE-REFERENCES.md)：避免模型重新输出整份资料，并与可复用脚本比较。
- [目标计划与 Codex 对照](prototype/reports/GOAL-PLAN.md)：本轮减少模型往返的实验、脚本强基线和适用边界。
- [为什么当前原型更慢](prototype/reports/FIRST-PRINCIPLES.md)：第一性原理、等待/传输消融、Codex 时间分布与候选架构。
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
node prototype/bench/plan-check.mjs
node prototype/bench/goal-check.mjs
node prototype/bench/source-check.mjs
node prototype/bench/document-check.mjs
node prototype/bench/framework-check.mjs
AFA_BACKEND=playwright node prototype/bench/framework-check.mjs
node prototype/bench/backend-provider-check.mjs
node prototype/bench/backend-drift-check.mjs
node prototype/bench/search-check.mjs
AFA_SCENARIO=search node prototype/bench/backend-provider-check.mjs
AFA_SCENARIO=search AFA_LOCAL_LOOP_HINT=1 node prototype/bench/codex-framework.mjs
node prototype/bench/codex-framework.mjs
AFA_LOCAL_LOOP_HINT=1 AFA_FRAMEWORK_MODES=binding-repeat,playwright-ref node prototype/bench/codex-framework.mjs
AFA_LOCAL_LOOP_HINT=1 AFA_FRAMEWORK_MODES=binding-repeat,binding-playwright node prototype/bench/codex-framework.mjs
node prototype/bench/codex-documents.mjs
node prototype/bench/codex-official.mjs
node prototype/bench/codex-plans.mjs repeat
node prototype/bench/codex-goals.mjs
node prototype/bench/codex-sources.mjs plain
node prototype/bench/diagnose.mjs
```

`hosts.mjs` 当前默认只使用本机已有的 Codex 登录完成一次虚构资料填表；Claude 测试按用户要求暂停。宿主只注入本次运行的 MCP 配置，不改全局配置。该测试是**接入验证**，不是原生浏览器工具的速度基准。原始宿主日志保存在被 Git 忽略的 `prototype/reports/private/`。

`codex-plans.mjs` 只测试 Codex，三种工具表面按平衡顺序各跑三次，计入模型、审批和 CLI 启动/退出；需使用当前 Codex 账户用量。浏览器已启动，数据全为虚构，所有结果留存。脚本基线只在测试环境暴露，产品工具不提供任意代码执行。

`codex-goals.mjs` 允许目标执行器和脚本都在一次调用里观察、填写及核验，额外调用仅在宿主判断有必要时发生。`codex-sources.mjs` 比较逐项传值、本地 JSON 资料引用，以及脚本直接引用相同资料；已结构化和已映射字段是本实验的前提，不能代表原始简历解析已完成。每轮结果有独立时间戳文件保留。

`diagnose.mjs` 在临时扩展副本中做等待/传输消融并核验延迟错误，没有把删等待的实验变体写入实际运行时。

`binding-playwright` 使用与扩展相同的资料绑定工具、观察器和目标协调器，替换为预先编写的 Playwright 动作后端；它是动作层消融，不是独立竞品或官方 MCP。初次配对两边 6 次均一次调用正确完成，完整中位耗时 24.02 / 27.07 秒。之后增加了弹层期间语义变化的保护；修复版已检查正确性，未重新测 Codex 时延，原计时源码另有归档。

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

试用 Markdown 资料绑定时，先用 `AFA_FIXTURE=unfamiliar npm run demo` 打开并连接对应的英文测试页，再用下面的临时命令替代普通 Codex 入口。资料路径可指向仓库中的 `prototype/fixtures/documents/candidate.md`；内容全部虚构。填写普通网站时，先按上述步骤连接当前页，再启动会话。

```bash
codex -c 'mcp_servers.afa.command="node"' \
  -c 'mcp_servers.afa.args=["/ABSOLUTE/PATH/agent-form-accelerator/prototype/src/bindings-mcp.mjs"]' \
  -c 'mcp_servers.afa.env.AFA_SESSION_FILE="/ABSOLUTE/PATH/agent-form-accelerator/.runtime/session.json"' \
  -c 'mcp_servers.afa.env.AFA_DOCUMENT_FILE="/ABSOLUTE/PATH/candidate.md"' \
  -c 'mcp_servers.afa.env.AFA_CONTEXT_MODE="prefetch"'
```

资料支持 Markdown 标题、单行“名称：值”和自然段。让 Codex 根据资料含义填写连接的页面，保留提交供你检查。这个入口只会复制已提供的片段，不负责生成个性化自我介绍或解析 PDF。页面发生变化时通过 `form_context` 刷新；文档变化后需重启资料会话。


## 支持边界

- 主文档内的原生文本、日期、数字、单选、复选、原生下拉框；观察到的添加行按钮。
- 返回带分组的字段列表、选项、引用、页面快照；批量填写后回读值并检查 HTML validity。
- `form_fill` 使用观察到的 ref；旧快照、替换的节点、变更的标签/选项会停止该批次。
- `form_execute_plan` 使用明确的 fill/expand 阶段，在页面内发生预期变化后重新观察，并按精确 group/label 绑定字段；歧义、类型变化、缺少字段/选项和校验失败会停止。依赖选项每阶段最多等待 1 秒，总预算 8 秒。
- `form_apply_goal` 可在已知精确字段目标时自行观察、填写和核验；处理同义同类型的节点替换，遇到未知语义或拒绝值返回宿主。最终核验等待 120 ms，不等于任意异步校验均已完成。
- 实验性的 `prototype/src/source-mcp.mjs` 可通过启动时明确设置的 `AFA_SOURCE_FILE` 和 `AFA_SESSION_FILE` 引用本地 JSON 资料，支持 `{id, fields: [{group, label, value}], expansions: []}`。数据文件发生变化会要求重新加载会话；它不是已建成的个人资料管理器。
- 实验性的 `bindings-mcp.mjs` 接受启动时指定的 `AFA_DOCUMENT_FILE` 和 `AFA_SESSION_FILE`，读取 Markdown 片段。`form_context` 提供来源及页面，`form_apply_bindings` 让宿主绑定 ref 与来源 ID；`AFA_CONTEXT_MODE=prefetch` 可在临时会话启动时预取上下文。它不是任意 PDF/DOCX 解析器。
- 资料绑定可使用 `repeatGroups` 复用已观察的重复组模板，展开后核对精确标签和类型；未知结构用 `form_expand` 返回上下文再判断。
- 原生/组件字段会等待明确的 aria-busy，检查 aria-invalid；无状态信号的任意异步校验仍不能保证完成。
- 产品接口没有任意脚本、选择器、提交或导航操作。
- 已验证 React/Radix 的 select-only 按钮式 combobox：通过 aria-controls 找到关联的 listbox，选择精确且唯一的可用选项，再回读显示值。扩展路径不支持输入型 autocomplete；实验 Playwright 后端已覆盖下述 React Select 单选模式。其他 ARIA 组件、iframe、shadow DOM、文件上传和跨页流程尚未实现。
- 同一时刻只连接一个标签页；不要让两个宿主同时填写同一张表。
- 同步回读不能保证应用/服务器接受，也不能捕获任意延迟的异步修改。宿主需最终独立检查。

React/Radix 本地演示先运行 `npm run build:fixtures`，再运行 `AFA_FIXTURE=react-form npm run demo`，资料使用 `prototype/fixtures/documents/framework-candidate.md`。组件 bundle 由源码生成，不提交编译产物。

搜索选择演示运行 `node prototype/scripts/demo-search.mjs`。它自动构建本地 React Select 样本，启动隔离浏览器并打印临时 Codex 接入命令。实验 Playwright 后端支持带已识别 classNamePrefix 结构的单选搜索：等待结果、选中唯一精确项、核对已选值；输入文字本身不算完成。此能力尚未移植到扩展，未知结构与多选仍不支持，真实招聘页仅做过只读观察。

别名与重名选项演示：`AFA_FIXTURE=alias-form node prototype/scripts/demo-search.mjs`。Codex 可一次搜索多项，再依据资料选择实际观察到的校区。`complete` 仅表示请求目标完成；新增 coverage 列出未解决的可见必填问题。本地样本故意缺少到岗日期，正确结果应留空并报告。

资料流向：页面可见字段和值 → 本地连接 → 当前 Agent。执行核心不调用外部模型，但宿主仍会按它的正常机制处理这些资料。扩展不持久保存填写资料；连接码只在扩展会话存储中保留。

## 仓库布局

```text
prototype/extension/    Chrome 扩展与表单运行时
prototype/src/          本地桥接和 stdio MCP
prototype/fixtures/     独立可核验的本地表单和虚构资料
prototype/bench/        功能、执行层速度和宿主接入验证
prototype/reports/      可追溯的测量结果
prototype/skills/       两端共用的工作流说明
```

代码在 `prototype/validation` 分支，项目名与正式 API 尚未定稿。依赖锁定在 `package-lock.json`。这是测量原型，不是已发布产品。
