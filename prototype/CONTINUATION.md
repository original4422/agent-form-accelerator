# 持续探索状态（2026-09-21）

## 完整目标仍未完成

用户授权沿“减少模型往返”持续调研、实验和迭代，直到取得好的实际效果。保持原来的完整任务明显提速、正确率不下降、当前只测 Codex、默认不新增模型 API Key 的方向。此前暂定三类表单完整中位耗时至少减半；不能用合成表单、局部执行毫秒或资料准备已完成来替代完整场景。

## 已获得的证据

- 有界阶段计划：重复组任务 39.47 → 31.85 秒，9/9 通过；未达 2×。
- 一次目标调用 vs 同样允许一次调用的脚本：三类合成表单各三次，目标中位数 30.37 / 24.57 / 32.43 秒；18/18 最终通过，包含失败恢复，仍未普遍达到 2×。
- 精确标签已知、JSON 已结构化和已映射时，资料引用显著减少参数转抄；它没有解决首次简历抽取、字段匹配或任意网页控件。
- 真实 Lever 只读 DOM 审计暴露出分组缺失、隐藏辅助文案混入标签及重复 Yes/No 的问题，现已针对这些模式修复并复查。旧 Greenhouse 示例已失效跳转，不可作为成功样本。
- 未映射中文 Markdown → 陌生英文表单：显式上下文 28.08 s，预取 23.64 s（约减 16%），6/6 正确；资料/字段顺序和 DOM ID 打乱后又有 3/3 正确，中位 25.42 s。
- 官方 Playwright MCP 0.0.82 强基线完成 21 次：初始原型 29.44 s vs 先观察脚本 52.71 s；补强标签提示后原型 27.05 s vs 脚本 53.48 s，但脚本额外检查了内部状态，不能当验证等价提速。
- 对齐验证要求后原型三次 26.98/26.36/30.86 s，均一次调用；Playwright 41.65/103.00/104.76 s。仅第一对双方无失败且一次调用；后两次分别有审查拒绝与 30 秒定位超时，不能宣传 3.82×。全部恢复和记录见 OFFICIAL-BASELINE.md。
- 前一轮共 30 次宿主任务最终通过、360 个目标正确、零提交；其中 Playwright 有中途失败，最终正确不意味着每步成功。

## 前一轮实现

- `goal-executor.js`：有界局部协调，处理已知字段、依赖和同义同类型节点替换，未知含义返回宿主；最终 120 ms 后重验。
- `source-mcp.mjs`：显式 local JSON 源引用；拒绝源变更和未注册源。独立实验入口，不是永久个人资料库。
- 更强脚本对照：同样可以引用 source facts；明确复选/单选处理；另加入已有可复用脚本。不得忽略这些强基线。
- `document-source.mjs`、`document-session.mjs`、`bindings-mcp.mjs`：有限格式 Markdown 片段 ID 与现场字段绑定、源 hash 和旧快照保护、可选启动预取。
- 前一轮 53 项浏览器/MCP功能检查已通过（原有 12、阶段计划 12、目标 13、来源 8、文档 8）。

## 前一轮：React/Radix 首轮

