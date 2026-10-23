# 实录雨声（v0.8）

雨声文件随项目本地打包，运行时不访问 Freesound；首次开启声音才加载。以下两项素材的原作品页面均明确标注 CC0 1.0，允许复制、修改与再分发，包括商业用途。代码 MIT 许可与音频 CC0 许可分别适用。

| 本地文件 | 原作者 / 作品 | 来源 | 许可 |
| --- | --- | --- | --- |
| assets/audio/gentle-rain.mp3 | shelbyshark / Gentle Rain.wav | https://freesound.org/people/shelbyshark/sounds/501243/ | CC0 1.0 |
| assets/audio/light-rain.mp3 | Q.K. / Rain_01.wav | https://freesound.org/people/Q.K./sounds/56306/ | CC0 1.0 |

许可原文：https://creativecommons.org/publicdomain/zero/1.0/

下载日期：2026-10-19。采用网站提供的 HQ MP3 预览编码，非付费或登录后原始 WAV。源文件未改动；浏览器解码后在内存中进行 3 秒等功率首尾交叠、音量匹配和场景滤波。保留录音本身的空间与自然起伏，不叠加合成雨滴。Gentle Rain 的作者说明包含很远的雷声，并非保证完全无雷。

- gentle-rain.mp3：1,226,941 bytes；SHA-256 `5fffe1bb4acdd51270b0fa84614be3fa354155b08f60881f4fe12fd0ff53f423`
- light-rain.mp3：587,333 bytes；SHA-256 `97eba2ec0bfb826268057b379b9c4d3522bba8544f21d8fd3da75a2850ada56e`

来源下载地址分别为 https://cdn.freesound.org/previews/501/501243_8644110-hq.mp3 和 https://cdn.freesound.org/previews/56/56306_91374-hq.mp3 。

冻湖仍采用浏览器合成的低声风底；结束提示音由振荡器生成，不属于实录。

---

# 窗边写实素材

**v0.6 起已停用。** 当前场景使用用户确认的 AI 生成纸艺插画，Canvas 另绘制动态；下述图片仅为 v0.5 原型的历史素材，不被页面加载，也不进入 `dist/` 构建。

文件：`assets/window-night.png`。2026-10-19 使用内置 ImageGen 工具生成，未使用 API / CLI fallback。图片已复制到项目中，浏览器只加载本地资源。不是摄影实拍；场景中的大部分雨珠来自静态图片，页面在玻璃区域叠加少量实时滑滴。

该素材为项目生成并随源码提供；原有 MIT 代码许可证不表示图片是第三方真实摄影作品。该段描述仅针对旧 v0.5 原型；当前音频见上文。

## 最终生成提示词

Use case: photorealistic-natural. Asset type: full-screen website background photograph, wide landscape 16:9 composition. Primary request: a believable quiet dim apartment desk beside a rain-covered window at night, lit by one warm yellow desk lamp. Camera is inside the room at seated eye level looking toward a large real window, no people. The small desk lamp sits at the far left of the wooden desk, shade center around 11% of image width and 66% of image height, base near the bottom; lamp has a simple oatmeal linen shade with visible fine weave, a slender dark brass stem, emits soft amber 2400K light pooling naturally across richly textured dark walnut desk. Window occupies central and right upper scene with uneven rain beads and a few thin rivulets, barely visible distant defocused cool slate city lights and sparse muted amber bokeh, physically plausible tiny droplets, no graphic rain streaks. The room is really dark and intimate but not black; cool blue-grey night beyond glass contrasts with warm soft lamplight, natural gentle falloff and subtle reflection of lamp in window. The table spans bottom 22% of frame, one closed plain book near the lamp, otherwise uncluttered. Large central area should be low contrast, dark and suitable for overlaying a focus timer, right central area similarly quiet for controls. Style: real interior photography, tactile materials, slight natural film grain, soft photographic depth of field, realistic lens, physically correct perspective, no illustration, no cartoon, no vector, no game render, no hard-edged glow or surreal geometry. No text, no numbers, no watermark, no UI, no border. Generate a finished high-quality background photograph.

## v0.14 纸艺定稿

六张场景位于 `assets/scenes/*.webp`，通过内置 ImageGen 生成、经用户逐张选择后压缩入包。并非真实摄影。所有背景与音频均本地加载。晴日和冬湖使用柔和合成风声，其他场景使用上文两段 CC0 雨声。风铃、蝴蝶和小舟目前是静态背景元素；雨线、花瓣、落叶、飘雪、涟漪与窗上滑滴为实时动态。
