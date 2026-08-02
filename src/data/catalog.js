/** Static site copy. Game metadata lives in /public/data/gluedle-songs.json. */
export const siteContent = {
  navigation: [
    { label: "GLUE", href: "/" },
    { label: "概念", href: "/concept/" },
    { label: "影像", href: "/visuals/" },
    { label: "单曲", href: "/glue/" },
    { label: "Gluedle", href: "/gluedle/" },
  ],
  hero: {
    eyebrow: "CURLEY G / GLUE — ALBUM VISUAL",
    title: "Glue",
    subtitle: "让接触留下形状。",
    body: "专辑与第一首公开歌曲共享同一个名字。这里从《Glue》出发，让接触、涟漪、颗粒与曝光构成第一张视觉页。",
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
    tracks: [{ position: "01", title: "Glue" }],
  },
  story: {
    eyebrow: "02 / MUSIC & MAKING",
    title: "只围绕一首歌",
    intro: "《Glue》从一滴涟漪开始，在曝光、颗粒与蓝色轨道之间扩散。",
    chapters: [
      { index: "01", title: "涟漪", body: "指尖与水面接触，第一圈回声由此展开。" },
      { index: "02", title: "影像", body: "曝光、涟漪与拼贴沿着这一首歌继续生长。" },
      { index: "03", title: "深蓝", body: "颜色逐渐沉入深蓝，连接仍停留在水面之上。" },
    ],
  },
  game: {
    eyebrow: "03 / GLUEDLE",
    title: "不用听，也能猜到吗？",
    description: "从发行日期、项目分类、演唱与创作资料逐步缩小答案范围。",
    instructions: ["查看本轮元数据线索。", "输入歌名或可接受的别名。", "沿着每次比较继续推理。"],
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