- 已锁定 React 19.3.0 / Radix Select 2.3.7 的独立真实组件样本；业务异步由本地模拟，不是招聘厂商克隆或真实网站兼容证明。
- 旧执行器遗漏三个自定义下拉，还会在 700 ms 邮箱校验前约 170 ms 误报成功。现在处理明确的 button combobox → aria-controls listbox、唯一可用选项、键盘交互、依赖节点替换和 aria-busy/invalid。
- `repeatGroups` 可复用已有分组字段 refs 和类型，展开新组后核对标签/类型再填；保留 `form_expand` 分两次观察绑定的方式。来源仍为未映射中文 Markdown。
- 16 项新增真实浏览器检查全部通过，加此前 53 项，共 69 项；含有效/无效异步校验、未知/禁用/歧义选项、鼠标模式、fieldset 禁用、重复模板变型拒绝。
- 同运行时两次请求 vs 一次模板请求：完整中位 33.28 → 24.29 s，6/6 正确，减少 27.0%。不将本地调用数混同于宿主调用数。
- 官方对照出现两项接入错误：VM 无动态 import 回调、tabs select 不返回实际快照。相关批次保留但排除速度结论；中止批次的 oracle 不可用不是正常任务失败。
- 已修正为来源第二参数 + 显式 browser_snapshot，并加实际 stdio/MCP 自动预检。SIGINT/SIGTERM 可保存部分记录并关闭测试浏览器。
- 修正配对批次 1789947226460：原型 24.12 / 24.64 / 26.81 s；官方脚本 140.18 / 131.30 / 136.42 s。6/6 最终正确，60 个目标、零提交。官方三次均因 Radix 隐藏背景表单、默认 getByRole 重新读取触发器属性而超时 30 s，之后恢复。没有双方第一次调用均成功的配对，不宣传 5.5×。
- 原型本地执行约 0.878 s；约 25 s 的完整耗时主要仍在宿主外层。官方每次输出脚本，原型传来源映射，不能将代码生成/恢复成本归为浏览器引擎慢。
- 所有本轮宿主进程已结束；没有需要继续轮询的 exec 会话。源码在整个正式配对期间冻结，`source-hashes-framework-measured.json` 中全部 60 个源码/依赖指纹及 bundle 均已核实一致。

## 前一轮：动作后端替换完成

- `bindings-server.mjs` 提取共享 MCP 入口，扩展 `bindings-mcp.mjs` 的模型侧行为保留。controls 元数据显式定序，实际 stdio `tools/list` 已断言两套后端全部 schema、说明与初始来源/页面完全相同。
- `playwright-backend.mjs` 是通用缓存动作后端，没有字段名/来源 ID/答案。复用原观察器（仅 inspect/validate）和 executeGoal，写入使用 Playwright 1.63.0。`playwright-bindings-mcp.mjs` 只连接隔离 localhost 测试浏览器的 CDP。
- 这是一项动作后端替换实验，不是完全独立竞品，更不是官方 MCP 的新测量。它有意保留共享语义层，检验自研动作本身是否必要。
- 三组配对 `1789948433822`：扩展 24.02 / 26.06 / 22.70 s（中位 24.02）；Playwright 27.07 / 24.61 / 31.60 s（中位 27.07）。6/6 均一次调用成功，60 个目标全部正确、零提交，无生成脚本或失败恢复。本地中位 0.876 / 0.947 s，输出 token 中位 251 / 256。
- 功能验证：16 个框架 + 12 个目标 + 8 个文档检查；两个实际 MCP 接入和独立应用状态检查；4 个弹层期间语义变化检查。全部最终通过。
- 初次 helper 错用验证后的旧 snapshot，已修正并保留初始失败报告。测量之后新增的针对性检查发现：弹层打开时字段标签/分组改变，helper 会先选中再报告失败。已补选择前语义身份保护，并重新跑16项框架、4项变化和2套MCP检查。
- **时延属于补语义保护之前的 helper。** 原实测版本存于 `reports/source-snapshots/backend-measured/playwright-backend.mjs`；`source-hashes-backends-measured.json` 记录64个源文件及归档映射。修复版不冒充已经重新测过速度；最终代码另存指纹。
- 本轮所有宿主执行已结束，没有需继续轮询的执行句柄。详见 BACKEND-SUBSTITUTION.md、ADR-0005。

## 前一轮：异步搜索选择迁移完成

