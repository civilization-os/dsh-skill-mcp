# dsh-skill-mcp

为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web 界面提供 Skill 路径和 MCP 服务器管理。

安装后，“设置”中会出现 **Skill 管理** 和 **MCP 管理** 两个页面，同时向 Agent 注册 `extensions_*` 管理工具。插件使用 Harness 自带的 Skill filesystem provider 与 MCP client，配置写入当前 `web` profile 的 `cordis.patch.yml`。

## 通过 dsh 安装

需要已安装 DeepSeek Harness、Node.js 22.19+ 和 pnpm。把插件安装到 `web` profile：

```sh
dsh plugin --profile web add github:civilization-os/dsh-skill-mcp
```

Git 安装可以锁定到具体 commit，避免以后安装到未经确认的新版本：

```sh
dsh plugin --profile web add github:civilization-os/dsh-skill-mcp#<commit-sha>
```

也可以从 npm 安装正式版本：

```sh
dsh plugin --profile web add deepseek-harness-skill-mcp
```

安装完成后重启 Web profile：

```sh
dsh --profile web
```

如果从 DeepSeek Harness 源码仓库运行 CLI，请把上面的 `dsh` 换成 `pnpm dsh`，并在 Harness 仓库根目录执行，例如：

```sh
pnpm dsh plugin --profile web add github:civilization-os/dsh-skill-mcp
pnpm dsh --profile web
```

更新或卸载：

```sh
dsh plugin --profile web update deepseek-harness-skill-mcp
dsh plugin --profile web remove deepseek-harness-skill-mcp
```

Bundle 的新增、更新和移除都需要重启正在运行的 Web profile。Skill 与 MCP 配置保存在用户自己的 profile patch 中；卸载插件不会自动删除这些配置行。

## Skill 管理

用户只需指定一个本地 Skill 路径。一个路径下面可以放多个 Skill，也可以配置多个路径：

```text
skills/
├── code-review/
│   ├── SKILL.md
│   └── references/
└── release-notes/
    ├── SKILL.md
    └── scripts/
```

Skill 页面支持：

- 添加、启用和禁用多个 Skill 路径
- 按路径或用户自定义分组展示
- 搜索、数量统计、frontmatter 格式诊断和同名覆盖提示
- 查看 `scripts`、`references`、`assets` 等资源文件
- 控制模型自动选择和用户 `/name` 调用
- 创建只有 `SKILL.md` 的最小目录，或包含标准资源目录的 Skill

新路径默认禁用。启用后，Harness 的 Skill provider 扫描该路径中的技能。页面在前台时每 3 秒刷新一次。

## MCP 管理

支持两种 MCP 配置类型：

- `stdio`：执行本地命令并通过标准输入输出通信
- `HTTP`：连接 Streamable HTTP MCP 地址

stdio 示例：

```json
{
  "transport": "stdio",
  "command": "node",
  "args": ["D:/servers/example/server.js"],
  "cwd": "D:/servers/example"
}
```

HTTP 示例：

```json
{
  "transport": "streamable-http",
  "url": "http://127.0.0.1:9000/mcp"
}
```

服务器卡片使用状态灯显示禁用、等待发现工具或工具可用，并可展开查看实际注册的工具列表。新服务器默认禁用；启用 stdio 服务器会在 Agent 沙箱之外执行所配置的程序。

当前版本不接受 `env`、认证 header、带凭据或 token 查询参数的 URL。请勿把密钥放进工具参数、MCP 地址或提交到仓库。

## Agent 工具

| 工具 | 作用 |
|---|---|
| `extensions_list` | 查看受管 Skill 路径与 MCP 配置 |
| `extensions_add_skill` | 添加 Skill 路径；Agent 调用时显式指定内部 id |
| `extensions_add_mcp` | 添加 stdio 或 HTTP MCP 配置 |
| `extensions_set_enabled` | 启用或禁用受管配置 |
| `extensions_inspect` | 查看当前 Agent 实际可见的 Skill 与 MCP 工具 |

可以直接告诉 Agent：

> 添加 Skill 路径 `D:/my-skills`，内部 id 使用 `my-skills`，启用后检查发现的技能。

## 本地开发

```sh
git clone git@github.com:civilization-os/dsh-skill-mcp.git
cd dsh-skill-mcp
pnpm install
pnpm run build
pnpm test
```

`pnpm run build` 生成并提交 `lib/client.js`。仓库携带该浏览器产物，因此通过 GitHub 安装时无需执行安装期构建脚本或配置 pnpm `allowBuilds`。

如果本机旁边有一份 `../deepseek-harness` 源码 checkout，可以运行独立开发 profile：

```sh
pnpm run web
```

它会使用 `.local/harness-home`，默认监听 `http://127.0.0.1:3081`，不会修改正式 Harness home。

## 验证

自动测试覆盖配置持久化、Skill 多路径与用户分组、并发 revision、Skill 创建与调用权限、MCP 工具发现和卸载、轮询状态以及中英文词典一致性。测试不需要模型 API key。

## 发布

推送和 Pull Request 会运行构建与测试。推送与 `package.json` 版本一致的 `v*` 标签后，GitHub Actions 会从 `NPM_TOKEN` Actions Secret 发布 npm 包并附带 provenance。例如发布 `0.1.0`：

```sh
git tag v0.1.0
git push origin v0.1.0
```

许可证：[Apache-2.0](LICENSE)。
