import test from "node:test";
import assert from "node:assert/strict";

import { extractHintLyrics } from "../src/data/lyric-hints.ts";

test("extractHintLyrics keeps short lyric lines and filters metadata, title, and artist", () => {
  const hints = extractHintLyrics(`
[ti:目标歌]
[00:00.00]第一句足够长的歌词线索
[00:05.10]目标歌会被过滤掉
作词：希林娜依高
[00:10.20]第二句也应该作为歌词提示
[00:15.30]希林娜依高会被过滤掉
[00:20.40]第三句适合展示给玩家
`, {
    title: "目标歌",
    artistNames: ["希林娜依高"],
    isMetadataLine: (line) => /作词|作曲/u.test(line),
  });

  assert.deepEqual(hints, [
    "第一句足够长的歌词线索",
    "第二句也应该作为歌词提示",
    "第三句适合展示给玩家",
  ]);
});

test("extractHintLyrics caps the generated public hint list", () => {
  const hints = extractHintLyrics(
    "第一条歌词提示内容\n第二条歌词提示内容\n第三条歌词提示内容\n第四条歌词提示内容",
    { maxHints: 3 },
  );

  assert.equal(hints.length, 3);
});