- 新的公开 Greenhouse/Cloudflare 页面只读结构审计见 `search-public-audit.json`。观察到 input combobox、aria-autocomplete=list 及 select__value-container 等结构；没有真实输入、点击、上传或提交。不把该观察当成平台可填写认证。
- 锁定 `react-select@5.10.2`，新增 `search-form.jsx` / `search-form.html`。真实 AsyncSelect，三个450ms模拟查询（城市、两所学校），应用存实体ID；原始中文Markdown沿用上一轮、部分页面字段顺序改变。此样本不是厂商克隆，不含真实网络业务。
- `react-select-state.mjs` 仅通过公开 DOM 识别带 classNamePrefix 的单选结构，查询与已选值分开；多选、未知/无前缀结构不放行。Playwright 后端增加搜索、加载等待、关联弹层选择、唯一精确项和选后状态验证。旧扩展仍 unsupported。
- 来源绑定 choices 允许 autocomplete，但仍必须来自之前实际观察的选项；没有任意文本覆写。
- 15 项搜索检查通过，另一个实际 MCP 接入通过；旧 Radix 16 项与两个后端MCP回归通过。
- 三次 Codex `1789949543902` 全部一次调用/首次成功：29.05 / 28.81 / 29.79 s，中位29.05 s；30/30目标正确，零提交。局部执行2.07–2.11 s。只有新后端迁移组，没有对照，不计算提速倍数。
- 计时期间源码冻结，`source-hashes-search-measured.json` 记录69个已有源码/依赖文件。演示脚本在计时后新增；harness 增加可选信号处理标志，默认保持原行为，实测 harness 归档供指纹核对。
- `node prototype/scripts/demo-search.mjs` 自动构建并打开独立浏览器，打印临时Codex配置命令。初次 Ctrl+C 触发 Playwright 默认退出130并遗留自建目录，核实后已清理；演示改为自己处理信号，重测退出0且临时目录为空。无头启动、打印命令和 Ctrl+C 清理流程已检查；没有替用户启动交互Codex任务或更改全局配置。
- 本轮所有宿主/演示执行均已终止，没有需轮询的执行句柄。报告 `SEARCH-CONTROLS.md`，决策 `ADR-0006`。此前后端和框架报告仍是各自历史版本的证据。

## 前一轮：批量发现与必填覆盖完成

- 可选 form_search 区分 sourceId、query 与观察到的 optionRef；最多12项、本地串行8秒总预算，单次1.5秒。保留已有选择，apply重新执行原查询，唯一完整标签才选择。工具请求通过共享队列串行，避免并发调用竞争状态。
- alias-form 使用真实 React Select，英文规范名、中文来源和同校不同校区。独立 oracle 校验10个已知目标的实体ID，并要求未提供的到岗日期为空。没有把 oracle 映射注入模型/执行器。
- coverage 根据来源绑定和当前回读值核对可见且未禁用的必填问题（单选按问题），complete 仅指 requested-targets。宿主必须报告未解决项。
- 功能检查：12项发现 + 3项真实MCP（单项、批量、并发单项）+ 15项旧搜索 + 8项文档；另2项测量后语义漂移检查初次失败，修复后通过，并重跑12+3检查。
- 首批1789950892350：单项queries数组max1，三次都先误发三项数组，被拒绝后恢复，保留全部记录，不把此比值当干净收益。
- 修正单项接口为明确 ref/sourceId/query，批量仍queries数组，批次1789951414848：单项51.42/45.22/53.57s；批量44.68/45.67/36.00s，中位51.42→44.68s（约减少13.1%），其中一组慢1%。6/6正确、60已知目标、零提交、零失败工具调用；每次4→2工具调用。六份最终文字人工复核，都正确报告缺失日期。不能将工具调用数当成独立模型推理次数。
- 测量后发现blur/expand期间字段改名仍可使用旧offer，修复为发现结束复查语义，并把offer绑定到发现时group/label/kind。实测document-session/backend归档到source-snapshots/discovery-corrected；两个测量manifest有归档映射。最终保护版未重新计时。
- `AFA_FIXTURE=alias-form node prototype/scripts/demo-search.mjs` 启动独立演示并打印批量发现临时配置。无头启动和Ctrl+C退出0/自建目录清空已测；没有替用户启动交互Codex或改全局配置。
- 所有测量进程已结束，没有需继续轮询的句柄。详见 DISCOVERY-AND-COVERAGE.md、ADR-0007。

