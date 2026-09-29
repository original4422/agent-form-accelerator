# 持续探索状态（2026-09-30）

## 当前接续点：公开保存状态已实现，两轮反向对照完成

- 本轮工程报告 [PUBLIC-FORM-STATUS.md](reports/PUBLIC-FORM-STATUS.md)。共享观察器新增 `formStatus`，原文与显式 busy 进入初始 context、完整/差量回执；不从 idle 或缺失状态生成 saved。
- 局部状态/busy 与最近局部字段关联，不跨表单、不退到 body；明确 aria-describedby 可关联外部消息。初版扩大关联缺陷已复现、修复并独立复核。三完整在线流程、四组状态检查、12 项 context 与 7 项 receipt 回归通过。
- 修正版批次 `1790708111354` 两轮共 12 次全部最终正确，36 个运行文件前后指纹一致。六次原型都两次调用、均能报告页面已保存；服务器每次独立核验全部 13 值、两教育记录与未提交状态。进程已结束，没有待轮询句柄。
- native 两组官方 81.29 / 86.63 s，原型 48.55 / 46.06 s，中位 83.96→47.31 s（约减43.7%）。Radix 82.24 / 143.64 vs 43.50 / 52.45 s；search 133.19 / 127.96 vs 54.87 / 53.38 s。两个官方任务局部超时后恢复，工程报告明确标注，不利用恢复成本宣传倍数。
- 中止批次 `1790707753862` 保留前三项及终止错误，不混入修正版结果；初版观察器已归档，哈希与记录一致。工具说明和状态增加 native 初始 tools/list 711 bytes（约3.6%），输入 schema 不变。
- README 新增 `npm run check:online` / `npm run bench:online` 及状态反馈用法；补 MIT 与第三方依赖归属说明。原验收门槛未达成，当前没有新增模型采样计划。

## 上轮接续记录


## 当前接续点：在线草稿首次完整正确配对，先补保存状态回执再重复采样

- 本轮报告 [ONLINE-DRAFT-COMPARISON.md](reports/ONLINE-DRAFT-COMPARISON.md)。正式批次 `1790706073063` 六次全绿，36 个运行文件前后 SHA-256 一致；全部模型进程已结束，没有待轮询会话。
- Codex 完整耗时：原生官方 77.64 s / 3 次，原型 51.73 s / 2 次；Radix 官方 84.10 s / 4 次，原型 55.36 s / 2 次；search 官方 95.33 s / 4 次，原型 59.53 s / 3 次。分别减少 33.4%、34.2%、37.6%。包含启动准备的总耗时见报告。
- 六次服务器均保存全部 13 个来源值、两段教育经历，作文恰答一题，revision 14、零冲突、零提交、无在途写入；公开 DOM 最终已保存且无无效字段。官方脚本均正常执行，无失败恢复；search 原型第三次只是成功后的 context 复核。
- 保存证据缺口：执行器已等公开 busy 结束，但回执不含 role=status 文本，Codex 无法确认页面的“已保存”；独立 runner 已验证服务器结果。先补公共状态投影与保存/拒绝/未保存行为检查，再反向顺序重复采样。不得将 busy=false 泛化为服务器接受。
- `c64040c` 保留旧 pilot 和公共 busy 门禁实现。旧 pilot `1790705440283` 的官方原生漏掉最终 blur，页面状态误报已保存；blur 与点击添加教育会竞争。正式批次前已修文本明确标签、dirty 状态与页内保存说明、串行保存队列；oracle 接受选答空白，冲突改诊断。
- `online-fixture-check.mjs` 三变体保存行为与 oracle 回归、`online-form-check.mjs` 三完整流程，模型测量前后均通过。生产执行器在正式测量中未修改。原始 private 不提交；编号报告与本轮代码一同本地提交。
- 原目标尚未完成：本轮是同一业务流的三个控件变体、每种一对；不是三家真实 ATS，也没有稳定 2×。下步顺序为保存证据→重复对照→另一独立且有权限验证服务器草稿的表单；不重跑已知冻结 Ashby 失败来换取成功样本。

## 历史接续记录（以下保留各轮当时状态）



## 当前接续点：已观察更新门禁实现，真实姓名输入推翻离线六目标的在线解释

