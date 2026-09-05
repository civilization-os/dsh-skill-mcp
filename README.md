# DeepSeek Harness Plugins

独立维护的 Harness 插件仓库。当前提供 Skill / MCP 扩展管理工具：模型侧 `extensions_*` 工具 + 宿主 `/extensions` RPC 通道，并在 Harness Web GUI 的 Settings 注册「Skill 管理」与「MCP 管理」两个配置分区；扩展记录通过 Harness 已有 provider 加载。

## 开发环境

需要 Node.js 22.19+ 和 pnpm。当前使用相邻 `../deepseek-harness` 的已构建包作为本地开发依赖，已在 Harness `0.1.3-alpha.1` 上验证。独立 Git 历史和 lockfile 属于本仓库；发布前需将本地 `link:` 依赖替换成兼容的发布版本。

```powershell
cd D:/project/deepseek-harness-plugins
pnpm install
pnpm run web
pnpm test
```

`pnpm run web` 会构建浏览器包、创建独立的 `.local/harness-home`，并在 `http://127.0.0.1:3081` 启动 Harness。终端会打印带一次性登录参数的地址；打开它后，在“设置”中可以看到“Skill 管理”和“MCP 管理”。本地配置不会提交到 Git。

## 加载到 Harness

日常使用直接在本插件仓库运行：

```powershell
pnpm run web
```

可在命令后附加 Harness Web 参数，例如 `pnpm run web -- --port 3090`。模型调用仍使用这个独立 profile 中配置的模型凭据。管理插件依赖 `tools`、`skills` 和 `connection` 服务。

## Web 设置页

`src/client` 按官方 `settings.section` 模式注册 Settings 里的两个分区——「Skill 管理」（id `skill-manager`）与「MCP 管理」（id `mcp-manager`），各自一个页面（`ctx.slots.inject('settings.section', …)`，inject `slots`/`locale`/`connection`），共享同一个数据控制器与 managed patch。经 `scripts/build.js` 打包为 `lib/client.js`。该产物不入 Git（见 `.gitignore`），改动 `src/client` 后需先运行 `pnpm run build`。浏览器模块 id 是包名 `deepseek-harness-plugins`，由 `package.json` 的 `dsh.client` 元数据与 `exports["./client"]` 决定。

Harness 会扫描插件的 `package.json`，把 `./client` bundle 纳入浏览器模块表，无需改动 Harness。管理数据保存在独立 profile 自己的 `.local/harness-home/profiles/web/cordis.patch.yml` 中，因此 Web profile 会实时加载设置页写入的变化。管理插件本身由 `.local/manager.patch.json` 加载：

```yaml
- insert:
    - id: extension-manager
      name: 'file:///D:/project/deepseek-harness-plugins/src/index.js'
      config:
        patchPath: 'D:/project/deepseek-harness-plugins/.local/harness-home/profiles/web/cordis.patch.yml'
```

该行同时挂载模型工具与经过 Harness 浏览器鉴权的 `/extensions` RPC。`pnpm run setup` 可单独创建这些本地文件，并保留已管理的扩展记录。

## 工具

| 工具 | 参数 | 作用 |
|---|---|---|
| `extensions_list` | 无 | 查看本插件管理的来源及配置启用状态 |
| `extensions_add_skill` | `id`, `directory` | 添加已有 Skill 根目录，目录内放各技能子目录及其 `SKILL.md` |
| `extensions_add_mcp` | `id`, `configuration` | 添加 MCP；configuration 是 JSON 字符串 |
| `extensions_set_enabled` | `id`, `enabled` | 保存启用或禁用状态 |
| `extensions_inspect` | `cwd` | 查询当前调用者实际可见的技能目录和 MCP 工具名 |

新来源默认禁用。添加只校验配置，不执行 MCP 命令；启用 MCP 会让 profile 启动其命令或连接其端点。需要明确选择启用的来源。参数和结果会进入会话日志，不能包含密钥、带令牌的 URL 或命令行凭据。

MCP configuration 示例：

```json
{"transport":"stdio","command":"node","args":["D:/servers/example/server.js"],"cwd":"D:/servers/example"}
```

```json
{"transport":"streamable-http","url":"http://127.0.0.1:9000/mcp"}
```

`web` 的 live patch reload 会应用文件修改；startup 类型 profile 必须重启。写入结果中的 `pending-profile-reload` 只证明配置已保存。用 `extensions_inspect` 查看实际发现的内容；没有 MCP 工具也可能是服务器没有提供工具，不能据此断言连接失败。MCP 连接错误由 Harness 客户端日志报告。

可向模型说：“添加 Skill 根目录 D:/my-skills，id 为 notes，然后启用并检查。”

## 数据与生命周期

管理文件本身就是 JSON 格式的 Cordis patch，没有额外数据库或派生配置。写入使用排他锁和同目录临时文件替换；有其他写入者时操作失败，调用者可重试。进程异常退出遗留 `.lock` 时，确认没有写入者后手动移除锁文件。不要手工修改模块路径或同时让其他工具编辑该文件。

管理工具注册由 Cordis 卸载；Skill 文件扫描和 MCP 连接、重连、工具撤销由 Harness 已有插件负责。禁用 Skill 是撤销整个来源，不修改原始技能文件；已进入会话历史的内容不会被删除。

## 当前范围

模型工具与 Settings 里的「Skill 管理」「MCP 管理」两个分区共享同一份 managed patch 和 `/extensions` RPC，功能一致：列出、添加（Skill 根目录 / MCP 服务器）、启用、禁用。没有独立全屏管理路由；每个分区按来源整体管理，不提供逐技能屏蔽。不复制技能、不从网络下载安装、不管理其他插件已有的配置。尚未集成 MCP OAuth 或凭据引用，因此不接受 `env` 和 `headers`。Skill 添加阶段验证根目录存在，内容解析由启用后的官方 provider 完成；不递归检查 Markdown 引用文件。MCP 诊断显示可见工具，不声称提供独立连接健康状态。

15 项自动测试覆盖配置持久化、拒绝无效写入、锁冲突、取消、真实 Cordis 工具调用、Skill provider 加载、真实本地 HTTP MCP 的工具发现/调用/卸载，以及设置写冲突、凭据不外泄、双语词典一致；不需要模型 API key。真实 GUI 验收覆盖两个设置入口、Skill 和 MCP 添加、启停、页面刷新后的持久化，以及启用 MCP 后发现一个实际工具。