## 前一轮：真实公开页离线验证与上下文投影

- `offline-public-harness.mjs` 新建无登录浏览器，只允许两个公开招聘域名；加载阶段仅GET/HEAD，阻止写方法、Service Worker与WebSocket。输入前路由拒绝全部请求并设置离线，等待已发出的读取结束。提交事件计数/阻止，完整会话结束关闭浏览器。
- 真实Lever/Palantir页面101字段、学校select3,302项；多个问题只返回placeholder/内部name。单控件容器上下文命名修复后，两后端回归通过（显式名称优先、隐藏文字排除、多字段不猜、旧名称失效）。
- 可选AFA_OPTIONS_MODE=compact把大型原生选项投影为当前选择和来源字符串完全匹配项（最多40），明确总数/截断/规则。保留完整内部观察/校验，form_search支持native-select有界子串查询和绑定来源/字段语义的optionRef。默认full不变。
- 5项原生发现/投影（含测后当前选择在40项截断下保留修复）、8项文档、3项真实MCP旧发现接入、12项旧发现、2项漂移回归通过。首版独立publicOracle错把内层li当问题容器，保留失败后改为固定原生name及标签/序列化核验；被测功能未因此改答案。
- 真实页面离线25个已知目标通过独立DOM显示/原生FormData检查；位置缺事实留空，文件不选。原生required会随复选框脚本变化；附件可见星号没有required属性，coverage只反映原生/ARIA，不认证整个申请，宿主仍报告unsupported简历。
- 三组Codex：1789952610433先full/compact；1789952753917两组均compact/full。full45.18/53.67/58.10s；compact49.99/49.31/47.44s，中位约减8.1%。6/6一次调用且无工具失败，150个已知目标正确，零submit事件；六份最终文字均明确缺失地点/附件。full有两次仅25绑定，其余四次均59（多34个false复选框），只有第二对行动量相同，是策略差异，不能将全部差值归因于投影。
- 预取完整数据367,067→41,320bytes，但累计token未同比下降。原生填写25项3.49–3.56s，59项约6.59–6.66s。代码显示每action做全页validate/重扫所有选项，这只是待单独验证的开销假设，未优化。
- 测量88项指纹已验证；测后修复投影当前选项截断，原投影/测试归档到source-snapshots/public-measured。最终保护版未重计时。
- 所有宿主测量结束，没有需轮询的会话。报告PUBLIC-PAGE-CONTEXT.md、ADR-0008，汇总codex-offline-public-summary.json。

## 本轮：保留全页语义校验，减少全表回传

