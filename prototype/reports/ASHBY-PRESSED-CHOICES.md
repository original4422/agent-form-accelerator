# 真实 Ashby Yes/No 接入一次填写计划

> 2026-09-21 后续证据修正：姓名输入也会触发 ApiSetFormValue，冻结后请求失败但 DOM 保留值。下文六目标及两次 Codex 记录只证明当时的本地控件状态；当前 backend 会在首次失败后停止。原确定性报告另存 ashby-pressed-check-pre-update.json，当前同名脚本已改为验证失败边界；历史 codex-ashby-pressed.mjs 的六目标成功断言不适用于新契约。详见 [FORM-UPDATES.md](FORM-UPDATES.md)。

2026-09-21。Playwright companion 新增受限的 Ashby Yes/No 控件适配。两次实际 Codex 在冻结网络后的真实页面中，各用一次工具调用正确填写六个已知目标，包括相反的签证/经验答案。地点和文件仍未支持，**这不是完整申请完成或提速倍数证据**。

## 选择契约

上一轮只观察到四个 unsupported-toggle 节点，无法填写两道问题。[W3C 按钮模式](https://www.w3.org/WAI/ARIA/apg/patterns/button/) 将 aria-pressed 用于按钮开关状态，但没有保证它一定代表互斥的申请答案。因此原型没有把所有 aria-pressed 按钮升级为可执行控件。

新 `ashby-yesno-state.mjs` 只识别已观察到的公共 DOM 结构：明确的 Ashby yesno 容器、两个直接选项按钮、yes/no data-option、唯一问题 label，以及与同一 field-path 对应的隐藏原生 checkbox。按钮必须有不同的非空名称，aria-pressed 只能是 true/false；原生 reset、关联 form 的默认 submit、带提交/弹层/command 属性的按钮不支持。不是 Ashby API 保证的通用接口，站点结构改变时可能停止识别。

适配后每个选项是 `pressed-choice`。绑定选中的选项并传 true，表示选中该选项；选择文案为 No 的按钮同样传 true。不是把问题答案“否”解释为不点选。一个问题只能绑定一个选项；来源引用、语义判断和现有字段证据路径保持不变。普通切换按钮仍未支持。原生扩展执行器没有被开放为任意按钮点击器；本功能仅接入 Playwright companion 路径。

适配器保存问题/选项/提交关联的结构身份，填写前和批内重新核对。每次最多点击一次，等待最多一秒的明确状态，并在120ms后重查：目标必须 pressed，另一项必须未 pressed。未知/混合/两个同时按下、点击无效、状态回退、身份变化均停止，不能作为普通 DOM 替换自动重试。后续目标协调器还执行原有最终回读；内部发现不能通过刷新绕过旧选择契约。重复执行已选中的目标不会再次点击。

显式 native/ARIA 必填的两个选项按一个问题计入覆盖。真实 Ashby 的 CSS 星号仍未进入 required 计算；本轮没有声称解决视觉必填识别。

## 功能检查

新 `pressed-choice-check.mjs` 15/15 通过，包括正反选择、切换和幂等、默认 submit 关联拒绝、显式 type=button、结构不一致、原生 form 关联变化、没有选中反馈、双选矛盾、状态回退、最终回读期间身份变化、单问题必填计数、来源绑定以及搜索期间身份变化。

最初同一执行路径稳定复现12项中10项失败、2项通过，保留 `pressed-choice-initial-failure.json`。后续补充三个保护用例成为15项。原有 companion11、form-context12、question-observation8、independent14、conditional11、offline-ready10 也通过，共81项。没有为让测试通过而放开普通按钮。

## 真实页面验证方式

[具体 Ashby 申请页](https://jobs.ashbyhq.com/ashby/0020099f-9bb3-4da9-9808-4556564f5301/application)，资深英国工程岗位，仅作系统实现样本，并非用户秋招岗位。

`ashby-frozen-harness.mjs` 使用全新浏览器上下文，经已有 SOCKS5 转发器加载页面。加载期允许 GET/HEAD 和核对过的两种公开 GraphQL 读取操作，其他写入请求和 WebSocket 阻止。等待真实控件出现及页面就绪后，使用已有 network-freeze 切断 TCP/HTTP/WebSocket；服务工作线程禁用。只有 state=frozen 且 activeTransportSockets=0 才建立 Codex 控制器，退出关闭浏览器和转发器，没有可重连的个人 profile。

这是页面 HTTP(S)/WebSocket 的隔离诊断，不是系统网络沙箱；没有验证 WebRTC/WebTransport。没有使用真实申请人信息、登录、文件上传或提交。资料是仓库中明确标注的两个虚构源文件，浏览器只在冻结后接收这些值。沿用上一轮冻结机制，未降低网络门槛以获取远程地点选项。

首先 `ashby-pressed-check.mjs` 在真实页面确定性执行：一次 source apply 写入姓名、邮箱、两道 Yes/No、两个完整段落，共六目标；按钮恰好点击两次，页面 pressed 状态与原生 checkbox 状态一致，文件数量为零、提交次数为零。报告 `ashby-pressed-check.json`。

## 实际 Codex 结果

批次1789969542053，两个全新冻结页面，使用生产 browser-bindings-mcp；没有测试专用模型工具。提示要求如实填写，即使虚构候选人的事实不满足岗位条件，也不能改成符合条件的答案。

| 虚构资料 | 签证支持 / 四年以上经验 | 工具调用 | 已知目标 | 模型任务耗时 | 含准备总耗时 |
|---|---|---:|---|---:|---:|
| A：无需签证支持、六年经验 | No / Yes | 1 | 6/6正确 | 37.084 s | 43.981 s |
| B：需要签证支持、两年经验 | Yes / No | 1 | 6/6正确 | 32.299 s | 38.851 s |

两次都直接调用 form_apply_bindings，源参数正确选择不同按钮，choices 均为 true。两个完整源段落逐字核对；三选一区块只填写有对应资料的一题，另外两题为空。两次各两次按钮点击、零上传/提交，末尾明确报告 London, United Kingdom 地点控件尚未支持，没有宣布完整申请完成。未提供的 LinkedIn/GitHub/自愿问卷留空；不会为了填满表单而推断人口属性。

模型初始 page hash 完全相同，两份来源和姓名邮箱/资格事实不同。33个运行时、依赖锁、适配器、冻结 harness 和源文件指纹在模型实验前后相同。所有功能回归完成后才开始这两次模型任务，没有筛掉失败重跑。原始轨迹在 private，编号报告与 `codex-ashby-pressed.json` 保留参数、逐项 oracle、耗时和最终回答。

这两次是同一实际页面上相反事实的正确性验证，没有旧实现/官方工具的对齐速度对照，不能计算提速比例。整体仍有一个已提供的地点事实无法填写，以及未支持文件入口。两次最终回答对三选一区块用了 “optional-choice” 的措辞；实际行为遵守了只答一题，不能把这种措辞当成区块可以全部跳过的证据。

## 接下来的范围

当前 companion 在此页识别41个字段/选项节点，38个支持，剩余三个未支持节点是两处文件输入和地点组合框。两处文件分别含自动填写和附件入口，不等于两个必填文件。本轮解决了四个按钮节点的执行，没有证明地点远程目录、文件处理、纯视觉必填或整个在线工作流可完成。

下一步优先调查地点控件的公开语义及网络依赖，明确哪些操作必须在线、哪些能在冻结诊断中验证；然后继续完整可审核表单的对照。保持完整任务明显提速与正确率不下降的原目标，不把单次调用或六个局部字段改成新的终点。

复现（需要现有 Codex CLI 登录和用量）：

```bash
node prototype/bench/pressed-choice-check.mjs
node prototype/bench/ashby-pressed-check.mjs
node prototype/bench/codex-ashby-pressed.mjs
```

后两项依赖公开页面仍可访问；页面变化/拦截会保留失败，不代表网站本身失效。没有新增模型 API Key 或修改全局 Codex 配置。