- 本轮 progress：生产backend被动跟踪ApiSetFormValue、有界等待、语义变化停止、失败台账保护；11新本地检查+81原有相关检查通过；2真实冻结检查；3真实Codex受控任务通过。目标仍 active，非阻塞；不宣称完整申请或2×，不得据一次调用结题。
- bench/form-update-tracker.mjs：主frame/同源/api/non-user-graphql?op=ApiSetFormValue、POST且body operationName和mutation前缀双核对。requestfailed→NETWORK_FAILED；完整body后HTTP/JSON/GraphQL/受限FormRender形态/errors检查。只输出固定reason/计数，不输出变量/服务端题目/错误文本，不主动调用写API。成功形态依据query selection构造，真实成功未观察，null/未知保守UNCONFIRMED。
- backend动作触发已观察更新后，本地1.5s有界等待、不超goal8s，完整body后120msDOM安静窗口，期间同操作新请求继续等；公开field label/group/kind/required/options/context变化返回SERVER_FORM_CHANGED并停止后续动作。无已知请求不新增该等待。失败同document保留，inspect/相同值重复goal不能消掉，导航新document重置；controller关闭dispose listeners。context投影/tool说明传出formUpdate，goal避免失败值进入verified，session清除旧台账。
- 不是通用网络依赖证明：监听前请求、未知API、任意迟发/迟渲染不覆盖；120ms仍是启发式稳定窗口。只被动等待，不读React内部状态、不用服务器题目直接回答。地点及文件仍unsupported。
- 关键真实反例：ashby-location-replay-audit现在生产backend检测冻结后的失败；真实六目标ashby-pressed-check旧complete=true断言失败。进一步记录只含公共path和变量键：第一项Name的ApiSetFormValue path=_systemfield_name 即失败，DOM保留Alex Fictional，邮箱/按钮/段落未填。不能假设只有地点依赖服务器。
- 保存旧DOM成功报告ashby-pressed-check-pre-update.json，以及本轮首次旧断言失败ashby-pressed-update-initial-failure.json；当前ashby-pressed-check脚本改为负例门禁检查，complete=false、6unresolved、coverageverified0、0choiceclick/上传/提交、socket0通过。历史codex-ashby-pressed两次6目标原轨迹不改，只是局部DOM证据，不能再作为线上成功基线；该旧模型脚本的成功断言不适合当前契约，勿直接反复跑。
- form-update-fixture.mjs + form-update-check.mjs 十场景成功/700ms延迟/连接中断/HTTP503/GraphQL错误/未知结构/表单错误/超时/新字段/新说明全通过，inspect和重复相同值仍不能绕过失败。初版10红保留form-update-initial-failure.json，断网fixture后来改为先发headers再切连接以避免Chromium传输重试干扰。原pressed15/context12/companion11/question8/conditional11/independent14/offline-ready10共81通过；没有跳过真实六目标失败，而修正其断言范围并保留证据。
- codex-form-update批次1789973395714：同source/prompt，delayed1apply36.441s，2目标正确、工具1.155s；new-field2apply113.161s，首返回SERVER_FORM_CHANGED，第二填姓名，新工作许可缺来源留空并报告；network-failure1apply81.890s，停止且报告失败，不重复写/不轮询。每个change和服务端请求均1，3/3通过，31运行时等指纹测前测后不变。全部功能检查先结束后模型；原始private，公开编号报告和latest保存。只有一实现的不同场景、没有速度基线，不能算提速。
- 模型后补充第11项primitive-late-failure先红：低层fill第一项写完第二项更新失败仍给第一项verified，上层goal已有保护。新增fill回执统一降级为needs-review，11项再绿。红保留form-update-primitive-initial-failure.json。这是model批次后的2行production补强，未重跑model；31文件一致只指批次内，最终backend hash不同，不要宣称最终代码等同模型时版本。
- 报告FORM-UPDATES.md、ADR0017、README和历史Ashby报告有明确限定。没有模型APIKey/全局配置/安装Skill改动，没有实际申请写入联网。真实冻结始终保持，不为测试成功放行或伪造mutation。
- **下一步方向调整**：冻结真实页能发现控件/失败，不能独自完成服务端表单验证。优先在拥有控制权的在线表单上验证完整source→动态题目→serverstate→可审核未提交结果，并做验证等价的Codex对照。避免继续花模型用量重测已知离线失败的Ashby六目标。考虑借用已有React/Radix/ReactSelect fixture组成完整分支任务，保持服务器独立oracle；真实Ashby成功契约尚未知，不要当作已确认去泛化。未来位置适配仍需目录查询结果/选中状态/服务端更新三层契约，不能仅凭input值。
- 先前可选实际公司/公开URL问题未回答，不重复催问；仍有可独立完成的实验，无阻塞。所有进程结束，无待轮询句柄。本轮并未满足原三实现完整任务2×门槛。


## 当前接续点：地点调查发现必须处理服务器表单更新，尚未实现适配

- 本轮 progress：实际冻结页面输入/选择行为、独立匿名公共地名读请求及精确回放，证据改变下一步优先级。没有生产代码修改、没有Codex新任务或速度测量，完整目标 active，非阻塞。
- ashby-location-audit：冻结后输入London UK触发query ApiAutocompleteGeoLocation，UI显示No results但nativeValid=true，Escape/blur又清空。只因请求被拦截，不能当目录无结果或自动换词依据。控件是input.ashby-application-form-input-autocomplete[role=combobox][aria-autocomplete=list][aria-haspopup=listbox]，位于.field-entry data-field-path=_systemfield_location，label for同path但input无id。popup打开时兄弟/背景aria-hidden=true；通过aria-controls连接role=listbox，里面role=option+公共autocomplete-popup-result类。
- 查询operation和完整querydocument已从被阻止请求观察到；变量text string与locationTypes [Country,Region,City]。公共read查询不含申请信息。新ashby-location-catalog固定该只读query，Node匿名POST读取通用London UK地名，无浏览器cookies/auth/申请人源/写操作，200返回5项：英国London完整限定名、UK、London Ontario Canada/Kiribati/Kentucky US，原响应+hash存ashby-location-catalog.json。生产不导入候选/答案。
- ashby-location-replay-audit仅在新冻结page上对与记录完全一致的query+变量返回这份原响应，其余一律仍被冻结。真实DOM有5可见候选，唯一完整标签点击英国London；选中并blur后文本为London, Greater London, England, United Kingdom；再输入不匹配地名并Escape/blur，原选中值恢复。
- **关键新依赖**：选中后尝试 mutation ApiSetFormValue，变量键含organizationHostedJobsPageName/formRenderIdentifier/path/value/formDefinitionIdentifier；返回片段请求FormRender，包括fields/isRequired/isHidden/描述/formErrors等。此写入被拦截net::ERR_FAILED、没有mutation响应，UI仍保留选中值。没有放行/直接调用/伪造mutation，也未保存写入变量值。不能证明此具体地点确实新增题目，只能确认请求服务端表单更新且响应缺失。
- 强断言重复回放通过：响应hash一致、唯一候选点击、两次关闭后值保留、mutation确实失败且response数0、传输socket0、submit0。报告ashby-location-replay-audit.json findings observedSelection=true, selectionPersistsAfterFailedUpdate=true, serverUpdateConfirmed=false, fullApplicationVerified=false。这个回放是组件行为实验，不是完整在线申请或速度基线。
- 文档ASHBY-LOCATION-BOUNDARY.md与README写清：不要马上把此input升级为普通可写文本，或仅凭DOM值/菜单关闭宣称成功。下一步先建立已观察表单更新的有界成功/失败/等待信号，测试成功/延迟/失败/动态新字段，然后再接地点选择。机械等待留本地，服务器返回新问题/新含义要交给宿主，不能旧计划继续猜。不要实现读取React内部状态；可被动观察已发生请求状态，但不拿隐藏返回的候选替代DOM选项。
- 所有进程已结束，无待轮询句柄。无新模型测试，无相关生产改动所以未重跑旧回归。仍未支持地点、文件和视觉必填，也未达三类完整任务2×；先前可选公司名/URL问题未回，不重复催问；还有可自主实施的本地更新状态与适配验证，非阻塞。