- 首次profiling固定59绑定，本地6.48s、63次全表observe/validate、22.33MB返回；相关往返5.86s、浏览器函数内3.15s。测量代码validation-cost.mjs，以page.evaluate Proxy记录边界；不是精确CDP所有调用数。
- 新内部guard仍验证URL/token及每个原观察节点的可见性/标签/类型/name/role/group/原生选项签名，另拒绝新可见控件；只返回小型确认，不重新生成大字段列表/轮换token。批前validate、批后inspect、executeGoal最终回读均保留。不是只验证目标节点，也没有基于MutationObserver缓存。
- createPlaywrightBackend(page,{validationMode}) 保留full/guard。默认已切guard；离线控制器默认guard。正式计时两边明确传入mode，默认切换未改变被测分支逻辑。实测两个默认full文件归档到source-snapshots/guard-measured，有manifest映射。
- 16项新保护检查，两模式均阻止批中label/context/replace/hide/disable/options/unrelated语义变化后下一写；guard另拒绝新控件/验证旧token失效。Guard框架16+搜索15+文档8+弹层漂移4通过。默认切换后目标12与两套真实MCP检查通过，共73项。
- 固定59绑定本地三组1789953644511：full6.454/6.515/6.512s；guard2.138/2.094/2.115s，中位约3.08倍、耗时减67.5%。完整观察63→4次，另59次guard；返回中位22,333,843→1,429,317bytes。6/6独立显示/FormData正确，零提交。
- Codex配对1789953721237：full44.53/50.13/48.95s；guard47.82/42.47/48.76s，中位48.95→47.82s，仅减2.3%，一组更慢。6/6一次调用、59绑定、零工具错误、初始上下文hash相同，150已知目标/全部布尔选择独立检查正确。六份最终说明人工复核，均报告缺失地点/简历。
- 关键残差：工具开始前26.52–32.09s；工具区间扣本地执行后4.08–10.87s；工具返回至进程退出6.60–9.63s。当前JSONL边界不能精确区分模型/审批/传输/启动/最终回复，勿把残差全叫推理。CLI目前runCodex带--approve-for-me，可能影响工具外层时间，但尚未有因果实验；不要通过绕过既有审批拒绝制造速度。
- 所有进程已结束，无需轮询。源码冻结时92个指纹验证一致；本轮报告VALIDATION-GUARD.md、ADR-0009。目标继续active。

## 下一轮按证据推进

1. **执行器局部瓶颈已定位并改进；用户端明显提速仍未证明。** 不继续为好看的本地3倍堆DOM优化。首工具前与工具外围时间才是下一步需要拆开的关键路径。
2. 可在runCodex保留进程开始的epoch时间，在控制器/工具服务端记录请求接收、实际执行开始/结束、响应完成的时间（仅元数据，不记录凭据/资料），对齐CLI工具开始/结束。先区分等待发生在工具服务端之前还是之后，再决定优化什么。已有source/session/capability配置只改临时实例，不改全局设置。
3. 如调查Codex设置/审批模式，先查本地CLI与官方文档，不假定默认模型或把审批残差等同推理；不能为了提速绕过已有拒绝或降低真实使用的验证/权限要求。可以研究减少模型输出重复映射、把完整多选问题作为一项语义决策，但先有对应瓶颈证据，避免再加未验证接口。
4. 用户日常可用仍缺实际来源文档/PDF、附件、服务端地点选择、多页与个人浏览器接入。继续推进完整用户流程，避免项目只剩测量框架。离线真页面不是服务器接受或完整申请。
5. 三类真实完整任务稳定两倍仍缺证据；保持合理批量强基线、全部尝试与正确性门槛。不要反复索要URL，不解除离线限制或真正投递。

## 测量规则

所有宿主尝试保留，错误恢复计入时延，独立应用状态 oracle 校验，禁止提交申请。耗时明确分出浏览器启动、CLI启动、模型/工具、资料准备。研究和其他浏览器测试不与宿主计时并行争用本地执行资源。不得修改已安装的 Skill 或全局 MCP 配置。

## 可复现入口

- `node prototype/bench/guard-check.mjs`：16项批中变更保护。
- `node prototype/bench/validation-cost-pairs.mjs`：固定59绑定的3组本地full/guard对照。
- `node prototype/bench/codex-validation-guard.mjs`：3组完整Codex对照，同compact上下文、要求相同59绑定。
- `AFA_BACKEND=playwright AFA_VALIDATION_MODE=guard node prototype/bench/framework-check.mjs`：guard版框架回归；search/document/backend-drift检查也支持该环境变量，输出guard-前缀报告。

- `node prototype/bench/offline-public-check.mjs`：真实公开页加载后离线，手工绑定25项/独立核验，含网络阻断探针。
- `node prototype/bench/codex-offline-public.mjs`：默认1对full/compact；AFA_REPEATS指定组数、AFA_PUBLIC_MODES指定顺序。网站可能变化/下线，失败不得当同任务成功。
- `node prototype/bench/context-shape-check.mjs`：两后端上下文名称保护。
- `node prototype/bench/native-discovery-check.mjs`：5项大型原生列表/选项引用检查。

