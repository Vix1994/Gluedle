/**
 * Prototype copy and song metadata for the audio-free Gluedle experience.
 * Release metadata was checked against the linked Apple Music track pages and
 * Apple iTunes Search API records on 2026-08-01. Unknown credits stay null.
 */

export const siteContent = {
  navigation: [
    { label: "首页", href: "#home" },
    { label: "Green to Blue", href: "#concept" },
    { label: "Glue", href: "#story" },
    { label: "Gluedle", href: "#game" },
    { label: "Credits", href: "#credits" },
  ],
  hero: {
    eyebrow: "GLUEDLE / PROJECT CONCEPT",
    title: "Green to Blue",
    subtitle: "让颜色成为一条听见彼此的路径。",
    body: "这是一组围绕“Glue”展开的项目概念文案：从绿色的生长感出发，经过水、颗粒与回声，抵达更深的蓝。它不代表官方专辑叙事，2026 年相关信息仍待正式物料复核。",
    primaryAction: "进入概念",
    secondaryAction: "开始猜歌",
  },
  concept: {
    eyebrow: "01 / CONCEPT",
    title: "Green to Blue",
    status: "项目概念文案 · 2026 信息待核验",
    paragraphs: [
      "绿色像尚未说完的开头，带着呼吸、摩擦和正在生成的边缘。",
      "蓝色不是终点，而是关系变深之后留下的空间：水面扩散，声音退去，连接仍然存在。",
      "Glue 是两种颜色之间的动作。这里用涟漪、轨道与拼贴表达靠近，不把概念包装成未经证实的发行事实。",
    ],
    motifs: ["颗粒", "涟漪", "轨道", "曝光", "编辑式拼贴"],
  },
  release: {
    label: "已公开曲目",
    countLabel: "01 RELEASED TRACK",
    tracks: [
      {
        position: "01",
        title: "Glue",
        status: "已公开",
        note: "目前唯一公开曲目",
      },
    ],
    notice: "当前只展示已经公开的《Glue》；其余曲目以之后的正式公布为准。",
  },
  story: {
    eyebrow: "02 / MUSIC & MAKING",
    title: "只围绕一首歌",
    intro: "当前只呈现已经公开的《Glue》。影像从一首歌出发，不把 Gluedle 的游戏题库误写成专辑曲目。",
    chapters: [
      {
        index: "01",
        title: "公开",
        body: "目前唯一公开的曲目是《Glue》，首页不推测或预填尚未公布的歌名。",
      },
      {
        index: "02",
        title: "影像",
        body: "曝光、涟漪与拼贴都从这一首歌展开，保持视觉叙事和发行信息的一致。",
      },
      {
        index: "03",
        title: "留白",
        body: "尚未公开的曲目继续留白，等待正式发布信息完成这张地图。",
      },
    ],
  },
  game: {
    eyebrow: "03 / GLUEDLE",
    title: "不用听，也能猜到吗？",
    description: "从发行年份、项目、版本与合作艺人等元数据逐步缩小答案范围。这里没有歌曲音频、试听链接或歌词摘录。",
    instructions: [
      "查看本轮公开的元数据线索。",
      "输入歌名或可接受的别名。",
      "提交后解锁下一条线索，直到猜中或线索用完。",
    ],
    inputLabel: "你的答案",
    inputPlaceholder: "输入歌曲名",
    submitLabel: "提交猜测",
    nextLabel: "下一条线索",
    successTitle: "连接成功",
    failureTitle: "这次让答案浮出水面",
    noAudioNotice: "本原型仅使用元数据，不提供或托管歌曲音频。",
    libraryLabel: "希林娜依高过往作品题库",
    libraryNotice: "仅用于 Gluedle 每日猜歌，不代表本专辑已公布曲目。",
  },
  credits: {
    eyebrow: "04 / CREDITS",
    title: "Credits & Data",
    items: [
      "项目：Gluedle 独立无音频猜歌原型",
      "游戏题库：希林娜依高过往公开发行作品，不等同于本专辑曲目",
      "数据校验：Apple Music 曲目页与 Apple iTunes Search API",
      "视觉素材：用户提供的项目素材，授权状态待确认",
    ],
    disclaimer: "本项目不宣称获得艺人、唱片公司、平台或素材权利人的官方授权或背书。",
  },
};