## 当前接续点：真实 Ashby Yes/No 可执行，两个 Codex 任务各一次调用

- 本轮 progress：新受限适配器、81项检查、冻结后的真实六目标确定性验证、两次真实Codex。完整目标 active，非阻塞；无完整三类任务2×证据，不能以六目标/一次调用宣布完成。
- 新 bench/ashby-yesno-state.mjs 识别公共Ashby class结构（yesno容器、2选项按钮、yes/no data-option、唯一label、同field-path隐藏checkbox），不读React内部状态。button默认submit只有无form关联才可用，显式type=button可在form里；reset/formaction/formmethod/popover/command拒绝。普通aria-pressed继续unsupported。runtime原生扩展未开放按钮，只有Playwrightcompanion适配后pressed-choice bool。
- 绑定可见No选项也用choices:true，表示选中此按钮；每问题只能绑定一个选项。最多一次点击，1s内等唯一pressed状态、120ms再查。无反馈/双选/状态回退/身份变化停止不自动重试。backend缓存适配器契约，goal最终回读及document-session发现刷新也检查。coverage显式native/ARIArequired两选项按一个问题，但真实CSS星号仍未解决。
- 新pressed-choice15检查通过，初版12项中10红2绿保留；其余companion11/context12/question8/independent14/conditional11/offline-ready10，共81。真实ashby-pressed-check冻结后一次source.apply正确6目标、2按钮点击、checkbox与aria一致、零文件/提交。目标为姓名/邮箱/两道YesNo/两个全文段落。现41节点支持38，剩2文件+1地点未支持。
- ashby-frozen-harness全新无登录context、已核对两个publicGraphQL读query，其他POST/WS阻止；serviceworker禁用，复用SOCKS5 freeze切断所有HTTP(S)/WS传输，state frozen且activeTransportSockets0后才建控制器。仅冻结后填虚构资料。关闭browser/proxy不保留个人profile，不是WebRTC/WebTransport/系统网络沙箱。没有降低冻结门槛获取远程地点。
- Codex批次1789969542053：A(不需签证/6年)37.084s、含准备43.981s，No/Yes正确；B(需签证/2年)32.299s、总38.851s，Yes/No正确。各一次apply、6/6目标、2按钮click；两段完整源文逐字核对，三选一其余两题空、零上传/提交。London UK地点未填且两次最终报告，其他未提供可选字段空。模型称optional-choice措辞不可当区块可跳过的证据，实际正确答一题。
- 两次初始pagehash相同，33运行时/锁/adapter/harness/source指纹测前后相同，所有功能回归结束才测model，没有筛掉重跑。无基线速度对照、同一真实页面变换来源，不是两类真实任务。生产browser-bindings-mcp，无新增APIKey/全局配置。raw轨迹private，编号/最新报告codex-ashby-pressed*.json，报告ASHBY-PRESSED-CHOICES.md、ADR0016、README更新。
- 所有测试和模型进程结束，无待轮询句柄。下一步地点控件的公共语义/远程依赖是当前明显缺口；调查可只读，任何虚构个人资料仍先冻结网络，远程目录无法用断网失败证明不兼容。附件/视觉必填/完整任务仍需推进。此前可选公司名/URL问题未回复，不重复催问；仍有可自主完成工作，非阻塞。


## 当前接续点：页面规则进入首次观察，Codex 两次正确遵守

- 本轮 progress：真实页面规则提取、生产观察/保护修复、79项检查、四次真实Codex对照。完整目标 active，非阻塞，无完成审计通过；不要以本次一次调用替代真实完整三类任务2×。
- runtime新增formContext：共同form/祖先内的标题/段落/li/legend、显式aria-describedby，原文关联最近含字段容器refs；关系仅邻近证据，不是解析好的约束。128段/单段1200/合计12000字符，显式truncated；任意div/span、视觉required、隐藏跨页仍缺。投影保留formContext和limitations，工具说明两侧共用、提醒读取规则且页面数据无权覆盖用户授权。
- 完整采集文案签名检查（包括输出截断尾部）在guard/原生fill执行，变化FORM_CONTEXT_CHANGED不允许同义节点重试。goal对已有目标关联的文案做最终回读核验；document-session发现后检查上下文变化防止刷新消掉旧计划边界。
- 第一次companion回归因React Select的aria-describedby placeholder选择后消失而误阻止，失败保留form-context-companion-initial-failure.json。仅匹配公开classNamePrefix __placeholder与__value-container且唯一editable combobox的占位提示被排除，外部说明仍受保护；live/status/alert/log通告排除。没有取消全部说明保护。
- Ashby最终只读审计ashby-application-form-context.json有18块/2117字符/未截断；三选一详细原文与f13/f14/f15对应三题关联，字段refs也保留。没有真实输入、选项点击、上传、登录、提交；原有两个读GraphQL白名单不变。UK Staff只是系统实现样本非用户秋招岗位。
- 79 checks通过：form-context12 + companion11 + question8 + guard16 + conditional11 + independent14 + receipt7。新测试覆盖section scope/hidden explicit description/compact+grouped传输/旧计划规则变化/批中停止/最终120ms变化/发现后规则变化/截断尾部/placeholder正常消失。最初稳定5红1绿报告保留。
- Codex批次1789968585068四次：one/off29.151s2call填3题错误；one/on25.968s1call填1题正确；two/on27.337s1call填2题正确；two/off33.831s2call填3题错误。姓名邮箱、实际填写全文全部正确，缺日期留空并报告，零提交。旧侧都先context再apply，新侧直接apply。提示没有泄露选择数量；源码没有题目规则/答案。实验provider只移除旧侧模型可见formContext，两侧其余工具/执行器相同。
- 34运行时/锁/provider/fixture/source hash前后相同；同页配对提示/source/工具说明/移除新增data后上下文hash相同。新context3069→4027/4023字节(+约31%)仍更少调用。每条件一次，同模式两个变化样本；错误基线且少量检查/审计与模型重叠，**不计算提速比例/倍数**，不证明任意扩充上下文更快。原始轨迹private、公开编号报告和最新汇总完整保留。报告FORM-CONTEXT.md，ADR0015，README链接。
- 所有进程结束，无待轮询句柄。下一步应推进真实未支持的Yes/No按钮、地点搜索、附件/完整可审核任务；不是继续在两个选择数量fixture上计时。视觉必填、机器验证完整规则仍未解决，不能声称已支持完整Ashby申请。先前可选公司名/URL问题无回复，不重复催问；仍有可自主推进的工作。


