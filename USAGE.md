# 进阶用法与实验入口

[先用统一入口试用](README.md) · [全部工程报告](prototype/reports/INDEX.md)

## 先试用新的 Codex 浏览器入口

需要 Node.js 20+、已安装并登录的 Codex CLI。初次准备：

```bash
npm ci
PLAYWRIGHT_SKIP_BROWSER_GC=1 npx playwright install chromium
npm run browser:demo
```

保持这个终端运行，在另一终端执行它打印的 `codex ...` 命令，再按提示让 Codex 填写。演示自动打开本地虚构表单和资料，包含两段教育经历及同校不同校区。正确结果应填好 10 个已知目标，保留并报告未提供的到岗日期。关闭最初的标签页或按 Ctrl+C 结束，临时浏览器资料随之删除。

使用自己的 Markdown 资料和指定页面：

```bash
npm run browser -- --url "https://招聘页地址" --source "/绝对路径/资料.md"
```

先在打开的独立浏览器中手动登录、进入待填页面，再执行打印的 Codex 命令。默认在 `.profiles/companion` 保留这套独立浏览器资料；加 `--temporary` 可在退出时删除。不会导入日常 Chrome 的登录资料。同一套资料目录同时只运行一个浏览器入口，一个页面只交给一个 Codex 会话填写。

资料格式支持标题、单行“名称：值”和自然段，最多 10 万字符、100 个条目，默认不支持 PDF/DOCX；下方有受限 PDF 实验入口。页面字段及指定资料会提供给当前 Codex。原型只控制最初打开的标签页；手动导航后让 Codex 调用 `form_context` 刷新，修改资料后重新启动 Codex 连接。在线页面可能在输入时自动保存；本项目的虚构公开页实验均在断网后进行，演示只用 localhost。

这个入口复用 Playwright 后端，已接入条件搜索、重复组和独立分组，默认完整回执。独立分组不能与重复组混用；未知组件仍可能需要手工处理。没有提交、文件上传或跨页导航工具，最终申请由你检查处理。命令仅为当前 Codex 进程添加配置，无需新的模型 API Key。

目录检索规则不确定时，可显式开启本地查询变体：

```bash
AFA_QUERY_VARIANTS=1 npm run browser:demo
# 或与自己的 --url / --source（含可选 PDF 实验）一起使用
```

Codex 可以一次提供最多三个查询词与一套固定限定条件；只有完整观察到空结果才尝试下一个词。歧义、非空冲突、截断或未就绪会返回 Codex，不能靠删除校区/地区限定继续猜选。整批最多十二词、八秒发现预算。连接命令携带本次开关，无需改全局配置。详见[试用入口验证](prototype/reports/COMPANION-QUERY-VARIANTS.md)。

如需在登录后用虚构资料诊断已加载的表单，加 `--offline-after-ready`：先手动进入最终表单，回终端按 Enter，冻结页面 HTTP(S)/WebSocket 后才打印 Codex 命令，并强制临时 profile。远程搜索和跨页可能不可用；这不是系统级网络沙箱，详见[验证范围](prototype/reports/OFFLINE-AFTER-READY.md)。

接入检查：`node prototype/bench/companion-check.mjs`。真实 Codex 集成检查：`node prototype/bench/codex-companion.mjs`，会使用当前 Codex 账户用量。

## 独立业务流程：SurveyJS 差旅报销草稿

本仓库自建的本地报销应用使用真实 **SurveyJS 3.1.2** 渲染器。选择火车后填写票价；选择私家车后出现里程、车牌和停车费。服务器按票价或每公里 GBP 0.50 加停车费计算报销总额；切换交通方式会清除失效分支，刷新页面从服务器恢复草稿。

```bash
npm run expense:demo -- rail
# 或另一份资料 / 另一分支
npm run expense:demo -- car
```

浏览器打开后，在另一终端执行打印的 Codex 命令，让它根据资料准备报销草稿并核对保存总额。演示复用现有临时浏览器入口，草稿保存在本次本地服务进程内，退出即删除。

```bash
npm run check:expense   # 不调用模型：控件反例、绑定/官方两分支、逐值刷新恢复
npm run bench:expense   # 当前 Codex 账户：rail / car 各一次真实集成任务
npm run bench:expense:compare # 固定模型与交替顺序，八次完整速度对照
```

本次新增支持装饰层覆盖的原生单选/复选框，通过唯一关联标签激活并回读；原生 radio 也继承 `role=radiogroup` 的 `aria-required`。这是一页动态工作流，使用本仓库的业务规则和后端；没有把现成商业报销系统作为已验证对象。实验与失败记录见 [SurveyJS 报销验证](prototype/reports/SURVEYJS-EXPENSE.md)。

## 读取页面保存状态

`form_context` 和填写回执现在返回 `formStatus`：可见 `role=status` / `role=alert` 的原文、相关字段引用，以及页面显式提供的 `aria-busy` 值。Codex 能区分页面显示的“保存中”“已保存”“未保存”或“拒绝”，完整回执和差量回执均保留这些信息。

状态文字单独记录，不作为稳定题目说明；保存提示变化不会让原计划被误判为题意变化。工具保留原文，不按关键词给任意网站生成“已保存”结论；没有状态文字或 `busy=false` 也不会生成该结论。

运行在线保存的本地验证（不调用模型）：

```bash
npm run check:online
```

用当前登录的 Codex 做三种控件的对照：

