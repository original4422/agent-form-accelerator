# SurveyJS 差旅报销草稿验证（2026-09-30）

## 工作流与选型

在原招聘草稿之外，新增一页差旅报销业务：来源资料 → 交通方式 → 对应费用字段 → 服务器计算总额 → 保存草稿 → 刷新恢复。火车分支提交票价；私家车分支提交里程、车牌、停车费。费率是每公里 GBP 0.50，金额按分取整；交通方式改变后删除原分支的数据。

这是本仓库自建应用，使用未修改的 **SurveyJS Form Library 3.1.2** 及自己的 localhost 后端。它不是对某个商业报销系统的兼容声明。页面由另一套真实组件库渲染，条件逻辑由 SurveyJS `visibleIf` 执行，数据更新来自 `onValueChanged`；没有复用招聘页的 React/Radix/React Select 业务代码。应用只生成草稿，服务器数据保存在当前进程内。

考察了三个实现范围：完整 Formbricks 自托管部署、SurveyJS 核心库、自写多步骤 HTML 应用。选择 SurveyJS 是为了直接验证公开库的原生 DOM 契约，同时保持 `npm ci` 后一条命令启动。Formbricks 需要完整自托管服务；自写多步骤页还会引入当前不存在的导航工具。

一手来源：

- [SurveyJS React 接入文档](https://surveyjs.io/form-library/documentation/get-started-react)
- [SurveyJS 数据存储文档](https://surveyjs.io/form-library/documentation/how-to-store-survey-results)
- [SurveyJS 源码与 MIT 许可](https://github.com/surveyjs/survey-library)
- [Formbricks 自托管说明](https://github.com/formbricks/formbricks/blob/main/docker/README.md)

## 实际发现的执行缺口

初次两分支均失败，记录在 [expense-initial-failure.json](expense-initial-failure.json)。SurveyJS 的原生 radio 输入被自己的装饰 SVG 覆盖，Playwright `setChecked` 的指针动作超时。执行器现在优先点击唯一关联的原生 label，并回读 checked 状态；label 含链接、按钮或其他输入时不走此路径。禁用控件、点击被取消、多个关联 label、label 中的提交按钮都各有反例检查。不使用强制点击。

SurveyJS 将 `aria-required=true` 放在 `role=radiogroup` 上。观察器现在把这个显式要求传播到同组的原生 radio，且把必填状态放入字段签名；运行中的要求变化会使旧计划失效。

页面文本编辑后显示“未保存”，失焦后保存。恢复原已保存值时也会清除未保存提示；负数金额被 SurveyJS 控件拒绝，不覆盖服务器旧值。原生标签激活与必填传播属于执行器改动；草稿服务、费率与状态显示属于演示应用。

## 正确性与 Codex 集成

批次 [1790711073470](codex-expense-1790711073470.json) 两次真实 Codex 任务均通过独立业务验收：

| 来源分支 | 完整 Codex 秒数 | 工具调用 | 服务器保存 | 服务器金额 | 刷新逐值恢复 |
|---|---:|---:|---|---|---|
| Rail | 41.69 | 2 | 6 个来源值一致 | GBP 42.75 | 全部一致 |
| Personal car | 43.45 | 2 | 8 个来源值一致 | GBP 50.45 | 全部一致 |

两次均无在途保存、无提交，页面显示 `Draft saved.` 及正确总额；36 个运行文件和依赖锁的测前/测后指纹一致。服务器 oracle 在 runner 内部核对，不提供给模型。刷新后通过公开 DOM 再次读取所有字段，未读取 SurveyJS 的内部模型来证明恢复。原始轨迹保存在 Git 忽略的 `private/`。这是两个业务分支的接入正确性验证，没有速度基线。

**服务器结果与来源覆盖台账分开记录。** [原回执覆盖证据](expense-source-coverage.json) 单独保留。 首次选中交通方式后出现新题目，执行器返回 `FORM_CHANGED_AFTER_WAIT`，并清空旧计划的已验证来源。Rail 第二轮绑定包含 `f4: s4` 和 `choices.f4=true`，重新验证交通方式；最终 `complete=true`、可见必填来源覆盖为 5/5、`visibleRequiredCovered=true`、`unresolvedRequired=[]`。Personal car 第二轮未重绑交通方式，最终 `complete=true` 仅指本次目标完成，可见必填来源覆盖为 6/7，`Travel mode` 仍为 `not-bound-to-source`；模型最终答复明确报告了这一项。两者的选中值和服务器数据均正确，来源覆盖只涉及可见、启用的必填字段。确定性流程显式重新绑定当前已选交通方式后，coverage 全绿；这不需要再次点击或新增工具能力。未修改自动清空台账的原契约，也未重跑模型去替换这两个结果。

2026-09-30 文档更正：依据上述公开回执及匹配 `rawSHA256` 的原始轨迹核对两分支调用参数，纠正此前将两者都描述为未重绑的错误。历史 JSON、测量时间及运行结果未修改。

本地检查包括 8 项原生选择反例、两个完整分支、每个字段刷新恢复、分支切换后旧票价删除、无效金额不覆盖保存值。旧 guard 16 项、context 12 项、checkbox 21 项及真实 MCP 检查、在线保存 11 项均通过。CLI 演示实际启动并用 Ctrl+C 关闭；npm 转发与终端重复信号最初导致清理提前终止，改为清理完成前保留信号处理器，随后配置文件删除、正常退出。

另保留 [expense-total-expectation-failure.json](expense-total-expectation-failure.json)：第一版测试误把 86.5 × 0.50 + 7.20 的预期写成 50.50，实际服务器计算 50.45 正确。仅修正预期常量，未调整服务器来迎合错误数字。

## 复现

```bash
npm ci
PLAYWRIGHT_SKIP_BROWSER_GC=1 npx playwright install chromium
npm run check:expense
npm run expense:demo -- rail
# 或 npm run expense:demo -- car
```

终端会打印当前 Codex 的临时连接命令。浏览器与草稿均为本地测试环境，关闭演示即清理临时浏览器连接；草稿不跨服务器重启保留。

```bash
npm run bench:expense
```

最后一条使用已登录 Codex 运行两次任务，写入编号报告与 `codex-expense.json`。GitHub 工作流运行确定性 expense 和 online 检查，不需要模型凭证。
