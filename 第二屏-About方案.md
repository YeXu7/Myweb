# 第二屏 · About / 关于我 —— 内容与实现方案

> 状态：待你审阅确认 → 确认后再进入开发  
> 目标：把当前第2屏重复的「项目跑马灯」替换为 About 页，形成 Hero(钩子) → About(认识你) → Projects(作品) 的清晰叙事。  
> 主题基调：潮湿数字花园（wet digital garden）—— 湿润、会呼吸、有生命力。

---

## 1. 背景与决策

### 现状问题

- 第2屏 `ProjectArchive`（横向跑马灯）与第3屏 `ProjectHelix`（3D 螺旋）都是「项目展示」，内容重复。
- 第1屏 Hero 极简，只有名字 + 定位 + 一句话，缺少「关于你这个人」的实质信息。

### 决策

| 屏  | 角色      | 内容                          |
| -- | ------- | --------------------------- |
| 01 | 钩子      | Hero — 名字 + 一句话定位（保持不动）     |
| 02 | **认识你** | **About — 你是谁、擅长什么**（本方案新增） |
| 03 | 作品      | 3D 螺旋项目展示（保持不动）             |

### 旧组件处理方式（已确认）

- 从 `App.tsx` 移除 `<ProjectArchive />` 的引用与 import。
- `src/components/ProjectArchive.tsx` 文件**保留不删**，将来可随时恢复。
- 相关 CSS（`.projects` 系列）暂保留，不清理，避免误伤。

---

## 2. About 屏内容结构

采用左右分栏（大屏）/ 上下堆叠（小屏）的编辑式版面，共 4 个内容块。**A 块必备，B/C/D 按素材取舍。**

```
┌─────────────────────────────────────────────┐
│  ABOUT · YULIA · 2026                 02 / 03 │
│  About / 关于我                                │
│  ─────────────────────────────────────────    │
│  ┌──────────────────────┐  ┌──────────────┐   │
│  │ A · 一段话叙述        │  │ B · 能力标签  │   │
│  │ （主文案，2-3 句）    │  │ 技能 chips    │   │
│  │                       │  ├──────────────┤   │
│  │                       │  │ C · 履历/数字 │   │
│  └──────────────────────┘  └──────────────┘   │
│  ┌──────────────────────────────────────────┐ │
│  │ D · 联系 / 出口   Email · 社媒 · 查看作品↓ │ │
│  └──────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### A · 一段话叙述（必备）

主文案，带潮湿花园语气，不写成简历流水账。

- **中文**：「我在系统与感官的交界处做设计。让原本冰冷的界面像被雨水浸润过一样——会呼吸、有湿度、能被感知。五年里，我把复杂的产品逻辑，长成了可以生长的体验。」
- **English**: "I design at the edge where systems meet the senses — making cold interfaces feel rained-on: breathing, humid, alive. For five years I've grown tangled product logic into experiences that can quietly keep growing."

> 以上为示意，你替换成自己的真实语气即可。保留「潮湿/生长/呼吸」这类与花园主题呼应的词，会让整站基调统一。

### B · 能力标签（chips）

沿用第3屏已有的 tag 视觉（圆角描边）。建议：  
`Design System` · `Interaction` · `Motion` · `Prototyping` · `Figma` · `User Research`

### C · 履历 / 数字

- 数字：`5+ Years` · `20+ Projects`（示意，按实际改）
- 可选 1-2 行迷你时间线：`2024–now · XX 公司` / `2021–2024 · XX`

### D · 联系 / 出口

- Email + 1-2 个社媒（Behance / 小红书 / LinkedIn 等，按你有的填）
- 一个「查看作品 ↓」的引导，自然衔接到第3屏

---

## 3. 技术实现方案

### 新增文件

- `src/components/AboutMe.tsx` —— About 屏组件
- 文案数据加入 `src/garden/content.ts`，新增 `aboutContent`（en/zh 双语），与 `heroContent` 同构，保持双语架构一致。

### 修改文件

- `src/App.tsx`：移除 `ProjectArchive` 的 import 与 `<ProjectArchive />`；在原位置插入 `<AboutMe />`。
- `src/styles.css`：新增 `.about` 系列样式（复用现有 `snap-section`、grain、ambient 变量，保证与其它两屏质感一致）。
- `src/App.test.tsx`：把针对 `projects-marquee-group` 的断言，替换为 About 屏的存在性断言（如标题 `About` 可见）。

### 视觉与交互要点

- 复用 `snap-section` 滚动吸附、`hero__grain` 颗粒、`projects__ambient` 光晕，让三屏质感连续。
- 入场：文案分行淡入 + 轻微上移（呼应 Hero 的逐字入场，但更克制）。
- 角标：右上 `ABOUT · YULIA · 2026`，右下 `02 / 03`，与另两屏的编号系统对齐。
- 潮湿感细节（可选，低成本）：主文案关键词加一层极轻的水光 hover / 呼吸感透明度浮动。
- 无障碍：`aria-labelledby` 指向标题；`prefers-reduced-motion` 时关闭入场动画。

### 双语

现有 `DigitalGardenHero` 已支持 `language` prop。`AboutMe` 同样接收 `language?: 'en' | 'zh'`，默认与 Hero 一致，未来接语言切换时统一联动。

---

## 4. 分步执行清单（确认后按序做）

1. `content.ts` 增加 `aboutContent`（双语文案，先用本文档示意稿占位）。
2. 新建 `AboutMe.tsx`，搭出 A/B/C/D 结构 + 角标。
3. `styles.css` 新增 `.about` 样式，复用主题变量与颗粒/光晕。
4. `App.tsx` 摘掉 `ProjectArchive`，换上 `AboutMe`。
5. 更新 `App.test.tsx` 断言。
6. `tsc --noEmit` 校验类型；本地预览确认视觉。
7. 你在页面上把示意文案替换成真实内容。

---

## 5. 待你确认 / 提供

- [ ] A 段主文案：用示意稿，还是你会给真实版本？
- [ ] C 块数字：`5+ Years / 20+ Projects` 是否准确？时间线要不要？
- [ ] D 块联系方式：Email 和社媒具体填什么？
- [ ] 是否需要个人照片/形象图（目前方案默认纯文字排版，不依赖图片）？

> 确认后我就按第 4 节清单开发。开发严格遵循「只改本方案涉及部分，其它无 bug 不动」。
