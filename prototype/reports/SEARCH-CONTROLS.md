# 从输入文字到选中实体：异步搜索控件

2026-09-21，继续只测已登录 Codex。

## 为什么增加这个场景

对 [Cloudflare 的 Greenhouse 招聘页](https://job-boards.greenhouse.io/cloudflare/jobs/7377424) 做了隔离浏览器的只读结构观察，城市、学校、学历等字段出现 `input[role=combobox][aria-autocomplete=list]`，并采用带前缀的 `select__input` / `select__value-container` DOM。见 [结构记录](search-public-audit.json)。没有在真实页面输入、点击、上传或提交，也没有使用用户浏览器登录信息。结构相似不等于真实页面已经验证可填。

[React Select 的 Async 文档](https://react-select.com/async) 与[官方异步实现](https://github.com/JedWatson/react-select/blob/master/packages/react-select/src/useAsync.ts) 区分输入查询与返回选项；[组件 API 源码](https://github.com/JedWatson/react-select/blob/master/packages/react-select/src/Select.tsx) 提供 `classNamePrefix` 和单选显示组件。本地锁定 npm 的 **react-select 5.10.2**，使用其真实 AsyncSelect；没有仿写该库，也没有复制招聘页。官方 master 链接是研究参考，实测版本以 package-lock.json 为准。

独立样本保留同一份未映射中文 Markdown、10 个目标和两段教育经历，改变控件实现和部分字段顺序。城市与两所学校各需一次 450 ms 的本地模拟查询；应用保存城市/学校实体 ID，输入框查询文字不作为答案。国家/学历为原生 select。这是控件迁移实验；未模拟真实服务器、附件或完整招聘流程。

## 执行契约

新能力只加入实验 Playwright 后端。它使用 DOM 适配器识别带公开 classNamePrefix 结构的 React Select 单选，要求可见 control/value-container 关系；无前缀、自定义渲染、空多选和不认识的输入型 combobox 不自动放行。原扩展仍把输入型 combobox 标为不支持。

1. 来源文本作为搜索词，在本地等待 loading 指示结束。
2. 只打开/读取输入框 aria-controls 明确关联的 listbox。
3. 仅选择精确、唯一、未禁用的可见文字。没有匹配或存在重名就返回；不自动选择“最像”的项。
4. 选择前再次核对字段标签、分组和类型；页面变化或失效引用停止。
5. 只有搜索文字清空、弹层关闭、单选显示值吻合且明确校验状态通过，才报告目标完成。最终继续按共享计划层等待 120 ms 回读。

一个请求内部仍有多次浏览器动作、等待和观察。它减少的是不必要的宿主往返，没有取消必要的搜索/验证。若来源与选项不同义或不同语言，仍需模型根据返回的真实选项判断；已有 `choices` 只允许之前观察到的选项。

## 检查结果

[15 项新检查](search-checks.json) 全部通过，包括：

- 查询字符串与实体选择明确分开；450 ms 结果被实际等待，应用收到实体 ID。
- 已选目标不重复查询；缺失、禁用、重名、超时、搜索中字段改名都不选择错误实体。
- 100 ms 后应用撤销选择，不能被报告为成功。
- 无关弹层不被使用；替换 classNamePrefix 仍有效；多选与旧扩展的未支持状态保持明确。
- 同一资料绑定请求完成 10 个目标、两段经历、3 次搜索，独立 React 状态全部吻合、无提交。

[实际 MCP 接入](search-provider-checks.json) 同样通过。原 Radix 的 16 项框架检查，以及扩展/Playwright 两套实际 MCP 接入也已回归通过。

## Codex 完整任务

[三次完整记录](codex-search-1789949543902.json)：**29.05 / 28.81 / 29.79 秒**，中位 **29.05 秒**。三次均一次调用、首次成功，30/30 个目标通过独立校验，零提交。每次本地执行约 2.07–2.11 秒，包含三次异步查询和后续验证；输出 token 为 264 / 270 / 266。

解析、首次映射、CLI/MCP 启动、自动审批、执行、恢复和退出均计时；浏览器启动/页面加载在计时外。独立 oracle 核对真实 React 实体 ID、其他字段值、单选显示文字、查询已清空、弹层关闭、无待完成搜索及零提交。使用同一已登录 Codex CLI 的默认配置，JSONL 不提供可确认的精确模型版本。此组没有速度对照，不计算提速倍数；也不与上一轮不同控件任务的中位数作因果比较。

[计时源码清单](source-hashes-search-measured.json) 记录整个三次宿主执行期间冻结的代码和依赖。共同资料与字段语义沿用前一轮，以隔离控件实现变化；没有宣称这是三份全新网站或完整招聘流程。计时后仅为演示加入可选信号处理配置，默认测量行为不变，原 harness 已归档。

## 边界与下一步

目前是明确 DOM 模式的适配，不是通用输入型 combobox 解决方案。自定义渲染、虚拟滚动、多选、iframe、文件上传和跨页仍未覆盖；aria 与页面 DOM 也不是服务器接受证明。原型尚未在真实招聘流程上验证稳定两倍收益。

下一步应把已证明有效的任务接口带到更接近实际的完整流程，并补足陌生字段/选项、部分可填和必须人工决定的情况。不要为每种控件继续复制两个引擎，也不要因为本地样本一次成功就宣称招聘平台兼容。

复现：

```bash
node prototype/bench/search-check.mjs
AFA_SCENARIO=search node prototype/bench/backend-provider-check.mjs
AFA_SCENARIO=search AFA_LOCAL_LOOP_HINT=1 node prototype/bench/codex-framework.mjs
node prototype/scripts/demo-search.mjs
```

最后一条启动可手动检查的独立浏览器，并打印当前会话的临时 Codex 接入命令；不修改全局配置，不需要新的 API Key，退出后清理测试 profile。演示使用虚构资料，尚不是接管日常登录浏览器的安装流程。

演示初次 Ctrl+C 由 Playwright 默认信号处理提前退出，留下临时 profile/session；确认进程停止、目录属于该次演示后已清理。现由演示自己处理信号，复查退出码为 0，两个临时目录均为空。见 [演示检查](demo-search-check.json)。