- `node prototype/bench/discovery-check.mjs`：12项选项引用与覆盖检查。
- `node prototype/bench/discovery-drift-check.mjs`：2项字段含义变化保护。
- `node prototype/bench/discovery-provider-check.mjs`：3项真实MCP接入。
- `node prototype/bench/codex-discovery.mjs`：修正单项接口与批量接口配对。
- `AFA_FIXTURE=alias-form node prototype/scripts/demo-search.mjs`：别名/重名/缺失事实演示。

- `node prototype/bench/search-check.mjs`：15项搜索状态与错误路径。
- `AFA_SCENARIO=search node prototype/bench/backend-provider-check.mjs`：搜索样本实际MCP与应用状态。
- `AFA_SCENARIO=search AFA_LOCAL_LOOP_HINT=1 node prototype/bench/codex-framework.mjs`：3次Codex迁移任务，非速度比较。
- `node prototype/scripts/demo-search.mjs`：独立浏览器交互演示，打印临时配置。

- `AFA_BACKEND=playwright node prototype/bench/framework-check.mjs`：Playwright 16 项框架检查。
- 同样可给 `goal-check.mjs` / `document-check.mjs` 设置该变量，分别执行12/8项。
- `node prototype/bench/backend-provider-check.mjs`：实际工具元数据完全一致及10字段应用状态。
- `node prototype/bench/backend-drift-check.mjs`：两后端弹层期间标签/分组变更均不选择。
- `AFA_LOCAL_LOOP_HINT=1 AFA_FRAMEWORK_MODES=binding-repeat,binding-playwright node prototype/bench/codex-framework.mjs`：缓存动作后端配对。

- `node prototype/bench/framework-check.mjs`：16 项真实框架检查。
- `node prototype/bench/codex-framework.mjs`：显式展开、重复模板、官方脚本三种入口。
- `AFA_LOCAL_LOOP_HINT=1 AFA_FRAMEWORK_MODES=binding-repeat,playwright-ref node prototype/bench/codex-framework.mjs`：本轮修正完整上下文、对称局部循环提示的配对。
- 本轮报告 `FRAMEWORK-VALIDATION.md` 记录全部失败与排除理由；`framework-playwright-mcp.mjs` 是保留的**无效文件导入基线**，当前驱动只使用 `framework-ref-playwright-mcp.mjs`。

- `node prototype/bench/codex-documents.mjs`：显式上下文 vs 预取。
- `AFA_DOCUMENT_VARIANT=permuted AFA_DOCUMENT_MODES=prefetch node prototype/bench/codex-documents.mjs`：打乱资料/字段。
- `node prototype/bench/codex-official.mjs`：初始官方工具三组轮换。
- `AFA_BASELINE_HINT=accessible AFA_EVIDENCE_MODE=dom AFA_DOCUMENT_MODES=afa,pw-prefetch node prototype/bench/codex-official.mjs`：验证要求对齐组。

所有宿主尝试必须保留。旧轮次的源码指纹对应各自报告/提交，不能要求它们与当前源码相同；本轮 backend 测量清单通过归档保留实测代码。不要重复消耗同样小样本追求宣传倍数；下一轮转向独立组件和实际流程。

## 最新：宿主分段与按问题表达复选集合

