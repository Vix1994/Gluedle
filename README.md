# Gluedle

Gluedle 是一款无音频的每日歌曲资料推理游戏，也是一座围绕 **GLUE / Green to Blue** 视觉概念展开的可浏览网站。玩家从希林娜依高过往作品题库中选择歌曲，在最多 6 次尝试内，根据年份、时长、所属项目、语言、是否 Live、演唱类型与创作资料的比较反馈找到每日答案。

本项目不播放、不托管歌曲音频，也不摘录歌词。`GLUEDLE` 是项目字标；页面中的 `GLUE`、`Green to Blue` 与 Curley G 只作为内容主题，并不表示艺人、唱片公司或平台对本项目的官方授权或背书。

## 页面结构

- `#home`：过曝黑白影像与 Green to Blue 首屏；
- `#concept`：涟漪、轨道和概念说明；
- `#story`：编辑式影像拼贴与当前唯一公开曲目《Glue》；
- `#gluedle`：使用过往作品题库的每日无音频元数据推理游戏；
- `#credits`：资料来源、素材状态与版权边界。

## 游戏规则

1. 搜索希林娜依高过往作品题库并从只显示歌名的建议中选择一首歌；
2. 提交后比较歌曲、年份、时长、所属项目、语言、是否 Live、演唱与创作资料；
3. 颜色表示匹配、接近或不匹配，文字箭头说明年份和时长的答案方向；
4. 每日最多 6 次选择，进度按日期与每日答案隔离保存在浏览器中；
5. “重新开始”只清除当前这道题，复制结果不包含歌曲音频或歌词。

## 本地开发

需要 Node.js `20.19+`、`22.12+` 或更高版本。

```bash
npm install
npm run dev
```

Vite 通常会在 `http://localhost:5173` 提供本地开发地址。

## 工程命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run lint` | 检查 JavaScript 语法、HTML 契约与禁用模式 |
| `npm run test` | 使用 Node.js Test Runner 执行游戏引擎测试 |
| `npm run build` | 生成 `dist/` 生产构建 |
| `npm run preview` | 本地预览生产构建 |
| `npm run check` | 依次执行 lint、test、build |

## 项目结构

```text
.
├── public/assets/glue/      # 经项目约定提供的概念视觉素材
├── scripts/lint.mjs         # 仓库自检脚本
├── src/data/catalog.js      # 页面文案、专辑公开曲目与独立游戏题库
├── src/game/engine.js       # 确定性每日答案与比较状态机
├── src/styles/site.css      # 响应式视觉、动效与无障碍状态
├── src/main.js              # 页面渲染与游戏集成
├── tests/                   # 游戏引擎与内容边界测试
└── index.html               # 语义化页面骨架与 dialogs
```

## 数据与授权

当前专辑展示与游戏题库在 `src/data/catalog.js` 中独立维护：专辑区只展示已公开的《Glue》，过往作品只用于 Gluedle 猜歌，不代表专辑曲目。题库来源链接与待核验字段也以该文件为准。视觉素材的授权状态仍需在公开发布前确认；未知创作署名保持为 `null` / “待核验”，不会推测或补写。

题库中的 `isLive` 只表示来源是否明确将该发行版本标为 Live；未标注 Live 的版本记为 `false`，不用于推断未公开的录音方式。“演唱”维度只表达独唱或合作关系，与 Live 状态分开比较。

## 许可证

当前项目未授予开源许可证，保留所有权利。
