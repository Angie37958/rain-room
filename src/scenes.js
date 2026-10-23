export const SCENES = {
  spring: { mood: '想重新开始', heading: '花开了，慢慢来。', description: '细雨落在樱花和溪面上，留一点轻盈给今天。', hint: '轻触溪面，看水光轻轻散开。慢慢划过，带起一点微光与花瓣。' },
  pond: { mood: '想放慢一点', heading: '慢一点，也没有关系。', description: '看浮叶接住雨滴，给自己一点缓冲。', hint: '轻触水面，看水光轻轻散开。慢慢划过，带起一点微光与细雨；沉浸时更明显。' },
  forest: { mood: '想找回一点温暖', heading: '听雨，也听见秋天。', description: '金黄树影、橙红落叶，和一段慢下来的时间。', hint: '轻触水面，看水光轻轻散开。慢慢划过，带起一点微光与细雨；沉浸时更明显。' },
  lake: { mood: '想留点空白', heading: '雪落下来，就安静了。', description: '蓝白冻湖、覆雪岸边，和一段不必填满的时间。', hint: '看雪慢慢落在冰面上。轻轻划过，雪花会让开。冰面没有水波；声音是柔和的合成风声。' },
  day: { mood: '想出去透透气', heading: '在树荫下，坐一会儿。', description: '光斑穿过树叶，蝴蝶在微风里相伴。', hint: '看叶片缓慢飘过。这里是柔和的合成微风，没有落雨。' },
  window: { mood: '想安静待一会儿', heading: '灯亮着，听一会儿雨。', description: '窗外是蓝调雨夜，屋内留着一盏暖灯。今晚可以慢一点。', hint: '看窗外的雨轻轻落下。试试「沉浸」，把整片雨夜留给自己。' }
};
export const SCENE_ORDER = Object.keys(SCENES);
export function normalizeScene(value) { return Object.hasOwn(SCENES, value) ? value : 'forest'; }
