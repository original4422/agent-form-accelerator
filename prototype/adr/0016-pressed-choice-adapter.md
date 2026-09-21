# ADR-0016：按钮答案需要控件契约，不凭 aria-pressed 泛化

状态：接受为实验 Playwright companion 的 Ashby 适配，2026-09-21。

真实申请页两道 Yes/No 不是原生 radio，默认 button 类型虽为 submit，但未关联 form。aria-pressed 只说明开关状态，不能独自授权任意按钮点击。匹配已观察的公共组件结构、问题标签、两选项和关联辅助 checkbox 后，才提升为 pressed-choice；普通按钮、未知结构和可能原生提交的按钮保持未支持。

宿主引用来源并选择一个可见选项，choices=true 表示选中此选项，No 也如此。每题只能选一个，身份变化停止；一次点击后核对目标和同题另一按钮的状态，等待120ms再确认。源条件搜索、局部协调与最终回读不能刷新掉旧的适配器契约。无任意脚本、React 内部状态、招聘方提交 API 或答案字典。

冻结网络的实际 Ashby 页面，确定性检查六目标通过；两份相反资格事实的真实 Codex 各一次 apply 完成六目标，完整文字及选择均正确。81项相关检查通过。地点和文件仍未支持，无速度对照，不代表完整申请完成。详见 [ASHBY-PRESSED-CHOICES.md](../reports/ASHBY-PRESSED-CHOICES.md)。
