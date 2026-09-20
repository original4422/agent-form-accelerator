# 减少模型往返的第二轮调研

## 现有证据与可证伪假设

上一轮有界计划使重复组任务从 4 次工具调用降到 3 次，但中位数仅减少约两成。下一轮不能仅把旧基线强制为更多调用。

- H1：将初始观察和最终值校验留在工具内部，能够进一步减少宿主往返。反证：两种方式都做到一次调用后仍耗时接近，说明往返次数已不再是主要差异。
- H2：模型反复输出事实值/通用执行代码的生成成本仍然显著。保持浏览器执行器、事实、验证窗口相同，仅对比显式 inline 数据和预先存在的本地结构化资料引用。
- H3：准确字段名已知的情况下可以确定性执行，但陌生网页的语义匹配仍需模型。通过标签与资料不同的表单测量首次匹配成本，不能外推 exact-label 合成任务。
- H4：已知操作复用能提高重复任务速度，但成熟脚本也能缓存。后续对照必须给脚本相同的数据引用和复用机会。

## 一手资料与启发

1. [Stagehand act API](https://github.com/browserbase/stagehand/blob/main/packages/docs/v3/references/act.mdx)：已经观察到的 action 可以不再调用 LLM 地执行。启发是分离理解和执行；这也是我们必须面对的强基线，不能将复用本身当成新颖性。
2. [Anthropic Code execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)：数据在工具之间本地流转、减少经过模型的内容，以及代码组合动作。启发是除调用数量，还要测模型必须生成/转抄的 token。
3. [Chrome autofill event](https://developer.chrome.com/blog/autofill-event-origin-trial)：页面联动更新可能需要 refill；输入事件出现不代表应用最终状态完成。本原型的局部循环必须检查后置条件，明确时间窗。
4. [CI4A 论文](https://arxiv.org/abs/2601.14790)：组件级语义接口是另一条降低浏览器操作复杂度的路径，但需要框架/页面合作，不能直接当成任意招聘网站可用的能力。
5. [MCP Tools 规范](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/server/tools.mdx)：工具列表的确定性和缓存很重要。可研究主动观察如何随工具/资源上下文送达宿主，但页面变化、缓存失效和不可信页面内容需要一并解决。

## 真实招聘页的只读观察

以下页面仅通过网页资料读取，没有填写或提交：

- [Greenhouse / DiDi](https://job-boards.greenhouse.io/didi/jobs/6923795)：姓名拆成 First Name/Last Name，存在原生文本、附件入口、Select 控件及有条件的问答。
- [Greenhouse / Luster](https://job-boards.greenhouse.io/lusternational/jobs/4807930008)：教育经历有 School/Degree/Discipline、独立月年控件、Add another。其结构与我们“字段集＋原生 select”简化模型不同。
- [Lever / Palantir](https://jobs.lever.co/palantir/c34b424e-caf2-455a-b104-ae1096ccca29/apply)：Full name、地点建议、链接、语言多选和开放问答。

这些是搜索/网页解析返回的结构线索，尚未做真实 DOM/框架交互验证。Greenhouse 两个页面经 web.open 直达失败，以上仅作搜索索引中的结构样本；Lever 页面已直接打开核对。不能据此声称工具已支持上述网站。后续优先补陌生标签、组件控件和重复分组的恢复验证，而不是继续只扩大同一种 fixture 的字段数。

## 当前策略

先完成一次调用的公平对照；再隔离数据转抄成本。即使结构化资料引用显著提速，也要分别披露已有 JSON 资料、从原始简历提取资料的首次成本，以及缓存脚本的对照。默认继续使用现有 Codex 登录，不增加模型 API 服务。


## 后续真实浏览器只读核对

[结构审计数据](../reports/public-form-audit.json) 使用全新 Chromium，无账号、无填写/点击/提交。Luster 的旧职位实际跳转到 `?error=true` 的职位列表，不能用作申请页验证。Lever 的原申请页仍可访问，观察到 101 个控件；100 个落在原生类型集合并不等于语义可填写。其主要问题是：没有 fieldset 分组，必填标记混入标签，地点控件的隐藏提示混入标签，多组 Yes/No 难以仅由当前 group/label 区分。需要改进观察结构并保留歧义停止，不能扩大“支持”声明。
