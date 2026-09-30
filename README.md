# Agent Form Accelerator

让 Codex 理解资料和字段，让本地执行器批量填写、等待页面更新、回读校验。使用已有 Codex 登录；执行器不另行调用模型 API。

## 三步试用

需要 Node.js 20+。在终端中运行：

```bash
git clone https://github.com/original4422/agent-form-accelerator.git
cd agent-form-accelerator
npm ci
npx playwright install chromium
npm run try
```

1. 选择招聘、火车报销或私家车报销示例；浏览器自动打开虚构资料对应的本地页面。
2. 保持终端运行，在另一个终端复制它打印的 Codex 连接命令。
3. 进入 Codex 后复制终端给出的任务，检查填写后的字段和草稿状态。

入口会检查依赖、Chromium 与 `codex login status`，准备不全时打印修复命令。它不会自动安装、登录或发起模型任务。关闭示例浏览器或按 Ctrl+C 后，本次服务、连接、草稿和临时浏览器资料会清理。

也可直接选择：

| 命令 | 内容 | 检查结果 |
|---|---|---|
| `npm run try -- recruitment` | 条件搜索、同校不同校区、两段教育经历 | 10 个已知目标；未提供的到岗日期留空并报告 |
| `npm run try -- rail` | SurveyJS 火车报销动态分支 | `Draft saved.`，GBP 42.75 |
| `npm run try -- car` | SurveyJS 私家车报销动态分支 | `Draft saved.`，GBP 50.45 |

尚未安装或登录 Codex，也能只预览页面：

```bash
npm run try -- rail --preview
```

预览模式只启动本地示例并打印虚构资料路径；不检查 Codex，也不提供模型连接或任务。非交互终端需明确写出示例名称。`--headless` 用于自动启动检查。

## 当前能力与证据

当前是工程原型，实际宿主验证集中在 Codex。支持 Markdown 来源引用、原生文本/日期/数字/单复选、已验证的 Radix 与 React Select 控件、重复教育经历、动态问题和公开保存状态。缺失事实、歧义或语义变化会返回给宿主处理。

| 工作流 | 已验证结果 | 报告 |
|---|---|---|
| SurveyJS 两种报销分支 | 8/8 任务通过服务器值、金额、刷新恢复与零提交验收；4/4 绑定来源覆盖完整 | [完整对照](prototype/reports/SURVEYJS-SPEED-COMPARISON.md) |
| 在线招聘草稿三种控件 | 两轮 12/12 正确；六次绑定均两次调用，服务器独立核验 13 值及教育记录 | [公开保存状态](prototype/reports/PUBLIC-FORM-STATUS.md) |
| 真实 Greenhouse 页面 | 断网后虚构资料局部填写；远程查询、附件等保留未完成 | [验证范围](prototype/reports/GREENHOUSE-MIGRATION.md) |
| 同会话补充资料 | Codex 两 turn：先填已知项、补原文件、reload 后填日期；MCP/浏览器不重启 | [连续填写验证](prototype/reports/CONTINUOUS-SOURCE.md) |

SurveyJS 本批完整耗时中位数为官方 Playwright **116.28 秒**、绑定 **41.44 秒**；四次官方任务都发生局部超时并恢复，报告逐次保留这些成本。在线招聘原生控件的另一批中位数为 **83.96→47.31 秒**。数据分别属于不同协议，不能合并成一个通用提速倍数。

默认工具没有附件动作；单独登记的 PDF 可在 localhost 原生单文件控件上选择并核对字节。产品工具没有提交和跨页导航操作；iframe、shadow DOM 及未知组件尚未实现。公开保存提示和 DOM 回读分别记录，服务器接受由有权限的独立验收确认。报销应用是本仓库基于真实 SurveyJS 库创建的 localhost 示例。

## 单独登记附件

```bash
npm run attachment:demo
```

