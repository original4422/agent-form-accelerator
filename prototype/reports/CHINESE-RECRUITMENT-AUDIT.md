# 中文秋招入口：先验证流程阶段，再测填写速度

日期：2026-09-21；全部使用新的未登录 Chromium 上下文，没有导入个人浏览器资料，没有输入手机号、邮箱、验证码或简历，没有申请、上传或提交。

## 本轮改变下一步的证据

绿盟科技与 MiniMax 的具体校招申请入口都先显示登录，而不是可直接填写的简历。这意味着此前英文匿名申请页和本地样本的速度，不能直接代表用户秋招体验。下一次真实中文表单测试需要用户选择的网站及登录后的可见表单；登录不应算成填写算法的失败，也不能在不知表单结构时先宣称平台兼容。

- [绿盟科技校招首页](https://app.mokahr.com/campus_apply/nsfocus/29118) 的页面标题为 2027 校招。沿页面公开的研发类目录，找到实际岗位链接，再读取[岗位详情](https://app.mokahr.com/campus_apply/nsfocus/29118#/job/16f71a5c-c465-43f7-897c-8812501aef8c)。其 `/apply` 入口显示邮箱/手机号登录、验证码和获取验证码按钮；没有登录，没有获取验证码。
- [MiniMax 官网招聘页](https://minimax.cn/careers) 指向飞书校招入口。沿公开列表读取[校招岗位详情](https://vrfi1sk8a0.jobs.feishu.cn/379481/position/7681599148466571566/detail)，断网后点击已观察的“投递”按钮，只获得客户端申请路由。随后用全新上下文只读打开该路由，确认跳转到 `.../379481/login?redirect_path=...`，只显示手机号、验证码、协议勾选和登录按钮。
- 搜索最初找到的[微保 Moka 入口](https://app-tc.mokahr.com/campus_apply/wesure/6017) 仍出现 2022 届说明，未将它作为当前秋招样本。

[Moka 官方开发文档](https://www.mokahr.com/docs/api/) 描述了可嵌入的申请页 URL，标题标注无需登录；[Moka 候选人帮助](https://mokahr.moyincloud.com/xzzl/xzhxrtdQ_A.html) 又说明了验证码/微信登录流程。文档中的通用入口描述不能替代具体租户的现场状态。本轮没有试图绕过登录或借助招聘方 API 权限。

## 审计限制本身造成的误判

最初只允许 GET/HEAD，发现两家页面均把部分公开职位/配置读取实现为 POST。被拦截后，列表可能为空；Moka 的岗位详情读取失败还会显示“职位已停止招聘”。这不能证明岗位真的关闭。

逐次检查页面自己发出的路径及 JSON 参数键，仅放行同域明确的职位/配置查询：飞书职位搜索，Moka 职位列表/详情、类别/部门、区号、隐私条款与站点开关。没有放开通用 POST；所有其他写入、WebSocket 和 Service Worker 继续阻止。记录包含路径、方法、参数键，不保留 Cookie、令牌、请求参数值或完整职位正文。

`chinese-public-audit.mjs` 保存初次受限结果及修正后的只读证据。早期审计等待整个 load，飞书出现 30 秒超时，后续采用 DOMContentLoaded 加明确业务读取观察；不能把前一次超时当作网站不可访问。这里没有把页面加载时间当成模型/填写速度。

## 失败与验证边界

在已经加载的 MiniMax 岗位详情页冻结全部网络，再点击“投递”，客户端进入 resume/apply 路由，之后 renderer 崩溃，错误为 `page.evaluate: Target crashed`。失败保留；它不是正常填写成功，也没有证据证明由某个 DOM 观察函数单独引起。后续采用新的上下文，只读直接打开已观察的申请路由，得到登录跳转。

随后分别让两个登录页正常就绪，再冻结网络并执行现有 `executeFormRequest(inspect)`，两次均完成，没有重现崩溃。Moka 观察到两个搜索框、邮箱与验证码；MiniMax 观察到手机号、验证码、未知区号 combobox 和无名称协议复选框。结果支持将“断网前必须先进入并加载目标表单”作为下一次真实验证的准备条件；不据此断言崩溃的唯一根因已经查明。

登录页原生结构审计显示 Moka 的普通输入没有显式可见 label，主要使用 placeholder；飞书国家区号使用未知的 div combobox。这些是登录控件的观察，不是简历表单兼容性证据，不据此给填写执行器添加站点猜测规则。

## 记录与复现

- `chinese-public-initial-audit.json`：旧年份入口与最初页面 load 超时。
- `chinese-public-post-limited.json`：GET/HEAD 限制下两家站点的实际 POST 参数键。
- `chinese-public-audit.json`、`chinese-public-list-details.json`、`chinese-public-job-details.json`：公开目录、实际岗位链接与受限读取。
- `chinese-public-application-entry.json`：Moka 详情读取受限，以及 MiniMax 断网进入申请路由后的崩溃。
- `chinese-public-moka-detail.json`：放行已核对的岗位详情读取。
- `chinese-public-apply-raw.json`：直接打开两个具体申请入口，确认登录界面。
- `chinese-public-auth-observer.json`：待登录页就绪后冻结网络，再单独检查现有观察器。

默认运行：`node prototype/bench/chinese-public-audit.mjs`。`AFA_AUDIT_TARGETS` 可指定已观察的 `[site,url,optionalOfflineEntryButton]` 数组，`AFA_AUDIT_REPORT` 指定报告路径。可用 `AFA_AUDIT_INSPECT=0` 单独检查原生 DOM，用 `AFA_AUDIT_FREEZE_BEFORE_INSPECT=1` 在读取完成后先冻结网络。可选按钮只在完全断网后点击；它不是申请提交器。

## 下一步

保持完整目标，不用登录页或职位筛选器代替实际简历填写测试。优先取得用户具体招聘页的登录后结构；独立 browser companion 已支持用户先手动登录、再连接 Codex，需继续在填写虚构资料前冻结网络。已异步询问用户实际遇到慢的公司/公开链接，尚未以该回答为前提操作个人账号。

下一项可自主完成的接入工作是 companion 的明确离线验证模式：用户先完成登录并进入目标表单，入口在发出 Codex 连接命令前冻结全部网络并核对未完成请求。现有匿名 harness 在加载后就冻结，不能直接用来验证需要登录和懒加载步骤的页面；当前 companion 没有这个操作入口，不能把计划当作已经实现。

在等待更贴近用户的页面线索时，可独立补原始简历输入环节：当前仅有限 Markdown，实际 PDF/DOCX 到来源引用的准备成本还没有计入此前速度。这是完整工作流缺口，优先级高于继续在同一目录样本上压缩几秒。

本轮没有 Codex 速度测量，没有新的平台填写兼容结论；完整目标保持 active。

全部本轮浏览器审计进程已结束，无待轮询句柄。没有更改生产填写运行时、全局配置、已安装 Skill 或用户账号状态。