- 仪表化完成，批次 `1789954486688` 三次相同59目标全部首次成功：60.44/43.75/48.32s。工具开始前26.44–39.42s，事件到handler收到7.20–9.12s，handler约2.2–2.3s，回传仅2–4ms，尾部6.83–9.72s。不能直接将handler之前残差归为自动审批；没有改权限或模型。
- 新的 `decision-context.mjs` 无损提取相邻同题的共有属性，字段顺序/含义/异常状态保留。可选 checkboxGroups 用 group/sourceId/selectedRefs 表达完整列表，展开为相同逐字段来源绑定；不推断未知组或未知偏好。默认flat未改，离线公开provider与隔离PW provider接受 AFA_DECISION_MODE=grouped。
- 3组交替批次 `1789955033322`：flat55.825/49.242/45.437s；grouped44.159/42.610/36.364s；中位49.24→42.61s，约减13.5%，3组均快。6/6一次调用，无错误或恢复；每次21绑定+2集合展开成59，对照59；规范化上下文hash完全相同，150个正向目标及布尔全集正确、零提交。context41320→28187bytes，args1368→804bytes。不是两倍，不拆分组合干预的独立贡献。
- 计时后补最终整组契约检查：新增/移除/变义/禁用成员不再误报complete，同义节点替换允许。初始会话mock失败保留；21结构/拒绝+1真实MCP公开页检查通过（含预先错误勾选清除），之前旧文档8项回归通过。**上列Codex计时是补最终保护之前的版本，修复版功能通过但未重新计时**；session/检查脚本实测版另存归档。
- 所有本轮进程均已终止，无待轮询会话。实测96个源/依赖指纹核实一致，最终指纹另记。报告 `reports/HOST-PHASES.md`、`reports/DECISION-CONTEXT.md`，ADR0010。
- 下一步优先检验独立表单迁移或精简成功回执，避免继续围绕同一页小幅微优化。完整申请流程、实际服务器接受、文件上传、PDF/DOCX与日常浏览器集成未证实；完整目标仍active，不标complete。

## 最新：条件选项计划已测，运行时与实测版一致

- 本轮是 progress：实现+验证新的任务协议，得到改变下一步优先级的端到端证据。没有阻塞审计或待等的外部输入。
- 根据之前的时间边界，将精简回执暂缓，优先试验有机会省一次宿主往返的条件选择。新增 conditional-choice.mjs；`choices[ref].search={query,labelParts}` 可在普通或重复组中使用。模型给来源支持的字面名称/校区词组，先本地发现全部选项，只有非截断结果中的唯一可用匹配才通过旧optionRef路径填写。未知/歧义/改义返回候选，不能弱化条件；默认模式仍不开放这个schema。
- 条件模式只在隔离Playwright provider通过 AFA_SELECTION_MODE=conditional启用，普通form_search继续保留，日常浏览器扩展尚未接入。无新增模型API、无全局配置或已安装Skill修改。
- 11个条件检查+2套真实stdio/MCP应用状态检查通过。首次旧模式拒绝测试只是断言期待错误码不对，已保存初始失败后修正。检查含缺限定词回退并以返回optionRefs恢复、源变更、字段改义、选项消失、重复标签、截断/禁用等。
- 6次交替Codex批次1789956240788：observed43.152/53.957/47.315s；conditional37.083/29.883/30.534s；中位47.32→30.53s（减少35.5%，1.55×），3组均快。6/6最终正确且无工具失败/额外恢复，2→1次工具调用；每次10目标，共60；来源缺失日期均留空并在最终报告指出，零提交。
- 两方每次均6次实际搜索，MCP handler总时长中位3.607/3.554s，工作量、验证不变。条件首个工具前规划更久（中位12.934→16.146s），整个任务更短，不能用局部区间代替总耗时。6份上下文hash完全相同，101个测量源码/依赖指纹测前后均一致。
- **本轮没有测后行为补丁，最终运行时即实测版本。** 所有宿主和浏览器检查进程已结束，无待轮询句柄。报告 reports/CONDITIONAL-SELECTION.md；ADR0011；README已给出隔离演示开关。
- 当前进展支持优先减少需要宿主重新判断的阶段，而非浏览器微优化。仍只是明确英文校名/校区来源下的独立组件样本；下一步应验证真实搜索组件或来源不充分时的实际宿主回退，不能外推任意翻译/真实业务接受。完整目标仍active，真实全流程、多页、文件上传、PDF/DOCX与日常会话未证明。