## 当前接续点：第三种真实系统发现漏题，观察修复完成

- 本轮 progress，没有新模型计时；完整目标仍 active，无阻塞审计。不要继续同一 PDF/alias 样本追倍数，也不要用本次观察修复宣布完整目标完成。
- 新 third-ats-audit 只读审计 Ashby/SmartRecruiters。Ashby GET-only 初次误拦读取 POST；显式放行两个核对过的公开 GraphQL query 后加载申请页。另一次 form input 等待失败是 div 容器假设，已修复 harness；两种失败保留。SmartRecruiters 遇到反自动化页，没有绕过，未得表单证据。没有任何真实输入、上传、选项点击、登录或提交。
- 真实 Ashby UK Staff 岗位（系统实现样本，非秋招）原观察37节点→41，支持34不变，原生/ARIA必填3不变。此前四个 aria-pressed 按钮（两道问题）完全遗漏、26个原生问卷选项所属四题 group 全空。runtime 新增唯一直接未关联 label 回退，显式 ARIA/legend 优先，匿名 fieldset 分组隔离；aria-pressed 按钮观察为 unsupported-toggle 并加入变更 guard，不可执行、不假定互斥、排除 add-row。
- 真实复查四个问卷组与两道 Yes/No 名称恢复。剩余7未支持节点为4按钮+2文件+1地点组合框。Resume 在此页可选，两个文件入口不可都当必填。截图 private/ashby-application-audit.png 已目视检查。
- **更关键剩余问题**：地点/YesNo 的纯视觉必填未被原生/ARIA计数识别；新增 limitations.requiredness 并核验真实MCP传出。页面还要求“三题只答一题”，当前节点布尔 required 无法表达该区块约束。不得把 visibleRequiredCovered 或某次绑定 complete 当整份申请完成。下一步优先保留问题说明/区块规则及验证真实控件执行，不以少回合替代任务正确性。
- question-observation 最终8项通过，含 stdio MCP 三个明确虚构偏好正确、4未支持按钮报告、零按钮点击；about:blank 缺crypto的harness错误及随后6红1绿保留。文档guard8+guard16+companion11回归通过，共43。不是新Codex模型任务。报告 ASHBY-QUESTION-OBSERVATION.md，README已链接。
- 所有进程结束，无待轮询句柄。此前可选公司名/URL问题未回复，不重复询问。真实完整三类任务中位2×门槛仍未达成；尚有可自主完成的问题上下文/完整任务建模工作，非阻塞。


## 当前接续点：companion 变体已接入，负结果定位到工具说明

- 本轮 progress，有接入代码、负对照和后续假设检验；完整目标仍active，无阻塞审计。browser-bindings-mcp读取AFA_QUERY_VARIANTS=1，companionCommand仅在显式开启时转发。默认关闭，不改全局配置/Skill。既有匹配/预算/恢复算法未改。
- 五项新真实companion MCP检查（两个索引目录×开关+打印命令）、旧变体11和默认companion11通过，共27。开启正确填五目标，关闭schema拒绝且零查询/写入；source/page上下文同配对hash相同。
- 第一批1789966453725四次Codex均正确40目标，源是上轮两个视觉相同的PDF（仅绘制指令次序不同），交替off/on再on/off。off44.205/43.598s，on45.678/51.402s；全部2调用。开启只为显式双语学校声明变体，城市仍杭州空后第二次Hangzhou；实际搜索7→9。描述性中位43.901→48.540s，负结果保留，不冒充提速。61源码/锁文件/fixture指纹前后一致，各对提示/源/规范化上下文hash一致。初版bindings-server在source-snapshots/companion-variants-before-guidance归档。
- 后续只改两种模式共用的一段条件选择说明：常规译名/音译可以不逐字出现在原文；表示变化不能改变事实，要参考观察到的表单/候选语言并保留地区/校区；不确定实体等价性先发现。没有样本答案/翻译字典，没有放宽谓词。
- 后续1789966731675仅一对反向PDF任务（先on后off），on32.444s/off33.611s，两边1调用、10目标正确/次、6次实际搜索日志完全一致、缺日期空并报告、零提交。on虽预声明备用中文词但未触发恢复；两边直接英文首次命中。说明可消除本样本一轮，不证明变体额外收益；两次单值差异及跨批速度差不作稳定百分比主张。61指纹前后未变，最终文字/参数/学校限定/介绍都核对。最后代码上五项companion接入检查也通过。
- 默认仍关闭变体，保留通用译名说明与可选入口。报告COMPANION-QUERY-VARIANTS.md、原始编号报告、initial-summary及最新summary区分两阶段。新增codex-companion-variants和summarize脚本；AFA_PROBE_VARIANT可只跑指定PDF一对。不再围绕alias/PDF样本采样追倍数。
- 所有测试/模型进程结束，无待轮询句柄。下一步应扩大真实任务代表性或解决真实工作流中独立缺口；当前仍缺实际用户选定的登录后招聘表单、附件/跨页等完整任务证据。先前可选公司名/URL问题尚未回复，不重复催问。原始完整目标和三类任务2×暂定门槛保持，不能以本次一个回合或PDF局部支持宣布完成。

## 当前接续点：受限 PDF 来源接入完成，实际 Codex 两次正确

