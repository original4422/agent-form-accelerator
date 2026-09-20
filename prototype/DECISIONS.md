# 原型验证约定

## 已确认的产品方向

- 目标优先级：stars/传播 > 持续使用 > 求职展示。
- 通用网页填表加速工具；秋招网申作为首个真实场景。
- 首发同时服务 Codex 和 Claude Code，允许安装浏览器扩展或本地连接组件。
- 2026-09-21 更新：当前阶段只用 Codex 测试，Claude 验证暂停；保留其接入代码。
- 资料来自已有 Agent 上下文/文档，第一版不建立专用个人资料库。
- 默认复用已有 Agent 的模型能力，不引入额外模型 API Key。
- 第一阶段先证明明显提速。暂定目标：至少三种不同实现的表单，正确率不降低，完整耗时中位数减半。

## 当前实验回答什么

1. 一套执行核心能否通过真实浏览器扩展和标准 MCP 工作？
2. 输入事件是否进入页面自身的数据状态？过期引用会不会误填？
3. 在预先给定正确映射时，执行层是否比合理的批量脚本更快？
4. 本机两个真实宿主是否能够发现工具、填写虚构资料并检查结果？

预先提供字段映射是执行层实验的边界，不代表完整产品已经能理解陌生表单。没有用人为的模型等待时间制造速度优势。原生日期和下拉不代表复杂日期选择器/自定义控件已经支持。

## 基线与成功标准

- `single-field-control`：每字段一次请求，同一执行器与校验策略。仅解释减少往返可能带来的收益，不用于产品提速宣传。
- `playwright-batch-script`：单个外部脚本内使用合理的 Playwright locator 调用，处理相同动态依赖；没有逐操作 LLM 请求。
- `extension-batch`：观察字段，构建批量计划，通过真实 Chrome 扩展执行，按需重新观察。
- 三者均在页面加载和连接完成后开始计时，计入观察/执行/等待及独立页面状态校验。启动与预先给定映射时间不计入。
- 每方式预热一次，五次重复，交替执行顺序；报告中位数与每次正确性。DOM 值和页面自身事件状态必须同时正确，提交次数为零。
- 宿主 smoke test 仅验证接入，不是原生浏览器速度比较。模型默认配置和一次运行波动不可用于两端排名。

## 仍需验证

- 用户实际招聘页的具体系统和控件结构，尚未提供。
- 两端原生浏览器的合理批量用法（尤其 Claude `browser_batch`）与我们工具的端到端对比。
- 自定义下拉、重复组、页面重渲染如何影响模型回合数、成功率与人工修正。
- 日常 Chrome 上由用户点击扩展获得 `activeTab` 的完整安装体验；自动化测试采用已获本地测试源权限的隔离浏览器，不能代替该体验。
- 跨宿主同时操作、断线恢复、异步校验、权限范围变化等生产要求。

## 结论使用边界

如果执行层比优化后的批量脚本更慢，应明确报告，不能改用逐字段对照包装提速。下一阶段优先测真实任务中模型往返/失败恢复的占比；只有证据支持时才扩大为完整产品。公开传播前需要可复现的端到端证据。

## 来源（2026-09-21 查阅）

- [Codex MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)
- [Claude Code MCP](https://code.claude.com/docs/en/mcp)
- [Claude Chrome](https://code.claude.com/docs/en/chrome)
- [Playwright 扩展测试](https://playwright.dev/docs/chrome-extensions)
- [Chrome scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting)
- [Chrome activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
- [Jev Ultrafast](https://github.com/browser-use/jev-ultrafast)
- [Jev Browser Use](https://github.com/wy-coliney/jev-browser-use)
- [JobApplyAutofill](https://github.com/aaa-wxl/JobApplyAutofill)
- [Proficiently apply Skill](https://github.com/proficientlyjobs/proficiently-claude-skills)