export const songs = [
  {
    id: "ke-li-ji",
    title: "颗粒季",
    aliases: ["顆粒季", "Ke Li Ji"],
    releaseDate: "2016-01-01",
    releaseYear: 2016,
    durationSec: 269,
    project: { title: "颗粒季 - Single", type: "single" },
    version: null,
    languages: null,
    performanceType: "solo",
    featuredArtists: [],
    curleyCredits: { lyrics: null, composition: null },
    guessable: true,
    sources: [
      {
        name: "Apple Music — 颗粒季",
        url: "https://music.apple.com/us/album/%E9%A2%97%E7%B2%92%E5%AD%A3/1593815890?i=1593815891",
      },
    ],
  },
  {
    id: "u-sugar",
    title: "U",
    aliases: ["u"],
    releaseDate: "2020-02-04",
    releaseYear: 2020,
    durationSec: 245,
    project: { title: "U - Single", type: "single" },
    version: null,
    languages: null,
    performanceType: "collaboration",
    featuredArtists: ["Sugar"],
    curleyCredits: { lyrics: null, composition: null },
    guessable: true,
    sources: [
      {
        name: "Apple Music — U",
        url: "https://music.apple.com/cn/album/u/1668532846?i=1668532852",
      },
    ],
  },
  {
    id: "xi-huan-ni-live",
    title: "喜欢你 (Live)",
    aliases: ["喜欢你", "喜歡你", "喜欢你 Live"],
    releaseDate: "2020-05-02",
    releaseYear: 2020,
    durationSec: 77,
    project: { title: "创造营2020第1期 (Live)", type: "live episode" },
    version: "Live",
    languages: null,
    performanceType: "live solo",
    featuredArtists: [],
    curleyCredits: { lyrics: null, composition: null },
    guessable: true,
    sources: [
      {
        name: "Apple Music — 喜欢你 (Live)",
        url: "https://music.apple.com/cn/album/%E5%96%9C%E6%AC%A2%E4%BD%A0-live/1805137813?i=1805140021",
      },
    ],
  },
  {
    id: "zen-me-hui-wang-ji-ni",
    title: "怎么会忘记你",
    aliases: ["怎麼會忘記你", "怎么会忘记你?"],
    releaseDate: "2023-05-31",
    releaseYear: 2023,
    durationSec: 255,
    project: { title: "怎么会忘记你 - Single", type: "single" },
    version: null,
    languages: null,
    performanceType: "collaboration",
    featuredArtists: ["王赫野"],
    curleyCredits: { lyrics: null, composition: null },
    guessable: true,
    sources: [
      {
        name: "Apple Music — 怎么会忘记你",
        url: "https://music.apple.com/cn/album/%E6%80%8E%E4%B9%88%E4%BC%9A%E5%BF%98%E8%AE%B0%E4%BD%A0/1690731006?i=1690731013",
      },
    ],
  },
  {
    id: "zhe-jiu-shi-ai",
    title: "这,就是爱",
    aliases: ["这就是爱", "這,就是愛", "這就是愛"],
    releaseDate: "2023-08-26",
    releaseYear: 2023,
    durationSec: 229,
    project: { title: "这,就是爱 - Single", type: "single" },
    version: null,
    languages: null,
    performanceType: "solo",
    featuredArtists: [],
    curleyCredits: { lyrics: null, composition: null },
    guessable: true,
    sources: [
      {
        name: "Apple Music — 这,就是爱",
        url: "https://music.apple.com/cn/album/%E8%BF%99-%E5%B0%B1%E6%98%AF%E7%88%B1/1793189706?i=1793189713",
      },
    ],
  },
  {
    id: "chi-xin",
    title: "炽心",
    aliases: ["熾心", "炽心 (电视剧《与凤行》「凤行世上」主题曲)"],
    releaseDate: "2024-02-14",
    releaseYear: 2024,
    durationSec: 216,
    project: {
      title: "炽心 (电视剧《与凤行》「凤行世上」主题曲) - Single",
      type: "soundtrack single",
    },
    version: null,
    languages: null,
    performanceType: "solo",
    featuredArtists: [],
    curleyCredits: { lyrics: null, composition: null },
    guessable: true,
    sources: [
      {
        name: "Apple Music — 炽心",
        url: "https://music.apple.com/cn/album/%E7%82%BD%E5%BF%83-%E7%94%B5%E8%A7%86%E5%89%A7-%E4%B8%8E%E5%87%A4%E8%A1%8C-%E5%87%A4%E8%A1%8C%E4%B8%96%E4%B8%8A-%E4%B8%BB%E9%A2%98%E6%9B%B2/1736007862?i=1736007864",
      },
    ],
  },
  {
    id: "re-la-gun-tang",
    title: "热辣滚烫",
    aliases: ["熱辣滾燙", "热辣滚烫 (电影《热辣滚烫》热辣逐梦曲)"],
    releaseDate: "2024-03-18",
    releaseYear: 2024,
    durationSec: 354,
    project: {
      title: "热辣滚烫(《热辣滚烫》电影热辣逐梦曲) - Single",
      type: "soundtrack single",
    },
    version: null,
    languages: null,
    performanceType: "solo",
    featuredArtists: [],
    curleyCredits: { lyrics: null, composition: null },
    guessable: true,
    sources: [
      {
        name: "Apple Music — 热辣滚烫",
        url: "https://music.apple.com/cn/album/%E7%83%AD%E8%BE%A3%E6%BB%9A%E7%83%AB-%E7%83%AD%E8%BE%A3%E6%BB%9A%E7%83%AB-%E7%94%B5%E5%BD%B1%E7%83%AD%E8%BE%A3%E9%80%90%E6%A2%A6%E6%9B%B2/1735246104?i=1735246110",
      },
    ],
  },
  {
    id: "qi-shi",
    title: "其时",
    aliases: ["其時", "Qi Shi"],
    releaseDate: "2024-05-02",
    releaseYear: 2024,
    durationSec: 202,
    project: { title: "其时 - Single", type: "single" },
    version: null,
    languages: null,
    performanceType: "solo",
    featuredArtists: [],
    curleyCredits: { lyrics: null, composition: null },
    guessable: true,
    sources: [
      {
        name: "Apple Music — 其时",
        url: "https://music.apple.com/cn/album/%E5%85%B6%E6%97%B6/1743940833?i=1743940835",
      },
    ],
  },
  {
    id: "shine-brighter",
    title: "Shine Brighter (愈加璀璨)",
    aliases: ["Shine Brighter", "愈加璀璨", "shine brighter"],
    releaseDate: "2024-06-06",
    releaseYear: 2024,
    durationSec: 216,
    project: {
      title: "Shine Brighter (愈加璀璨) (电视剧《玫瑰的故事》插曲) - Single",
      type: "soundtrack single",
    },
    version: null,
    languages: null,
    performanceType: "solo",
    featuredArtists: [],
    curleyCredits: { lyrics: null, composition: null },
    guessable: true,
    sources: [
      {
        name: "Apple Music — Shine Brighter (愈加璀璨)",
        url: "https://music.apple.com/cn/album/shine-brighter-%E6%84%88%E5%8A%A0%E7%92%80%E7%92%A8-%E7%94%B5%E8%A7%86%E5%89%A7-%E7%8E%AB%E7%91%B0%E7%9A%84%E6%95%85%E4%BA%8B-%E6%8F%92%E6%9B%B2/1750192569?i=1750192570",
      },
    ],
  },
];

export const dataNotice =
  "本目录是 Gluedle 游戏使用的过往作品题库，不是当前专辑的曲目表；日期、时长、项目归属、版本、合作艺人与创作署名在正式发布前均须再次对照官方物料复核，当前无法由可靠来源确认的字段保留为 null。";
