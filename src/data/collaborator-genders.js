export const FEATURED_ARTIST_GENDER_VALUES = Object.freeze([
  "none",
  "male",
  "female",
  "mixed",
  "unknown",
]);

export const FEATURED_ARTIST_GENDER_LABELS = Object.freeze({
  none: "无",
  male: "男",
  female: "女",
  mixed: "其他",
  unknown: "其他",
});

// 手工维护：只记录公开身份明确的个人艺人；组合、品牌/IP 或无法确认的对象保持 unknown。
const MANUAL_FEATURED_ARTIST_GENDERS = Object.freeze({
  "Ari Abdul": "female",
  "Cody Fry": "male",
  "Crazy Donkey金大智": "male",
  "VaVa娃娃": "female",
  "张碧晨": "female",
  "胡彦斌": "male",
  "胡海泉": "male",
  "艾热AIR": "male",
  "Ken Gao": "male",
  "Kirsty刘瑾睿": "female",
  "R3HAB": "male",
  "六克Ryuk": "male",
  "法老": "male",
  "李斯丹妮": "female",
  "梁博": "male",
  "路南": "male",
  "米卡": "male",
  "容祖儿": "female",
  "王赫野": "male",
  "张信哲": "male",
  "黄绮珊": "female",
});

export function getFeaturedArtistGender(featuredArtists) {
  if (!Array.isArray(featuredArtists) || featuredArtists.length === 0) {
    return "none";
  }

  const genders = featuredArtists.map((artist) => (
    MANUAL_FEATURED_ARTIST_GENDERS[String(artist).trim()] ?? "unknown"
  ));
  if (genders.includes("unknown")) return "unknown";
  return new Set(genders).size === 1 ? genders[0] : "mixed";
}
