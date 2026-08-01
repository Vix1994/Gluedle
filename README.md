# Gluedle

Gluedle 是一款无音频的每日歌曲资料推理游戏，也是一座围绕 **GLUE / Green to Blue** 视觉概念展开的可浏览网站。玩家从希林娜依高过往作品题库中选择歌曲，在最多 6 次尝试内，根据年份、时长、所属项目、语言、是否 Live、演唱类型与创作资料的比较反馈找到每日答案。

本项目不播放、不托管歌曲音频，也不摘录歌词。`GLUEDLE` 是项目字标；页面中的 `GLUE`、`Green to Blue` 与 Curley G 只作为内容主题，并不表示艺人、唱片公司或平台对本项目的官方授权或背书。

## 页面结构

- `#home`：过曝黑白影像与 Green to Blue 首屏；
- `#concept`：涟漪、轨道和概念说明；
- `#story`：编辑式影像拼贴与当前唯一公开曲目《Glue》；
- 首页居中的 Gluedle 入口：前往独立的 `/gluedle.html` 游戏页；

## 游戏规则

1. 搜索希林娜依高过往作品题库并从只显示歌名的建议中选择一首歌；
2. 提交后比较歌曲、年份、时长、所属项目、语言、是否 Live、演唱与创作资料；
3. 高对比颜色、符号与文字共同表示匹配、接近或不匹配，箭头说明年份和时长的答案方向；
4. 每日最多 6 次选择，进度按日期与每日答案隔离保存在浏览器中；
5. “分享结果图片”生成 1080 × 1350 PNG，包含状态矩阵与指向当前游戏页的二维码；支持时调用系统分享，否则下载图片；
6. “重新开始”只清除当前这道题，分享内容不包含歌曲音频、歌词、答案 ID 或猜测歌曲 ID。

## 本地开发

需要 Node.js `20.19+`、`22.12+` 或更高版本。

```bash
npm install
npm run dev
```

Vite 通常会在 `http://localhost:5173` 提供首页，独立游戏位于 `http://localhost:5173/gluedle.html`。

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
├── scripts/lint.mjs         # 仓库自检脚本
├── src/data/catalog.js      # 页面文案、专辑公开曲目与独立游戏题库
├── src/game/engine.js       # 确定性每日答案与比较状态机
├── src/share/               # 本地 QR 编码与分享卡绘制
├── src/styles/              # 首页与独立游戏的响应式视觉
├── src/main.js              # 首页内容与滚动展示
├── src/gluedle.js           # 独立游戏与分享流程
├── tests/                   # 游戏引擎与内容边界测试
├── index.html               # GLUE / Green to Blue 首页
└── gluedle.html             # 独立 Gluedle 游戏页
```

## 数据与授权

当前专辑展示与游戏题库在 `src/data/catalog.js` 中独立维护：专辑区只展示已公开的《Glue》，过往作品只用于 Gluedle 猜歌，不代表专辑曲目。题库来源链接与待核验字段也以该文件为准。九张运行时视觉已重新生成，不含参考图水印、可读文字或品牌标识；未知创作署名保持为 `null` / “待核验”，不会推测或补写。

题库中的 `isLive` 只表示来源是否明确将该发行版本标为 Live；未标注 Live 的版本记为 `false`，不用于推断未公开的录音方式。“演唱”维度只表达独唱或合作关系，与 Live 状态分开比较。

## 许可证

当前项目未授予开源许可证，保留所有权利。
