export const SCENES = {
  spring: { mood: '想重新开始', heading: '花开了，慢慢来。', description: '细雨落在樱花和溪面上，留一点轻盈给今天。', hint: '在溪边轻点，泛起涟漪。看花瓣随风慢慢飘过。' },
  pond: { mood: '想放慢一点', heading: '慢一点，也没有关系。', description: '看浮叶接住雨滴，给自己一点缓冲。', hint: '在空白处轻点，泛起涟漪。移动指针，轻轻拨开雨。' },
  forest: { mood: '想找回一点温暖', heading: '听雨，也听见秋天。', description: '金黄树影、橙红落叶，和一段慢下来的时间。', hint: '在空白处轻点，泛起涟漪。移动指针，轻轻拨开雨。' },
  lake: { mood: '想留点空白', heading: '雪落下来，就安静了。', description: '蓝白冻湖、覆雪岸边，和一段不必填满的时间。', hint: '看雪慢慢落在冰面上。冰面没有水波；声音是柔和的合成风声。' },
  day: { mood: '想出去透透气', heading: '太阳雨里，坐一会儿。', description: '阳光穿过细雨，草地和野花也在慢慢呼吸。', hint: '这里是一场明亮的太阳雨。调节雨量，听细雨落在草地上。' },
  window: { mood: '想安静待一会儿', heading: '翻几页书，听一会儿雨。', description: '窗外是雨夜，手边摊着一本书。今晚可以慢一点。', hint: '暖光来自画外，窗边只留一本摊开的书。试试「沉浸」，把整片雨夜留给自己。' }
};
export const SCENE_ORDER = Object.keys(SCENES);
export function normalizeScene(value) { return Object.hasOwn(SCENES, value) ? value : 'forest'; }