打开虚构 localhost 表单，并单独登记仓库中的 `image-facts.pdf` 到 `Application / Resume/CV`。复制终端的临时 Codex 连接命令后，`form_context` 返回 opaque 附件 ID 和唯一授权控件；`form_attach_file` 只接受该 ID 与 ref。自动解析简历和 Cover letter 是另两个入口，不能使用这份登记。

工具设置已核对 SHA-256 的文件 Buffer，并回读 `input.files` 的实际字节、原生校验和公开页面状态。`verified` 表示该观察时点的本地文件身份与有效性；文件被清空、替换、标为 invalid 或 pending 时返回 `needs-review`。历史回执保留附件 hash、大小、控件和时间，导出不重新读取页面；新的 context 会再次核对文件。PDF 的 `partial-text` 来源覆盖与附件字节状态分别记录。

`npm run check:attachment` 运行纯文件及真实 stdio/Chromium 正确性检查，不调用模型。[验收记录](prototype/reports/LOCAL-ATTACHMENT.md)使用 localhost 虚构文件，不加入已有速度实验。`npm run bench:attachment -- --preflight` 还可经过真实 Codex app-server 检查六工具目录和连接清理，不调用模型。自定义 localhost 页面入口见 [附件使用](USAGE.md#显式-localhost-附件)。

## 架构

```mermaid
flowchart LR
  A[指定资料与可见页面] --> B[Codex 理解与绑定来源]
  B --> C[临时 MCP 连接]
  C --> D[本地浏览器执行器]
  D --> E[填写 / 等待 / 回读]
  E --> B
```

共享观察器记录字段、问题说明和公开状态；执行器把支持的动作放在本地完成，把新问题与不确定事项交回 Codex。演示使用独立临时 Chromium，不读取日常浏览器登录资料，也不修改全局 Codex 配置。

```text
prototype/scripts/     试用入口与构建命令
prototype/src/         本地连接、来源绑定与 MCP
prototype/extension/   Chrome 扩展与共享表单运行时
prototype/fixtures/    本地表单、组件与虚构资料
prototype/bench/       正确性检查与有界实验
prototype/reports/     逐次证据、失败记录与测量源码
```

## 开发与进阶使用

不调用模型的检查：

```bash
npm run check:try       # 三种示例启动、退出与清理；准备失败退出码
npm run check:expense   # 控件反例、两条绑定/官方流程与刷新恢复
npm run check:online    # 在线保存、状态关联与三种招聘控件
npm run check:continuous # app-server 启动失败、取消、敏感响应日志与单次审批边界
```

`check:try` 在 macOS/Linux 上验证生命周期。入口退出码：0 正常结束，1 运行失败，2 参数错误，3 准备未完成。通过 npm 按 Ctrl+C 时，npm 包装进程在部分平台以 SIGINT（shell 中为 130）结束；这属于用户中断，入口仍完成清理。

- 补充原资料后可在同一 Codex/浏览器连接调用 `form_reload_source`，再按新版条目继续填写；重载保留网页值，旧计划与旧来源引用失效。
- 连续会话复现：`npm run bench:continuous -- --preflight` 使用真实 app-server/MCP/浏览器但不调用模型；`--model` 运行一组真实两 turn。已测 Codex 0.155.1 依据 reload 回包继续填写，没有观察到工具目录通知后的自动重取。
- 本地历史回执：启动入口会打印导出命令，直接读取字段、来源原文、未解决项与页面保存文字；默认只打印，可显式保存 Markdown/JSON。回执标明观察时间，不刷新或打断正在执行的填写计划。
- [指定自己的页面与资料、PDF 实验、扩展及完整检查命令](USAGE.md)：PDF 默认严格提取；含照片的文字 PDF 可显式启用部分文字来源，回执保留未读图像位置。
- [完整实验与工程报告索引](prototype/reports/INDEX.md)
- [后续接续状态](prototype/CONTINUATION.md)
- [产品与验证决策](prototype/DECISIONS.md)

代码采用 [MIT](LICENSE)；依赖及实验素材归属见 [THIRD_PARTY.md](THIRD_PARTY.md)。
