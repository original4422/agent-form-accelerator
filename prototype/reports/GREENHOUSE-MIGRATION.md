# 条件计划迁移到真实 Greenhouse 页面

2026-09-21。当前轮次验证实际控件兼容和失败恢复，不做速度对照。

## 页面与验证范围

公开页面：<https://job-boards.greenhouse.io/cloudflare/jobs/7377424>。新建无登录 Chromium，仅 GET/HEAD 加载页面；阻止写方法、Service Worker、WebSocket。全部网络冻结且未完成读取清空后，才输入虚构资料。没有上传、提交或使用个人资料。

资料保留 14 项事实。页面上 10 项可以离线填写：名、姓、常用名、邮箱、电话国家、本地电话、英语能力、签证支持、个人网站、获知渠道。城市、学校、学历、专业依赖在线查询，本轮无法完成。隐私确认没有来源事实，简历没有提供，均保留未处理。

独立 oracle 直接检查公开 DOM 的实际输入、选中显示与国家标记；它不调用执行器的验证函数。真实页面没有提供可供这次 DOM 检查确认的教育实体 ID，也没有验证服务器接受。`complete=true` 只表示请求的 10 项完成，`visibleRequiredCovered=false` 仍须报告。

## 发现与修复

1. **初始化未结束。** SSR 输入框出现不代表延迟脚本已经加载。原来的 load 后立即冻结阻止了后续脚本；现在该测试明确等待 networkidle，仍处于只读加载阶段。默认其他测试的加载模式不变。尝试先打开空教育菜单加载目录没有改善，保留负结果，未保留无收益的预加载接口。
2. **空结果早于加载状态。** 学历菜单先显示 No options，约 300 ms 后才显示 Loading，且加载提示在关联 listbox 内，输入容器没有 spinner。现在同时读取关联弹层加载提示；暂时空结果需稳定 350 ms，明确 loading 则等到有界期限后返回 CONTROL_NOT_READY。这个稳定窗口是有限启发式，不能保证任意更长的隐藏 debounce。
3. **电话显示格式变化。** `2025550147` 被格式化为 `(202) 555-0147`。只对 tel 类型容许括号、空格、点、短横线差异，所有数字、前导零与前导加号仍须相同；证据同时返回原始 expected/actual 及等价理由。没有国家号码推断、补位或区号换算。
4. **国家选中显示缩短。** 菜单显示 United States +1，选中后只显示 +1。美国与加拿大不能因此视为相同。狭窄适配读取可见国旗的唯一 `iti__xx` 标记，并只映射到此前实际观察到的唯一可用选项；无标记或重名标记不推断。实际同区号国家切换能使最终验证失败。
5. **滚动中的点击失败。** 查询文本填写不等待稳定点击位置，真实页面连续跨区块填写时可能点击超时。现在先用标准 scrollIntoView 的 instant 行为定位输入，再执行 Playwright 的正常可操作性检查和点击，未使用 force 或绕过控件事件。

没有引入新模型、站点答案表、React 内部状态访问或任意脚本工具。国家显示适配位于实验 Playwright 后端；旧扩展仍不支持输入型 autocomplete，不能宣传两者能力完全一致。

## 可复现检查

```bash
node prototype/bench/delayed-search-check.mjs
node prototype/bench/country-phone-check.mjs
node prototype/bench/conditional-check.mjs
node prototype/bench/search-check.mjs
node prototype/bench/goal-check.mjs
node prototype/bench/greenhouse-check.mjs
node prototype/bench/codex-greenhouse.mjs
```

本地组件与旧功能共 47 项通过：延迟搜索 4、国家/电话 4、条件选择 11、搜索 15、目标执行/MCP 13。真实页面功能检查另外通过：第一次条件计划如实返回三项教育查询未就绪，普通事实未写入；第二次仅填写可用子集，10 项通过独立 DOM oracle，零提交，四项远程事实留空。

`greenhouse-check.mjs` 的第一阶段没有再查询已知离线不可用的城市；独立 oracle 仍强制城市为空。Codex 测试使用完整 14 项资料，没有给模型预先映射表或告诉它只填 10 项。

## 证据与限制

实际 Codex 批次 `1789958532594`：一次运行，55.77 秒、两次 `form_apply_bindings`，无重复查询恢复。第一次 7 个条件搜索中 4 个未就绪，未填写普通事实；第二次使用返回的 3 个 optionRef 和来源引用完成 10 项。独立 oracle 全部通过，零提交；最终文字逐项报告城市、学校、学历、专业未解决，隐私未确认、简历未上传，并明确申请未完成。原始宿主日志保存在忽略提交的 private 目录，公开摘要及实际工具证据在 `codex-greenhouse-1789958532594.json`。

第一次工具 handler 用时约 6.45 秒，第二次约 0.51 秒；总耗时还包括 Codex 启动、模型规划、工具审查/调度和最终回复，不能将这些差额都归为模型推理。115 个源码/依赖文件测前后指纹一致。这是一次功能迁移，不是和旧样本/工具的速度比较。

城市查询失败后，当前可见必填覆盖中不再出现城市；DOM 检查仍看到空输入，Codex 从先前资料与失败证据正确保留了该未完成项。这个现象再次说明当前快照 coverage 不能代表整个任务完整性，需要任务级未完成事项记录。

- `greenhouse-offline-discovery.json` 与 `greenhouse-offline-discovery-settled.json`：初始化等待前后。
- `greenhouse-offline-preload.json`：空菜单预加载负结果。
- `greenhouse-linked-menu-timing.json`：关联菜单空提示到加载提示；早期 `greenhouse-menu-timing.json` 未正确打开该菜单，含无关隐藏电话选项，不能作为这个结论的依据。
- `delayed-search-initial-failure.json`、`greenhouse-format-initial-failure.json`、`greenhouse-scroll-initial-failure.json`：修复前失败。
- `delayed-search-checks.json`、`country-phone-checks.json`、`greenhouse-check.json`：修复后正确性。
- `source-hashes-greenhouse-smoke.json`：宿主迁移测试前源码指纹。

旧的 47.32→30.53 秒结果属于提交 `7f356b4` 的独立组件对照，本轮改变了执行器，不能把旧耗时当作新代码实测。本轮离线边界主动排除了服务端搜索，未证明完整申请或真实端到端速度。

## 下一步判断

继续优先减少宿主往返，但不要将其等同于把更多点击塞进一段脚本。当前 all-or-return 条件计划在任意一个查询失败时，把其余独立字段也交回宿主；这次第二次调用只是在已得到的证据上删去不可用目标，属于可能本地化的决定。后续应先定义独立目标的失败边界和跨快照未完成记录，再验证能否在同一请求完成可用子集，并返回明确的 partial 状态。来源改变、字段改义、页面变化仍需停止；不能把这些错误当作可忽略的单字段失败。
