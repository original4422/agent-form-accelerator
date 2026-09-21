# 地点选择还存在服务器表单更新边界

> 后续实现：已接入该操作的被动状态观察，并在冻结后的真实页面识别出失败；本地受控成功/延迟/失败/新增字段检查见 [FORM-UPDATES.md](FORM-UPDATES.md)。以下保留本次调查当时的结论，地点控件仍未开放支持。

2026-09-21。本轮是实际控件与协议调查，没有新增生产适配器或 Codex 速度测量。结果改变了下一步：先区分目录查询、界面选择和服务器表单更新，不能仅根据输入框文字持久化就开放自动填写成功判定。

## 已观察的三个阶段

同一 [Ashby 公开申请页](https://jobs.ashbyhq.com/ashby/0020099f-9bb3-4da9-9808-4556564f5301/application)，仍是系统实现样本，不代表用户的秋招岗位。

| 阶段 | 直接证据 | 不能据此推断 |
|---|---|---|
| 输入查询 | 输入 London, United Kingdom 后发出 ApiAutocompleteGeoLocation 查询 | 输入文字不等于选中地点 |
| 选择候选 | 点击实际关联列表中的完整地点名后，菜单关闭，输入框保留该名称 | 本地选中不等于服务器已完成表单更新 |
| 更新表单 | 选中后尝试 ApiSetFormValue mutation；返回片段请求 FormRender，包括字段、必填、隐藏信息及错误 | 没拿到响应，不能断言它具体新增了哪些题目，也不能断言本次无变化 |

[W3C combobox 模式](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) 允许不同输入与选择行为，角色本身不足以确定该网站的提交语义。此页的具体结论来自实际 DOM 和请求观察。

## 1. 完全冻结下的失败并非目录空结果

`ashby-location-audit.mjs` 先用已有冻结 harness 加载页面，再在 TCP/HTTP/WebSocket 已冻结后输入通用地名。未选候选、上传或提交。

实际行为：输入后 aria-expanded=true，关联 listbox 显示 “No results”，同时 input.validity.valid=true；Escape/失焦后输入又变为空。对应请求是 ApiAutocompleteGeoLocation，只因隔离被拦截，不能把 UI 的空结果当成目录中没有城市。

记录请求的方法、路径、操作名、GraphQL 文档和参数类型，不保存认证头、cookie 或申请参数值。已观察到查询的 locationTypes 为 Country、Region、City，所以它并非只能选国家。原始分阶段证据保存在 `ashby-location-audit.json`。

这否定了两个拟议捷径：给 input 赋值并回读即可算完成；看到 No results 就在工具内不断换查询词。后者需要先排除网络失败，不能把失败伪装成可恢复的空目录。

## 2. 独立公开地名读取

为观察真实候选形态，`ashby-location-catalog.mjs` 从浏览器已经发出的查询中提取并固定只读操作，单独对公共 non-user-graphql 端点请求地名目录。请求只带通用地名和 Country/Region/City 枚举；不带浏览器会话、认证、申请人资料、申请编号或写入操作。

公开读取返回200和五项：英国 London 的完整限定名、United Kingdom，以及加拿大、基里巴斯、美国的同名候选。保留原始响应和 SHA-256，见 `ashby-location-catalog.json`。这同时说明必须保留来源中的国家限定，不能只根据 London 或第一项选择。生产执行器没有导入该响应或候选答案。

这次目录查询是独立网络读取；原申请页始终冻结，没有为查询而重新联网，更没有放行表单写入。

## 3. 在断网页面回放目录响应

`ashby-location-replay-audit.mjs` 创建新的冻结上下文，只对与已记录查询文档、参数完全相同的请求返回同一份200响应；其他请求仍走冻结保护。不是自造候选，也没有把 API 返回值注入 React 内部状态。测试通过真实可见列表的唯一完整标签点击。

真实组件显示五个 role=option，列表通过 input 的 aria-controls 关联。点击英国 London 后，菜单关闭，输入保留完整限定名；再次输入不同查询并取消，原选择恢复。

同时观察到 **ApiSetFormValue mutation**，其参数键包括组织页面名、formRenderIdentifier、path、value 和 formDefinitionIdentifier。请求失败为 net::ERR_FAILED，没有收到 mutation 响应；页面却仍保留选中地点。报告保存操作名、参数键与文档前缀，未保留写入参数值。该 mutation 未被放行、直接调用或伪造成功响应。

最终断言：缓存响应 hash 一致；唯一真实候选被选中；两次关闭菜单后文本保留；至少一个对应 mutation 被阻止；mutation 响应数为零；activeTransportSockets=0；提交次数为零。结果见 `ashby-location-replay-audit.json`，明确标注 serverUpdateConfirmed=false、fullApplicationVerified=false。

回放验证了真实组件的本地行为，并验证“写入失败而界面仍显示已选”的反例。它不验证实际在线更新、服务器校验或候选后的完整表单结构，也不适合用于全流程性能数字。

## 对架构的影响

此前的六目标实测只证明指定字段的 DOM/原生状态回读；本轮没有推翻这些局部证据，但更清楚地说明它们不能覆盖地点引出的后续工作。

下一步的地点执行契约至少要保留三种不同结果：目录读取完成/失败/未确认，目标选项已实际选中/尚未选中，以及表单更新已返回/失败/仍在等待。不能将后两者折叠成一个 input.value。

机械等待和已声明条件匹配可以在本地工具内完成，减少模型往返；如果服务器更新后出现新问题或新含义，则必须重新观察并交给宿主决定，不能继续使用旧计划。这是减少多余往返的边界，而不是把所有变化都强塞进一次调用。

实施顺序调整为：先对已观察的表单更新建立有界完成/失败信号和相应反例，再接入地点的候选选择；用本地可控服务覆盖成功、延迟、失败与动态字段变化。真实页面上的 mutation 仍不能用虚构申请资料放行。只有后续完整任务证据成立，才进行验证等价的速度对照。

这些是下一步设计要求，**当前生产 backend 尚未新增地点支持、网络状态门禁或完整业务校验**。当前仍不宣称实际申请完整完成或稳定提速两倍。文件入口、视觉必填及真实用户场景也尚未完成。

## 复现

```bash
node prototype/bench/ashby-location-audit.mjs
node prototype/bench/ashby-location-catalog.mjs
node prototype/bench/ashby-location-replay-audit.mjs
```

依赖现有 Chromium 和公开页面；不需要新增模型 API Key，三个脚本都不启动 Codex 模型任务。最后一项回放第二项的准确记录。没有改动生产运行时，因此本轮未重复无关功能回归。当前保护只覆盖页面 HTTP(S)/WebSocket，沿用既有冻结模式的边界，不是系统网络沙箱。
