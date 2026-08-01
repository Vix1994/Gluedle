# Gluedle

这是以 **GLUE** 为主身份的专辑视觉网站，Gluedle 是其中的无音频随机歌曲资料推理互动。玩家从希林娜依高过往作品题库中选择歌曲，在最多 6 次尝试内，根据精确到天的发行日期、时长、所属项目、是否 Live、演唱类型与创作资料的比较反馈找到随机答案。

本项目不播放、不托管歌曲音频，也不摘录歌词。`GLUE` 是专辑网站的主视觉身份，`GLUEDLE` 是游戏字标，`Green to Blue` 只作为概念章节出现。这些名称与 Curley G 仅作为内容主题，并不表示艺人、唱片公司或平台对本项目的官方授权或背书。

## 页面结构

- `#home`：以 GLUE 为主标题的过曝黑白专辑首屏；
- `#concept`：Green to Blue、涟漪与轨道概念说明；
- `#story`：编辑式影像拼贴与当前唯一公开曲目《Glue》；
- 首页居中的 Gluedle 入口：前往干净路由 `/gluedle/`；
- `/concept/`：Echo Orbit 方向的接触、涟漪与回声概念页；
- `/visuals/`：Contact Lake 方向的非对称影像档案；
- `/glue/`：Blue Noise 方向的同名首曲视觉页；
- 五个路由共用唯一的 `GLUE / 概念 / 影像 / 单曲 / Gluedle` App Shell 标题栏，进入游戏后仍可直接返回任一专辑页面；
- 标签点击由 History API 客户端路由接管，只替换主内容和页面样式；标题栏保持常驻，并用 View Transition 完成一致的页面切换；
- 首页、概念、影像与单曲页共用滚轮锚点控制器；Gluedle 保留普通滚动，长内容会按实际阅读节拍停靠；

## 游戏规则

1. 搜索希林娜依高过往作品题库并从只显示歌名的建议中选择一首歌；
2. 提交后比较歌曲、发行日期、时长、所属项目、是否 Live、演唱与创作资料；
3. 高对比颜色、符号与文字共同表示匹配、接近或不匹配，箭头说明年份和时长的答案方向；
4. 每轮最多 6 次选择；打开游戏或点击“换一题”都会随机生成答案；
5. “分享结果图片”生成 1080 × 1350 PNG，包含状态矩阵与指向当前游戏页的二维码；支持时调用系统分享，否则下载图片；
6. “换一题”会立即开始新的随机题，分享内容不包含歌曲音频、歌词、答案 ID 或猜测歌曲 ID。

## 本地开发

需要 Node.js `20.19+`、`22.12+` 或更高版本。

```bash
npm install
npm run dev
```

Vite 通常会在 `http://localhost:5173` 提供首页。三个专辑章节分别位于 `/concept/`、`/visuals/`、`/glue/`，独立游戏位于 `/gluedle/`。这些目录型入口在生产构建中都输出为各自的 `index.html`，因此链接和直接访问不暴露 `.html` 文件名。

请通过 Vite 开发服务器或 `npm run build` 后的构建产物访问，不要直接双击源码 HTML。游戏入口依赖 ES modules，并会读取 `/data/gluedle-songs.json`；加载失败时页面会保留可见的启动提示，而不会伪装成可操作的静态界面。

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
├── public/assets/glue/      # 本项目生成的九张原创无水印概念视觉
├── public/data/gluedle-songs.json # Gluedle 唯一歌曲题库
├── scripts/lint.mjs         # 仓库自检脚本
├── src/data/catalog.js      # 页面文案与专辑公开曲目
├── src/data/song-catalog.js # JSON 题库读取与校验
├── src/game/engine.js       # 随机答案与比较状态机
├── src/share/               # 本地 QR 编码与分享卡绘制
├── src/styles/              # 首页与独立游戏的响应式视觉
├── src/app.js               # 五个路由共用的浏览器入口
├── src/app-shell.js         # 常驻标题栏、History 路由与内容切换
├── src/anchor-wheel-navigation.js # 非游戏页共用的滚轮锚点控制器
├── src/main.js              # 首页内容、展示动画与路由生命周期
├── src/gluedle.js           # 独立游戏、随机题目、动态反馈、分享与路由生命周期
├── tests/                   # 游戏引擎与内容边界测试
├── index.html               # GLUE 专辑视觉首页
├── concept/index.html       # `/concept/` Echo Orbit 概念页
├── visuals/index.html       # `/visuals/` Contact Lake 影像档案
├── glue/index.html          # `/glue/` Blue Noise 单曲视觉页
└── gluedle/index.html       # `/gluedle/` 独立游戏路由入口
```

## 数据与授权

当前专辑展示文案位于 `src/data/catalog.js`，游戏题库固定读取 `public/data/gluedle-songs.json`。题库中的独立发行统一把所属项目写成“单曲”；未来若歌曲属于专辑、EP 或 OST，则在同一字段填写对应项目名。来源链接与待核验字段也以该 JSON 为准。九张运行时视觉已重新生成，不含参考图水印、可读文字或品牌标识；未知创作署名保持为 `null` / “待核验”，不会推测或补写。

题库中的 `isLive` 只表示来源是否明确将该发行版本标为 Live；未标注 Live 的版本记为 `false`，不用于推断未公开的录音方式。“演唱”维度只表达独唱或合作关系，与 Live 状态分开比较。

## 许可证

当前项目未授予开源许可证，保留所有权利。
