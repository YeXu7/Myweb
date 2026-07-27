# Yulia 个人网站交接文档

> 给 Claude / 后续开发者：这是 Yulia 个人作品集网站的当前交接说明。请先读本文件，再读项目内的 PRD / 方案文档。

## 1. 项目地址与当前预览

- 本地项目目录：`/Users/yanlei/Documents/个人网站2`
- 当前本地预览地址：`http://127.0.0.1:5174/`
- 当前只实现了第 1 屏：首页 Hero。
- 网站规划共 3 屏：
  1. 首页：数字花园沉浸式 Hero
  2. Projects：4 个项目
  3. About + Contact

如果预览地址打不开，进入项目目录后运行：

```bash
pnpm dev --host 127.0.0.1
```

常用命令：

```bash
pnpm test
pnpm build
```

## 2. 需求 / PRD 文档

请优先阅读：

- `init.md`：项目初始需求、方案 1「极光冲击」方向、整体三屏结构。
- `方案2-数字花园.md`：当前采用的方案 2，核心是「数字花园」沉浸式首屏。
- `docs/superpowers/plans/2026-06-25-digital-garden-hero.md`：第一屏实施计划。

当前用户已确认：

- 数字花园方向“气质非常对，很喜欢”。
- 首页先走方案 2。
- 整站只做 3 屏：首页、项目、我的。
- Projects 在下一屏展示；About + Contact 留在第 3 屏。
- 风格目标：UI/UX + 偏创新体验。

## 3. 当前首屏视觉方向

关键词：

- 数字花园
- 水波流动
- 马赛克 / 像素网格
- 鼠标进入后局部磁场扭曲
- 鼠标圆形区域内网格线高亮，边缘渐隐回到普通线条
- 不要太 SaaS / 玻璃拟态泛滥

设计判断：

- 背景本身已经很“液态、湿润、发光”，所以 UI 不建议大面积毛玻璃 / 液态玻璃。
- 更推荐：自然液态背景 + 冷静的平面线条 / 粗野主义骨架。
- 少量玻璃可用于 hover、项目卡片浮层、按钮状态，但不要抢走数字花园主体。

## 4. 已完成内容

### 技术栈

- Vite
- React 19
- TypeScript
- Three.js / WebGL shader
- Vitest + Testing Library

### 页面结构

入口文件：

- `src/main.tsx`
- `src/App.tsx`

首屏组件：

- `src/components/DigitalGardenHero.tsx`
- `src/components/DigitalGardenScene.tsx`

核心视觉：

- `src/garden/scene.ts`：Three.js 场景、pointer、reduced motion、resize、渲染循环。
- `src/garden/shaders.ts`：数字花园 shader，包含水波、马赛克、网格线、鼠标磁场扭曲、高亮区域。
- `src/assets/digital-garden-hero.png`：当前首屏底图。

内容文案：

- `src/garden/content.ts`

当前英文文案：

```txt
Hi, I’m Yulia.
UI/UX Designer
Designing where systems begin to feel alive.
```

中文文案：

```txt
你好，我是 Yulia。
UI/UX 设计师
让系统拥有可被感知的生命力。
```

### 已做的性能 / 可访问性处理

- reduced motion 下不再持续满帧 WebGL 渲染。
- 移动端降低 DPR 渲染压力。
- WebGL 背景作为装饰层，设置 `aria-hidden="true"`。
- WebGL 初始化失败时保留 CSS 静态背景 fallback。
- 语言切换有测试覆盖。
- WebGL fallback 有测试覆盖。

## 5. 当前最新待优化点

用户最新反馈：

1. 马赛克网格仍然偏大。
2. 希望网格密度介于两张参考图之间：
   - 不像大块花朵图那么粗。
   - 也不用像像素字母图那么极密。
3. 网格线需要更明显。
4. 鼠标移入卡顿已减轻，但视觉还需要继续调。

最近一次已改：

- `src/garden/shaders.ts`
  - grid 从约 `25–32 × 15` 调到 `36–44 × 22`。
  - 提亮并加粗了网格线。
  - 构建通过。

如果继续优化，优先改 `src/garden/shaders.ts` 这些参数：

```glsl
float rowBand = floor(gridUv.y * 22.0);
float columns = mix(36.0, 44.0, rowSeed);
vec2 grid = vec2(columns, 22.0);

float gridLine = 1.0 - smoothstep(0.0, 0.018 + magnetic * 0.014, edgeDistance);
vec3 lineColor = mix(vec3(0.66, 0.86, 0.78), vec3(0.9, 1.0, 0.94), halo * uPointerPower * motion);
float lineStrength = mix(0.38, 0.68, halo * uPointerPower * motion);
```

建议下一步：

- 如果用户仍觉得大：把 grid 提到约 `48–58 × 28`。
- 如果线条仍不明显：提高 `lineStrength` 到 `0.48–0.78`。
- 如果太像普通网格：让 hover 区更亮，普通区保持稍暗。

## 6. 已验证状态

最近一次验证：

```bash
pnpm build
```

结果：通过。

之前完整验证：

```bash
pnpm test
pnpm build
```

结果：

- 3 个测试文件通过。
- 10 个测试通过。
- 生产构建通过。

注意：构建有 Three.js chunk 偏大的 warning，暂不影响原型确认。上线前建议处理：

- 图片转 WebP / AVIF。
- Three.js / WebGL 相关代码动态加载或 manualChunks。

## 7. 重要文件清单

核心实现：

- `src/components/DigitalGardenHero.tsx`
- `src/components/DigitalGardenScene.tsx`
- `src/garden/scene.ts`
- `src/garden/shaders.ts`
- `src/garden/content.ts`
- `src/styles.css`

测试：

- `src/components/DigitalGardenHero.test.tsx`
- `src/components/DigitalGardenScene.test.tsx`
- `src/garden/interaction.test.ts`
- `src/test/setup.ts`

素材 / 截图：

- `src/assets/digital-garden-hero.png`
- `review-desktop-latest.png`
- `review-mobile-latest.png`

文档：

- `init.md`
- `方案2-数字花园.md`
- `docs/superpowers/plans/2026-06-25-digital-garden-hero.md`

## 8. 给 Claude 的执行建议

请优先低成本、小步修改：

1. 不要大范围重构。
2. 先调 `src/garden/shaders.ts` 参数。
3. 每次只做一组视觉参数调整。
4. 验证先跑 `pnpm build` 即可；关键交互变更再跑 `pnpm test`。
5. 不要主动启用多 agent，除非 Yulia 明确要求。
6. 中间说明保持简短，避免大量 token 消耗。

Yulia 的偏好：

- 默认中文。
- 结论优先，少废话。
- UI/UX 判断要直接。
- 关注信息层级、可读性、响应式、交互状态和设计气质。
- 不要为了流程而流程，优先高性价比执行。