```bash
npm run bench:online
# 每种两组配对，首轮反向、下一轮交替
AFA_ONLINE_ORDER_OFFSET=1 AFA_ONLINE_REPEATS=2 npm run bench:online
```

对照使用 localhost 虚构资料，独立验证服务器草稿中的 13 个值、两段教育经历、选答规则和未提交状态。编号 JSON 与最新结果保存在 `prototype/reports/`，原始模型轨迹保存在 Git 忽略的 `prototype/reports/private/`。

## PDF 简历输入实验

不必先把纯文字 PDF 重写成 Markdown。额外安装本地 Python 依赖并显式启用：

```bash
python3 -m venv .venv-pdf
.venv-pdf/bin/pip install -r prototype/requirements-pdf.txt
AFA_PDF_SOURCE=1 AFA_PYTHON="$PWD/.venv-pdf/bin/python" npm run browser -- --url "https://招聘页地址" --source "/绝对路径/简历.pdf"
```

浏览器入口打印的 Codex 命令会携带本次实验配置，不修改全局配置。使用虚构资料诊断真实站点时，仍需加 `--offline-after-ready`，先手动登录并加载最终表单再断开页面网络。

默认拒绝含图像的 PDF。对于每页都有文字、另含照片等普通 Image XObject 的资料，可显式只使用文字层：

```bash
AFA_PDF_SOURCE=1 AFA_PDF_ALLOW_IMAGES=1 AFA_PYTHON="$PWD/.venv-pdf/bin/python" npm run browser -- --url "https://招聘页地址" --source "/绝对路径/简历.pdf"
```

开启后，来源的 `extractionCoverage` 与每次填写回执的 `sourceCoverage` 均标记 `partial-text`，列出未解析图像的页码和坐标。Codex 只能引用提取的文字，并应报告这些未读区域；图像可能包含额外或冲突事实，不会被假定为装饰。目标字段 `complete=true` 不代表简历已完整读取。

保留页码和文字位置，同一次填写请求可引用精确原文或连接同一段落的完整行。最多 5 MB、10 页、300 个片段；任一无文字页（包括文字页混扫描页）、旋转文字仍拒绝。内嵌图像（inline image，含 Form 中的内嵌图像）在两种模式下均返回 `PDF_INLINE_IMAGES_UNSUPPORTED`；不支持 DOCX/OCR。位置分段是启发式；文字层、向量图形和页面视觉之间的语义关系不由提取器验证。详见[纯文字验证记录](prototype/reports/PDF-SOURCE.md)及[混合 PDF 边界与反例](prototype/reports/PDF-MIXED-SOURCE.md)。

## 原扩展本地演示

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

搜索选择演示运行 `node prototype/scripts/demo-search.mjs`。它自动构建本地 React Select 样本，启动隔离浏览器并打印临时 Codex 接入命令。实验 Playwright 后端支持带已识别 classNamePrefix 结构的单选搜索：等待结果、选中唯一精确项、核对已选值；输入文字本身不算完成。此能力尚未移植到扩展，未知结构与多选仍不支持。真实 Greenhouse 页面已有网络隔离下的部分填写验证；在线检索、服务器接受和完整申请尚未验证。

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

当前代码位于 `main`，项目名与正式 API 尚未定稿。依赖锁定在 `package-lock.json`。这是测量原型，不是已发布产品。


## 条件搜索实验

运行 `AFA_FIXTURE=alias-form node prototype/scripts/demo-search.mjs`，在它打印的临时 Codex 命令末尾追加 `-c 'mcp_servers.afa.env.AFA_SELECTION_MODE="conditional"'`。这只为本次隔离演示开放条件选择，默认接口未变。

让 Codex 根据资料填写全部已知字段和两段教育经历，保留缺失日期，并使用来源中的机构名与校区限定词。它可以在一次 apply 中提出 `choices[ref].search = {query, labelParts}`；只有唯一观察选项满足全部字面条件才执行。若候选歧义或条件不满足，返回真实候选让 Codex 决定，不自动弱化条件。该路径仍使用已有 Codex 登录，无新增模型 API Key；未接入日常浏览器扩展。

对仅涉及当前已有字段的批次，可把实验开关改为 `AFA_SELECTION_MODE="independent"`。Codex 可以提供 `independentGroups`，将电话国家与电话等有关联的字段放在同组；一组查询无法完成时暂缓整组，继续核验其他独立组。`complete:false` 表示原请求仍未完成，`task.unresolvedTargets` 在上下文刷新后仍保留。该选项不能和新增重复组或 `checkboxGroups` 混用；省略它则保持原来的全部条件先成功才填写的行为。

空结果恢复实验：在上述 `demo-search.mjs` 打印的命令末尾同时添加 `-c 'mcp_servers.afa.env.AFA_SELECTION_MODE="conditional"'` 和 `-c 'mcp_servers.afa.env.AFA_QUERY_VARIANTS="1"'`。新增 `search:{queries:["杭州","Hangzhou"],labelParts:["Hangzhou"]}` 表示一套固定匹配条件及最多三个查询词，只有完整观察到空结果才换词；歧义、非空冲突、截断或加载失败返回 Codex 判断。整批最多十二个预声明查询，共享八秒发现预算。独立浏览器 companion 现在也支持同一显式开关，默认仍关闭。

## 许可

项目代码采用 [MIT](LICENSE)；依赖及实验素材归属见 [THIRD_PARTY.md](THIRD_PARTY.md)。
