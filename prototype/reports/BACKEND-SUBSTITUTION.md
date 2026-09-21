# 同一任务接口，替换浏览器动作后端

2026-09-21。只使用已登录 Codex，不增加模型 API Key。

## 问题与控制变量

上一轮官方工具每次生成脚本，三次均遇到 Radix 隐藏背景触发器后的定位超时。它不能回答“自研动作执行是否必要”。本轮提供经过功能检查的通用 Playwright 后端，不再让模型重新实现控件操作。

这是一项**后端替换实验**，而非完全独立产品对比：

- 两边使用同一个 Markdown 来源解析、片段绑定、三个 MCP 工具、初始上下文和重复组 schema。实际 MCP `tools/list` 的完整返回值已断言相同，包括说明文字和预取资料。
- 两边共用 `executeFormRequest` 的观察/快照验证，以及 `executeGoal` 的有界局部协调和最终校验。
- 扩展后端由隔离世界的运行时派发事件；Playwright 后端只用共享函数进行观察/验证，实际输入、选项、勾选、添加组和键盘动作由 Playwright 1.63.0 完成。它绝不调用原运行时的 fill 分支。
- Playwright helper 不含任何 fixture 名称、字段标签、来源 ID 或预置答案。入口仅允许测试用隔离浏览器的本地页面，通过 CDP 连接；没有接管用户日常浏览器。
- 模型每次仍需从未映射中文 Markdown 判断英文页面字段关系；两边均可一条请求处理完整任务。

因此，若速度相近，说明这里的动作后端可替换；不能据此说来源、字段理解、快照保护与目标协调都可以删除。Playwright 版本为本地锁定的 1.63.0，不是上一轮官方 MCP 内置的另一个版本；本轮不再把结果命名为官方 MCP 性能。

## 功能和接入验证

- [16 项框架检查](playwright-backend-checks.json)：React 状态、Radix Portal、依赖替换、明确校验状态、拒绝/歧义/禁用选项、重复模板等。
- [12 项目标检查](playwright-goal-checks.json)：三种原生表单、同义替换恢复、变义拒绝、延迟拒绝、一次展开和幂等执行。
- [8 项文档检查](playwright-document-checks.json)：来源、分组、单选、长文本、过期资料与页面绑定。
- [两套实际 MCP 接入检查](backend-provider-checks.json)：检查完整工具元数据一致，再填写全部 10 个目标，通过独立 React 状态、校验状态、弹层关闭和零提交 oracle。
- [四项弹层期间语义变化检查](backend-drift-checks.json)：两套后端均在字段标签或分组改变后停止，不选中旧目标的选项。

首次后端测试发现验证调用会产生新快照，helper 却继续使用旧快照，导致写入被保守拒绝；[初始失败记录](playwright-backend-initial-checks.json) 保留。已跟随验证返回值更新快照，再运行全部检查。另一次无模型接入断言发现扩展序列化改变了 controls 对象的键顺序；共享入口现在显式构造统一顺序，因此不通过放宽比较隐藏差异。以上修正均发生在 Codex 正式计时前。

## 完整宿主测量

[完整配对记录](codex-framework-1789948433822.json)，按 AB/BA/AB 交替：

| 动作后端 | 三次完整耗时（秒） | 完整中位数 | 本地执行中位数 | 输出 token 中位数 |
|---|---|---:|---:|---:|
| 扩展事件 | 24.02 / 26.06 / 22.70 | 24.02 s | 0.876 s | 251 |
| 可复用 Playwright | 27.07 / 24.61 / 31.60 | 27.07 s | 0.947 s | 256 |

6/6 全部第一次调用成功，60/60 个目标正确、零提交，没有生成脚本或失败恢复。两边均只有一次宿主工具调用。第二对中 Playwright 更快；每组三次不足以给出稳定性能排名。首次工具事件到达的中位数分别为 13.42 s、13.53 s，较为接近。工具区间中位数 5.79 s、7.09 s，包含审批、调度及传输等，不能全部解释为页面执行。

两边提示相同；所有模型运行计入 CLI/MCP 启动、解析、匹配、审批、填写、验证和退出，浏览器启动和页面重置在计时外。外部 oracle 在计时后核对实际应用状态。使用 Codex CLI 默认配置，精确解析后的模型版本未由 JSONL 提供。

**后续正确性修正：**计时结束后增加的针对性测试发现，初版 Playwright helper 在弹层打开期间若字段标签/分组改变，仍会选择一次旧目标选项，之后才报告不完整；扩展原语会在选择前阻止。见 [修复前记录](backend-drift-before.json)。现已加入选择前的语义身份检查，并重新检查控件路径与实际 MCP 接入。这个问题不影响以上固定页面任务的独立正确性结果，但限制了“动作后端完全等价”的推断。修复版未重新跑 Codex 速度测试；[计时源码清单](source-hashes-backends-measured.json) 指向归档的实测 helper，不能把旧时延冒充最终版本时延。

## 架构结论

本样本没有出现自研动作层的倍数优势；保持任务接口和计划层时，可复用 Playwright 也能在一次宿主请求里正确完成。此前相对每次生成脚本的巨大差距，主要说明重复生成代码及恢复可能昂贵，不能全部归为 Playwright 引擎慢。

因此把工程重点转向**少生成重复代码、传来源引用、一次性语义匹配，以及对可预期变化的本地执行**。动作实现是可替换部件，不再围绕毫秒级差异重写浏览器引擎。同时，新发现的语义变化错误说明通用 helper 仍需要明确状态保护，不能仅凭一条顺利路径就视为完成。下一轮增加独立控件实现和更贴近实际招聘的场景，不再重复这个 fixture 追求倍数。详见 [ADR-0005](../adr/0005-separate-task-contract-from-actions.md)。

## 复现

```bash
AFA_BACKEND=playwright node prototype/bench/framework-check.mjs
AFA_BACKEND=playwright node prototype/bench/goal-check.mjs
AFA_BACKEND=playwright node prototype/bench/document-check.mjs
node prototype/bench/backend-provider-check.mjs
node prototype/bench/backend-drift-check.mjs
AFA_LOCAL_LOOP_HINT=1 AFA_FRAMEWORK_MODES=binding-repeat,binding-playwright node prototype/bench/codex-framework.mjs
```

Playwright helper 当前为实验后端，观察器运行在页面主世界；扩展使用隔离世界。字段 ref 与运行时元数据不是安全隔离机制。后端功能覆盖限于上述检查，部署、iframe、shadow DOM、输入型搜索建议、附件与跨页尚未验证。保持原完整目标，不以这一个样本的后端可替换性代替多类表单上的实际提速。
