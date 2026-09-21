# 第三种真实招聘系统：先纠正问题观察

2026-09-21。本轮没有新增 Codex 模型计时。真实页面只读审计发现漏题及分组丢失，修复后复查；真实整份申请的两倍提速仍未证明。

## 为什么检查这里

减少模型往返的前提是一次观察能表达任务。即使执行器把一批已知字段填得很快，漏掉的问题、跨字段约束和未支持控件仍会造成后续恢复，甚至让任务被误报完成。继 Lever、Greenhouse 和两个中文登录入口之后，本轮检查 Ashby 的公开申请页，验证观察层能否迁移。这个英国资深工程岗位仅是第三种系统实现样本，不代表用户的秋招任务。

页面：[Ashby 具体申请页](https://jobs.ashbyhq.com/ashby/0020099f-9bb3-4da9-9808-4556564f5301/application)。另检查 [Software Mind 招聘入口](https://careers.smartrecruiters.com/SoftwareMind/?oga=true)，跳到 SmartRecruiters oneclick 页面后遇到反自动化页面，没有进一步绕过，不能据此判断其表单兼容性。

## 只读方法与失败

`bench/third-ats-audit.mjs` 使用全新 Chromium 上下文，禁止 service worker、WebSocket 和一般 POST，仅允许 GET/HEAD。Ashby 最初缺少表单，是因为读取职位/组织配置也使用 POST。检查实际请求后，可选 `AFA_ATS_READ_QUERIES=1` 只放行 jobs.ashbyhq.com `/api/non-user-graphql` 上两个已观察查询：`ApiJobPosting`、`ApiOrganizationFromHostedJobsPageName`，同时核对 query 文档开头的操作名称。脚本记录操作名、参数键、查询前缀与 hash，不记录参数值、cookies 或认证头。这是受限审计工具，不是任意 GraphQL 安全分类器。

随后一次等待失败来自测试脚本要求 `form input`，实际页面使用 div 容器；改为等待可见 input/textarea。两种失败均保留，未当成网站无表单或已修复的生产故障。页面没有任何资料输入、选项点击、上传、登录或提交。细节截图留在忽略的 private 目录。

## 真实缺口与修复

| 观察项 | 修复前 | 修复后 |
|---|---:|---:|
| 可见字段/选项节点 | 37 | 41 |
| 标为支持的节点 | 34 | 34 |
| 原生/ARIA 必填标记节点 | 3 | 3 |
| 四组原生问卷的问题名 | 全部为空 | 四组均恢复 |
| 两道 Yes/No 问题 | 四个按钮全部遗漏 | 四个按钮明确报告为未支持 |

四组问卷共 26 个原生选项；四个同文的“不愿回答”因此恢复各自问题上下文。页面 fieldset 使用直接子 label 而非 legend：优先保留 ARIA 名称和直接子 legend，只在恰好一个可见、未关联控件的直接子 label 时回退。无法确认时给不同容器不同的匿名组标识，不能拿选项标签猜问题名。

`button[aria-pressed]` 现在进入观察结果与字段变更保护，值保留原始 aria-pressed 字符串，类型为 `unsupported-toggle`。狭窄祖先只含此类可见按钮时才提取直接问题 label；没有假定这些按钮一定互斥，也没有添加点击执行。提交按钮仍不进入填写接口；带 aria-pressed 的“Add”按钮不能误进新增行通道。

真实页面复查得到四个独立问卷组及两个 Yes/No 问题名。仍有七个未支持节点：四个切换按钮、两个文件输入、一个地点自定义组合框。文件输入分别包含简历自动填充和附件入口，不能当成两个必填附件。页面上的 Resume 没有必填标记；[Ashby 官方更新](https://www.ashbyhq.com/product-updates/make-resume-optional-for-applicants) 也说明简历可由招聘方配置为可选，不应全站硬编码必填。该历史文档不能替代具体页面配置。

## 完成语义仍不充分

截图目视显示地点、两道 Yes/No 也带必填星号，但没有相应 native required/aria-required，现有观察只统计到三个必填节点。现在 limitations 明确说明可能漏掉纯视觉必填标记，并验证它经过真实 MCP 回执传给宿主。没有用混淆 CSS 类名推断全部站点的必填规则。

页面另有 “Answer 1 of 3 Questions” 及只需回答其中一题的说明。这是区块级约束，三个 textarea 各自的 required 布尔值不能表达。当前观察尚未建模这项规则；因此 `visibleRequiredCovered` 不能证明整份申请完成，`complete` 也只代表提交给执行器的绑定计划完成。下一步应将公开页面的问题说明、区块约束和未支持控件保留给宿主理解，再逐项验证执行能力；不能以减少一次调用为由丢弃这些内容。

[Ashby 官方自定义招聘页文档](https://developers.ashbyhq.com/docs/creating-a-custom-careers-page) 描述了表单字段类型及 isRequired，但本原型没有接入招聘方认证接口，也没有调用申请提交或上传 API。公开 DOM 信息与网站内部表单模型的差距仍需处理。

## 验证与复现

`node prototype/bench/question-observation-check.mjs`：8/8 通过，覆盖同名选项分组、ARIA/legend 优先级、匿名组隔离、未支持按钮禁止写入、新控件使旧计划失效、问题变化拒绝旧选择，以及实际 stdio MCP 选择三个明确提供的虚构偏好。最后一项在 localhost 上执行，核对三个原生控件状态、四个未支持按钮和必填范围限制，按钮点击数为零；不涉及推断真人敏感属性。

初次 about:blank 测试没有 secure-context crypto.randomUUID，是测试环境问题；改用拦截的 localhost 后复现六项失败一项通过。失败报告分别保留，最终测试增加 MCP 集成成为八项。回归 `guard-playwright-document-check` 8/8、`guard-check` 16/16、`companion-check` 11/11，共 43 项检查通过。MCP 协议检查不是 Codex 模型任务，更不是新速度结果。

审计复现需要当前公开页面仍有效；示例只读取页面：

```bash
AFA_ATS_TARGETS='[["ashby-application","https://jobs.ashbyhq.com/ashby/0020099f-9bb3-4da9-9808-4556564f5301/application"]]' AFA_ATS_READ_QUERIES=1 AFA_ATS_REPORT=prototype/reports/ashby-application-recheck.json node prototype/bench/third-ats-audit.mjs
```

原始报告：`third-ats-audit.json`、`ashby-application-get-only.json`、`ashby-application-readiness-failure.json`、`ashby-application-read-queries.json`、`ashby-application-details.json`、`ashby-application-after-observation-fix.json`；测试失败与最终结果以 `question-observation-*.json` 保留。没有实际申请完成、服务器接受或新的全流程速度证据。