- 本轮 progress：支持原始纯文字PDF来源，不必预先整理Markdown；不是完整目标达成。仍active，无阻塞审计。新 source-reader/pdf-source.py/source-quote，源bytehash、空间片段page/bbox；AFA_PDF_SOURCE=1显式启用，AFA_PYTHON配置本地pdfplumber0.11.9。未安装新全局依赖/改Skill；当前用bundle Python。
- 仅PDF会话MCP schema允许 {sourceId,quote} 唯一精确子串，或2–12个不同ID数组用换行连接同页完整片段。原生选择仍普通来源ID；引用/连接只适用文本类字段，未加自由文字替换。偏移/所有来源ID进入receipt/ledger身份，避免同一entry的另一引文被错认成同一目标。Markdown schema仍旧简单形态。
- 两栏普通extract_text反例会把联系方式和右侧学校拼在同一行。空间runs避免本样本此问题，反向PDF绘制指令仍同样17片段，但24pt/3pt阈值只是启发式，不是通用布局保证。图片/扫描/旋转/无文字页拒绝，无DOCX/OCR。5MB/10页/300片段/10万字、15s进程timeout。PDFium已目视检查三份fixture；bundledPoppler缺Adobe-GB1 mapping导致空白，未改全局工具，记录在PDF-SOURCE.md。
- 首批1789965738330第一任务106.615s/7调用最终10目标正确，三次INVALID_SEARCH_CONDITION暴露旧分支：字符串也有.search方法。新增hasQuotes触发preflight后误把原生选项字符串认成条件，补typeof object。第二任务主动中止，报告保留错误，不是完成样本。定向preflight/ledger测试先红后绿。旧中文提示回归也恢复。
- 最终1789965949436两个Codex任务：双栏47.802s/总48.457s；绘制顺序反转55.335s/总55.985s。分别提取91/83ms，准备652/645ms；两次均2次apply、10目标正确、两校区正确、两句介绍完整、缺日期空并报告、7次实际搜索、零提交。都是先杭州空再Hangzhou。没有额外PDF整理模型回合。两个输入视觉语义相同，不是不同任务种类，且回归并行运行，**不作速度对照**。七个相关运行时指纹测前后未变，最终文本/工具参数人工核对。
- 最终检查63通过：PDF9+条件11+独立14+MarkdownPW8+companion11+离线10。所有进程结束，无待轮询句柄。文档README/PDF-SOURCE.md/ADR0014记录使用、限制及失败；fixtures与生成源保留，原始模型轨迹private不提交。
- 下一步有一个直接相关的接入缺口：AFA_QUERY_VARIANTS既有隔离provider支持，companion未转发。本次PDF又复现机械中英查询回退，值得把既有受约束恢复接入用户入口，验证能否消掉第二次调用，不要发明更弱的匹配或省校区。不能把同一alias fixture反复计时当真实全流程2×。真实招聘页样本仍待用户可选公司名/链接，勿重复询问；真实登录只能用户操作。

## 当前接续点：登录后再冻结入口完成，本地验证通过

- 本轮 progress，无新 Codex 速度测量，完整目标仍 active。新增 `--offline-after-ready`，手动登录/加载表单/Enter 后，切断 HTTP(S)/WS，才创建控制器和0600连接文件；强制临时 profile，退出删除。默认在线入口不变。
- 初版 pending 请求集合门禁失败：模拟登录 fetch 响应后导航，Playwright/CDP 都缺失结束事件，Page.stopLoading 未解决。没有忽略请求或修改 fixture 消费响应体。最终用新 freeze-proxy.mjs 的专用回环 SOCKS5 CONNECT 转发器切断传输；保留 observedUnfinishedRequests 仅作诊断。HTTPS 不解密，无系统代理修改。SW 启动前禁用，HTTP/WS/offline 二层阻止。报告 OFFLINE-AFTER-READY.md 有失败与边界。
- 新离线流程10/10、TCP/TLS3/3、原 companion11/11，共24检查通过。实际 stdio MCP 两字段正确、缺日期报告、零提交；模拟输入触发 fetch/beacon/worker/iframe/旧新WS 都未到达本地服务器；预先打开的持续响应和TLS流被切断。CLI Enter/EOF/SIGINT、页面关闭和profile清理通过。
- 初版测试清理泄漏已修复，旧挂起进程已终止。代理计数竞态及流测试错误监听 req.close 的失败均保留，最终修复后通过。并非实际模型速度测试，也没有真实登录/申请/个人资料输入。
- 此模式只验证页面 HTTP(S)/WS，不是系统网络沙箱；WebRTC/WebTransport/扩展通道未验证，不应用于含这些通道的网站。强杀后的临时profile可能残留，不重用。远程搜索/懒加载失败不能当网站不兼容；不能用断网局部任务声称完整在线提速。
- 仍在等待先前可选问题的实际公司名/链接，勿重复询问。可使用新入口请用户在自己选定页面手动登录后检查，不能伪装成已获得真实表单证据。另一独立缺口仍是 PDF/DOCX 到可引用来源，但勿将其局部支持替代完整任务门槛。
- 按第一性原理，主要假设仍是减少模型往返，非重写动作层。已有条件计划约35.5%小样本改善，未达真实完整三类任务2×。下一轮优先代表性与完整工作流，不继续围绕合成目录追倍数。

## 当前接续点：中文秋招公开入口审计完成，需先解决登录后离线验证

