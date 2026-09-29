# 统一试用入口（2026-09-30）

`npm run try` 在交互终端选择招聘、火车报销或私家车报销；`npm run try -- recruitment|rail|car` 直接打开指定示例。复用现有 browser companion、招聘 fixtures 和 SurveyJS 服务器，不修改填写运行时。

入口检查 Node.js 20+、项目 npm 依赖、Chromium 可执行文件，以及只读 `codex login status`。缺依赖提示 `npm ci`，缺浏览器提示 `npx playwright install chromium`，Codex 未登录提示检查状态和运行 `codex login`。没有自动安装、修改配置、登录或模型调用。`--preview` 不要求 Codex，只打开本地页面并给出虚构资料路径，不打印模型连接或任务。

每次试用创建独立临时目录，包含 profile、鉴权连接文件与报销来源资料；正常关闭后整体删除。退出码为 0（正常关闭）、1（运行失败）、2（参数错误）、3（准备未完成）。TTY 无参数显示选择菜单，非交互无参数返回用法及退出码 2。

`npm run check:try` 不调用模型，实际启动三个 Chromium 示例，读取公开字段并确认页面可访问。招聘通过 SIGINT 退出，rail 通过 npm 进程组 SIGINT 检查转发和重复信号，car 关闭该次独立浏览器进程以触发连接关闭。每项均检查 CLI 退出 0、服务端口关闭、鉴权端口关闭和临时目录删除。缺 Chromium、Codex、未登录、未知参数及帮助入口也验证退出码；测试只在自己的临时 PATH 放置未登录 stub，不修改真实 Codex 登录。

第一次预检实现使用包根入口解析，错误地将已安装、但只导出子路径的 MCP SDK 判为缺失。现改为检查 npm 安装的包清单位置；随后使用真实依赖启动全部入口通过。没有降低运行阶段的模块加载检查。

README 调整为先试用、能力与证据、架构、开发导航；完整旧报告链接保存在 [索引](INDEX.md)，进阶命令移至根目录 [USAGE.md](../../USAGE.md)。旧 demo 命令保留；既有测量报告未修改。

## 干净 checkout 验证

从本地提交 `afca9c5` 克隆到新的临时 checkout（未复制 node_modules 或构建产物）。安装前运行入口，准确返回缺 npm 依赖及退出码 3；`npm ci` 安装 210 个包成功，Chromium 安装命令成功。随后 `AFA_TRY_HEADED=1 npm run check:try` 的三个真实可见浏览器入口及全部生命周期检查通过。

另外以真实 Codex 登录运行文档中的 `npm run try -- rail`：只读登录检查通过，打印的 MCP 脚本路径指向该新 checkout，任务和连接命令完整；没有进入 Codex 或发起模型调用。PTY 中真实 Ctrl+C 正常退出 0、临时目录删除。TTY 无示例参数的菜单选择招聘也成功，Ctrl+C 清理通过。

README、USAGE、报告索引及本报告共 59 个本地 Markdown 链接逐项解析存在。试用完成后临时 checkout 的 Git 工作区干净。这里的验证只覆盖启动、公开字段可达和退出；填写正确性继续使用已有 expense / online / companion 检查及其独立测量报告。
