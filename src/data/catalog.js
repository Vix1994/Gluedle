/**
 * Prototype copy and song metadata for the audio-free Gluedle experience.
 * Release metadata was checked against the linked Apple Music track pages and
 * Apple iTunes Search API records on 2026-08-01. Unknown credits stay null.
 * `isLive` describes whether the sourced release version is explicitly marked
 * as Live; it is not a claim about otherwise undocumented recording conditions.
 */

export const siteContent = {
  navigation: [
    { label: "首页", href: "#home" },
    { label: "Green to Blue", href: "#concept" },
    { label: "视觉", href: "#story" },
    { label: "Gluedle", href: "/gluedle/" },
  ],
  hero: {
    eyebrow: "CURLEY G / GLUE — ALBUM VISUAL",
    title: "Glue",
    subtitle: "让接触留下形状。",
    body: "从同名首曲《Glue》开始，让接触、涟漪、颗粒与曝光组成这张专辑的第一层视觉。",
    primaryAction: "进入 Glue",
    secondaryAction: "开始猜歌",
  },
  concept: {
    eyebrow: "01 / CONCEPT",
    title: "Green to Blue",
    status: "GREEN TO BLUE / VISUAL STUDY",
    paragraphs: [
      "绿色像尚未说完的开头，带着呼吸、摩擦和正在生成的边缘。",
      "蓝色不是终点，而是关系变深之后留下的空间：水面扩散，声音退去，连接仍然存在。",
      "Glue 是两种颜色之间的动作。涟漪、轨道与拼贴把靠近的过程留了下来。",
    ],
    motifs: ["颗粒", "涟漪", "轨道", "曝光", "编辑式拼贴"],
  },
  release: {
    label: "GLUE",
    countLabel: "01 / RELEASED TRACK",
    tracks: [
      {
        position: "01",
        title: "Glue",
      },
    ],
  },
  story: {
    eyebrow: "02 / MUSIC & MAKING",
    title: "只围绕一首歌",
    intro: "《Glue》从一滴涟漪开始，在曝光、颗粒与蓝色轨道之间扩散。",
    chapters: [
      {
        index: "01",
        title: "涟漪",
        body: "指尖与水面接触，第一圈回声由此展开。",
      },
      {
        index: "02",
        title: "影像",
        body: "曝光、涟漪与拼贴沿着这一首歌继续生长。",
      },
      {
        index: "03",
        title: "深蓝",
        body: "颜色逐渐沉入深蓝，连接仍停留在水面之上。",
      },
    ],
  },
  game: {
    eyebrow: "03 / GLUEDLE",
    title: "不用听，也能猜到吗？",
    description: "从发行年份、项目、是否 Live、版本与合作艺人等资料逐步缩小答案范围。",
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
    isLive: false,
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
    isLive: false,
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
    isLive: true,
    languages: null,
    performanceType: "solo",
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
    isLive: false,
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
    isLive: false,
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
    isLive: false,
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
    isLive: false,
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
    isLive: false,
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
    isLive: false,
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
  "本目录是 Gluedle 游戏使用的过往作品题库，不是当前专辑的曲目表；“是否 Live”仅表示来源是否明确将该发行版本标为 Live，不推断未公开的录音方式。日期、时长、项目归属、版本、合作艺人与创作署名在正式发布前均须再次对照官方物料复核，当前无法由可靠来源确认的字段保留为 null。";