- 本轮 progress：公开官网/官方文档研究、真实浏览器分阶段审计和失败复查，改变下一步优先级。没有新的Codex速度测量。完整目标仍active，无阻塞审计；仍有可自主完成的接入与资料输入工作。
- 新 `bench/chinese-public-audit.mjs` 只在全新未登录上下文访问公开页。GET/HEAD加已观察同域职位/配置读取POST的显式白名单；其他写入、WS、SW阻止。未输入任何身份或虚构资料、没有验证码发送/登录/上传/申请提交。可选入口按钮仅在完全断网后点；脚本不是提交通道。
- 搜索先找到微保旧2022说明，未作为当前样本。随后从当前绿盟Moka校招目录发现研发岗位实际链接；MiniMax官网careers链接指向飞书校招，读取实际2027岗位。官方Moka文档的匿名嵌入URL说明不能替代具体租户状态。
- 最初GET/HEAD-only错误阻止了读取型POST：飞书 `/api/v1/search/job/posts`、Moka职位/详情等。列表空及Moka“职位已停止招聘”在此条件下是假阴性，保留受限记录；放行核对后的精确读取路径才继续。初次Feishu整页load超时改DOMContentLoaded+业务读取等待，不声称网站不可访问。
- 具体申请页：Moka `https://app.mokahr.com/campus_apply/nsfocus/29118#/job/16f71a5c-c465-43f7-897c-8812501aef8c/apply` 显示邮箱/手机号验证码登录；MiniMax `https://vrfi1sk8a0.jobs.feishu.cn/379481/resume/7681599148466571566/apply` 跳转 `/379481/login?redirect_path=...`，显示手机号/验证码/协议。没有登录后表单结构证据，不能把搜索框/登录框当真实简历字段。
- 曾在MiniMax详情页冻结网络后点“投递”，进入上述resume路由，然后 `page.evaluate: Target crashed`；进程已终止，失败保留 chinese-public-application-entry.json。新上下文只读直接打开实际路由正常显示登录。之后两个登录页先加载、再冻结、再现有observer inspect，均通过；未能确认崩溃唯一根因，不能给运行时胡乱打补丁。
- 报告CHINESE-RECRUITMENT-AUDIT.md与各阶段chinese-public-*.json，记录方法/路径/参数键、公开结构，无cookies/token/参数值/完整职位正文。全部审计进程已结束，无待轮询会话。生产填写运行时、全局配置、已安装Skill未修改。
- 已通过异步工具询问用户最近实际慢的公司名/公开链接，尚无回复；这是选样信息，不是待批权限。不要重复询问，收到时优先纳入。不要为此停掉独立可做的工作。
- **下一步优先实现明确的登录后离线验证模式**：companion让用户手动登录并进入最终表单，再冻结所有网络、确认pending归零之后才给Codex连接。当前companion默认在线，匿名offline-harness加载即冻结，两者都不直接满足此流程。需考虑既有WS/SW、启动/等待中断与无冻结前写入；本地模拟手动登录/懒加载测试可自主完成，真实登录仅用户操作。不要把此计划写成已完成。
- 同时保留另一完整流程缺口：PDF/DOCX原始简历到可引用来源，当前只有有限Markdown；可在无用户账户情况下推进，但不能用该局部支持替代真实全流程提速门槛。

## 当前接续点：有界查询变体已验证，保持实验可选

- 本轮为 progress：实现、功能与实际 MCP 检查、四次 Codex 配对得到新证据；完整目标保持 active，无阻塞审计。
- 可选 `AFA_QUERY_VARIANTS=1` 仅隔离 playwright-bindings provider 转发，conditional/independent 模式支持 `search:{queries:[...],labelParts}`。最多三个不同查询词，整个计划最多十二词、共享八秒发现期限（合作式预算），固定全部匹配条件；只有非截断 observed 空选项才推进，非空冲突/歧义/禁用/截断/未就绪不会自动换词。查询记录随回执保留，成功项不在下一发现轮重查。
- 新 query-variants.mjs 负责轮次，document-session 在新模式预检所有来源/普通绑定，各轮检查源/文档/全页字段语义，最后仍旧来源/optionRef/选中重查/回读路径。backend discover 接受内部传来的剩余期限，上限仍八秒；默认无变化。旧单query条件现在schema拒绝额外属性，避免把queries静默丢弃。
- 新检查11项+旧条件11+旧独立分组14全通过；新检索语言互换的 query-catalog-a/b 使用真实React Select、双语虚构资料和苏州/宿州地区干扰，四次stdio MCP检查通过（两次启用完成五目标、两次未启用拒绝且无写入）。测试参考答案从未导入provider。
- Codex批次1789962939672：A旧47.038s/新29.171s，B新35.358s/旧48.223s。四次均正确，二十目标、缺日期均空并报告、零提交；每次五个真实查询，相同页的搜索及次序完全一致，2→1工具调用。旧模式英文空后由宿主改中文；新模式模型主动提前给英文/中文变体，固定名称和地区条件，工具内完成恢复。没有重跑挑样本。
- 描述性中位47.631→32.265s（32.3%、1.48×），每页/模式仅一次且检索规则人为变化，不能声称真实网站稳定收益。handler约2.6s不变，提示相同、同页context hash相同；全部最终文字逐份检查。139项源码/依赖/bundle指纹测前后完全一致，无测后运行时补丁。报告QUERY-VARIANTS.md、codex-query-variants-summary.json、ADR0013。
- 所有宿主和浏览器进程已结束，无待轮询句柄。companion默认未启用，日常扩展仍未接入；README给隔离demo-search的显式开关。没有全局配置或已安装Skill改动，无真实在线填写/上传/提交。
- 下一步回到真实迁移和完整流程代表性；可优先调查用户秋招更接近的公开中文招聘页面，在只读审计/冻结网络虚构验证中找能力缺口，不继续围绕这两个人工目录采样追倍数。完整申请、服务器接受、PDF/DOCX、文件和跨页仍是缺口。已有独立浏览器入口可使用用户明确选择的URL/资料，但这不构成真实申请提交授权。

## 当前接续点：独立浏览器入口已完成

- 本轮 progress：实现可试用入口、11 项连接/生命周期检查、一次实际 Codex 集成。完整目标保持 active，无阻塞审计。
- `npm run browser:demo` 自动打开本地虚构别名/校区页与资料；`npm run browser -- --url ... --source ...` 打开指定页面，打印临时 Codex 连接命令。新 browser-companion/controller/bindings-mcp 复用既有 PW 后端，无新的模型 API、全局配置、已安装 Skill 修改。独立 profile 默认保留，temporary 删除；只控制初始标签页，无 CDP 网络监听。
- 最终 companion-check 11/11 通过：私有文件/令牌、Origin/Host、UTF-8 分片、真实 MCP 10 目标、换页/多标签隔离、退出与启动取消、虚构 Cookie 重启保留、显式与demo CLI。最初空文档报错/Host测试误用fetch的两失败均保留；以 node:http 验证错误Host 403。仅证明测试Cookie保留，不证明真实登录。
- 实际 Codex 批次1789962098637，47.700秒、两次apply、10/10独立应用状态正确、零提交、缺失日期留空并报告。第一次中文“杭州”在英文目录查询为空，第二次改Hangzhou并复用学校optionRefs成功；完整原始记录保留，没有重跑挑一次调用。不是速度对照。执行器没有加入样本翻译表。
- 新入口预取+批量发现+independent模式（含conditional）+compact原生选项，默认full回执，不能将independentGroups与repeatGroups混用。此次实际Codex用了repeatGroups；11项检查后新增内容仅文档，核心与实测一致。
- 本轮原型仍从bench路径导入通用PWbackend，已核对无样本答案；暂不为目录整洁复制引擎。README有两步启动与资料/页面变化处理说明。报告BROWSER-COMPANION.md。所有测试进程已结束，无待轮询会话。
- 下一步可针对实测跨语言查询回退探索“提前声明多个来源支持的查询变体”，避免机械第二轮；应保持有界、精确条件、歧义/校区/无结果返回及来源验证，另造独立变化样本再测。也需继续推进真实完整流程可用性，不在同一页追逐倍数。所有公开页虚构填写仍先冻结网络；新在线入口可用不代表获得真实申请/提交授权。

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

## 前一轮：条件选项计划已测，提交 7f356b4 与当轮实测版一致

- 本轮是 progress：实现+验证新的任务协议，得到改变下一步优先级的端到端证据。没有阻塞审计或待等的外部输入。
- 根据之前的时间边界，将精简回执暂缓，优先试验有机会省一次宿主往返的条件选择。新增 conditional-choice.mjs；`choices[ref].search={query,labelParts}` 可在普通或重复组中使用。模型给来源支持的字面名称/校区词组，先本地发现全部选项，只有非截断结果中的唯一可用匹配才通过旧optionRef路径填写。未知/歧义/改义返回候选，不能弱化条件；默认模式仍不开放这个schema。
- 条件模式只在隔离Playwright provider通过 AFA_SELECTION_MODE=conditional启用，普通form_search继续保留，日常浏览器扩展尚未接入。无新增模型API、无全局配置或已安装Skill修改。
- 11个条件检查+2套真实stdio/MCP应用状态检查通过。首次旧模式拒绝测试只是断言期待错误码不对，已保存初始失败后修正。检查含缺限定词回退并以返回optionRefs恢复、源变更、字段改义、选项消失、重复标签、截断/禁用等。
- 6次交替Codex批次1789956240788：observed43.152/53.957/47.315s；conditional37.083/29.883/30.534s；中位47.32→30.53s（减少35.5%，1.55×），3组均快。6/6最终正确且无工具失败/额外恢复，2→1次工具调用；每次10目标，共60；来源缺失日期均留空并在最终报告指出，零提交。
- 两方每次均6次实际搜索，MCP handler总时长中位3.607/3.554s，工作量、验证不变。条件首个工具前规划更久（中位12.934→16.146s），整个任务更短，不能用局部区间代替总耗时。6份上下文hash完全相同，101个测量源码/依赖指纹测前后均一致。
- **本轮没有测后行为补丁，最终运行时即实测版本。** 所有宿主和浏览器检查进程已结束，无待轮询句柄。报告 reports/CONDITIONAL-SELECTION.md；ADR0011；README已给出隔离演示开关。
- 当前进展支持优先减少需要宿主重新判断的阶段，而非浏览器微优化。仍只是明确英文校名/校区来源下的独立组件样本；下一步应验证真实搜索组件或来源不充分时的实际宿主回退，不能外推任意翻译/真实业务接受。完整目标仍active，真实全流程、多页、文件上传、PDF/DOCX与日常会话未证明。

## 最新：真实 Greenhouse 离线迁移与 Codex 回退通过

- 本轮是 progress，有新的真实控件失败、修复和实际宿主结果；无阻塞审计。完整目标仍 active，未证明真实完整申请稳定提速 2×。
- 公开 Cloudflare/Greenhouse `/7377424` 页面，GET/HEAD-only 新浏览器加载后冻结全部网络，之后才填虚构资料。harness 新增显式 networkidle 加载选择，解决 SSR 输入先于延迟脚本就绪的问题；默认 load 不变。空菜单预加载未解决远程目录，负结果保留且未保留无收益接口。
- 真实下拉先 No options、后 popup Loading，旧适配漏掉关联 listbox 中加载提示。现在检测关联菜单提示，空状态稳定350ms才返回空，loading有界等待后报CONTROL_NOT_READY。这是有界启发式，不能保证更长无信号debounce。
- tel比较仅容许标点/空白格式，所有数字、前导零/加号严格一致，回执标注等价理由。国家下拉选中只显示+1，使用可见唯一iti__xx国旗标记映射先前观察的唯一选项；无标记不猜，美国换加拿大即使显示同为+1也不能验证成功。输入型autocomplete仍只在实验PW后端；旧扩展不支持。
- 连续跨区块选择在真实页受滚动影响点击超时；instant scrollIntoView后再正常Playwright actionability click解决，不使用force。失败报告均保留。
- 最终相关检查47项通过：条件11、延迟4、国家电话4、旧搜索15、目标/MCP13。另真实页面功能检查通过：10个可用目标，独立公开DOM oracle；首次条件失败不写普通事实，四项源事实仍空，零提交。
- offline-public provider已接AFA_SELECTION_MODE=conditional。实际Codex批次1789958532594，55.77s、两次apply：第一轮4/7条件搜索无法离线完成，第二轮正确填10项；10/10独立DOM核验，四项不可用源事实、隐私缺事实、附件未支持均在最终文字报告。没有服务器/实体ID接受证据，没有速度对照，不称申请完成。
- 城市离线查询后不再计入当前可见必填coverage，Codex仍从首次证据记住并报告；当前coverage不是持久任务清单。下一优先项：有明确独立边界的局部失败继续执行，以及跨快照保留未完成目标，减少这类机械恢复的第二次宿主调用。来源/语义/页面变化不得作为可忽略失败。
- 115项源码/依赖指纹测前后一致，source-hashes-greenhouse-smoke.json；旧35.5%速度结果属于7f356b4，当前代码不得冒充同一实测版。报告GREENHOUSE-MIGRATION.md，原始宿主日志private/忽略提交。
- 所有本轮宿主和浏览器检查进程已结束，无待轮询会话。没有更改全局配置、已安装Skill、真实申请、上传或提交。

## 最新：独立分组一次处理局部失败，真实页配对完成

- 本轮为 progress：新增协议与任务记录，实际MCP/真实页以及六次Codex对照完成。完整目标仍active；未达到真实完整申请、三类任务稳定2×的验证门槛，不做阻塞审计。
- 可选 `AFA_SELECTION_MODE=independent` 包含条件搜索，额外允许 `independentGroups` 将全部顶层绑定精确划分为依赖组。只对已识别的未就绪/预算耗尽/歧义/无匹配/截断暂缓整组，其余组本地完成；来源、页面身份、字段含义改变和未知错误停止。模型显式声明独立性，不按DOM位置猜；同题单/复选不能拆组。当前不支持与repeatGroups/checkboxGroups混用，旧路径保持。
- `document-session.mjs` 抽出纯prepare预检，全部分组/来源绑定先校验；`independent-plan.mjs` 负责组划分、失败分类和跨快照目标记录。部分完成仍complete:false，返回partial/appliedSubsetComplete与task.unresolvedTargets；控件隐藏后继续保留来源任务，后续验证可消除待办，已填值后来变动则重新显示未验证，文档替换清空旧任务。分组只有发现阶段的整组暂缓，不承诺写入阶段事务回滚。
- 新检查14项通过，首次1项失败仅错误码断言过窄，初始报告已保留。真实公开页一次stdio/MCP检查10目标正确、4未解决且刷新不丢、零提交。旧条件11+实际MCP2、文档8、复选21+实际MCP1均通过。代码复查后在计时前补搜索期间文档替换清空旧ledger，并重跑相应14+11+2检查。
- 实测批次1789959368271（三组交替）：旧71.418/50.155/128.157s，新42.955/50.092/43.782s，中位71.42→43.78s（本批38.7%）。6/6正确，60目标、零提交，相同14项来源、7个条件搜索、最终10填写+4未解决；旧均2次工具调用、新均1次。三次新计划电话国家/电话同组、教育三项同组。六份上下文hash与提示hash分别相同。
- **不宣称稳定38.7%或2.9×**：第二对基本持平，第三对旧流程首次工具前73.84s，主要长尾在执行器之外，不能判定具体原因。本地执行中位7.09/7.04s基本相同，尾段8.84→12.44s反而变长；回执体积/最终文字可能影响但未隔离。
- 批量驱动退出1是City-only正则把新模式三份“Location”误判成没报告城市。六个Codex进程都退出0、页面与ledger均正确；最终文字已逐份复核四未完成+隐私/附件缺口。原JSON错误标志保留，另有codex-independent-summary.json记复核。测后只扩大关键词正则，旧driver归档到source-snapshots/independent-measured；119项指纹按postMeasurementArchives全部核实。实际运行时代码与实测一致。
- 报告reports/INDEPENDENT-PLANS.md，ADR0012，README已解释可选开关。所有执行进程已结束，无待轮询句柄。未改全局配置、已安装Skill或真实申请。
- 下一步不要反复用同一页追逐倍数：可对成功回执做单独投影消融，保留完整本地验证与所有未解决/失败事项，检验尾段是否减少；同时需要推进真实可试用集成。当前只支持有限Markdown、实验PW后端，PDF/DOCX、日常登录浏览器、在线查询/文件/多页完整流程仍未完成。

## 最新：回执投影完成，未显示净提速，停止这条微优化

- 本轮是 progress：实现、严格重建验证、两种实际MCP与六次Codex消融，得到应调整方向的负结果。完整目标仍active，没有阻塞审计。
- 可选AFA_RECEIPT_MODE=changes在已核验整批/子集时返回changes-v1：精确元数据/字段增删改与字段顺序、基准hash，可重建原观察。task已验证条目改为计数，所有未完成、逐项expected/actual证据、来源绑定、coverage、候选、条件与错误保留。会话内部完整观察/验证不变。无基准/换文档/重复ref/未验证执行/分组上下文时回退完整。默认仍full。
- 新receipt-projection.mjs是纯返回层，bindings-server跟踪最近实际发布页面；两个隔离PW/offline provider转发开关。工具说明两模式相同，先前default/full调用仍正常；日常扩展provider未开启新开关。
- 7项重建/保留/回退检查通过。真实Greenhouse full与changes两种MCP检查通过，changes重建字段/控件与新完整观察一致，10目标独立DOM正确，4待办刷新不丢，零提交。旧observed/conditional两种MCP也通过。初次真实MCP测试错误比较JSON缺失属性与内存undefined，失败保留后改按wire数据比较，无运行时补丁。
- 批次1789960601746，full43.241/51.165/44.565秒，changes40.965/48.304/45.443秒；中位44.57→45.44，约慢2%，不能宣称加速，也不能据小样本声称必然更慢。6/6正确、60目标、零提交、全部一次apply。相同14来源、7条件、10填写+4未完成；六份context/tools/prompt hash各相同。回复文字逐份检查四项未完成+隐私/附件都报告。
- 字节中位14192→8610（减39.3%），尾段10.66→9.34秒，首次工具前21.53→22.18秒，局部执行6.96/7.01秒。局部指标不替代完整耗时。
- 三次计时后第四次公开页加载ERR_CONNECTION_CLOSED，尚未启动Codex，驱动停止。只读浏览器探测也失败，随后普通HEAD200，恢复时浏览器成功。只增加明确的pre-host该错误续跑能力，跳过前三次已完成任务，保留失败行1789960755528，再完成后三次；没有换代理/请求头/权限。原控制器归档source-snapshots/receipts-measured，122项源/依赖按映射核实；真正运行时/提示/单次宿主driver全程冻结。中断延长第二对间隔，解释结果需保守。
- 报告RECEIPT-PROJECTION.md，codex-receipts-summary.json。所有测试/探测进程终止，无待轮询句柄。默认full不改，不再围绕同一页压缩回执追倍数。
- **下一步转实际试用集成**：先进能力目前只在bench隔离PW provider，旧日常扩展还不支持输入型autocomplete。可复用现有PW后端做用户明确选择URL/资料的独立浏览器入口，使用独立profile和仅本地鉴权MCP，不改全局配置或已安装Skill；先用本地虚构页做实际MCP/生命周期检查。用户允许独立app。不要把接入新入口等同于真实申请完成；所有公开页虚构输入仍维持网络隔离，不能进行真实上传/提交。
- 已只读查看现有bridge.mjs/bindings-mcp.mjs和manifest：旧桥只支持inspect/fill/plan/goal，daily provider只转发repeat/context；它不是直接复用新discover路径的入口。已确认本机Playwright类型提供launchPersistentContext及handleSIGINT，.profiles/和.runtime/均gitignored。尚未实现新入口，不把这个计划当作完成。
