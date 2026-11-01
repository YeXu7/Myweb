import project1 from '../assets/projects/project-1.png'
import project2 from '../assets/projects/project-2.png'
import project3 from '../assets/projects/project-3.png'
import project4 from '../assets/projects/project-4.png'

export const projects = [
  {
    id: '01',
    title: '灵机',
    summary: '面向腾讯视频内部的影视资产管理平台，结合 AI 工作流完成 B 端 UI/UX 设计',
    compactSummary: '为腾讯视频内部影视资产平台设计 B 端体验，并结合 AI 工作流',
    label: 'Product Platform',
    type: 'IP Asset Platform',
    tags: ['IP资产管理平台', 'B端', 'AI结合'],
    image: project1,
  },
  {
    id: '02',
    title: '腾讯视频 OTT 端',
    summary: '面向电视与投影场景，围绕内容发现、详情浏览与遥控操作优化大屏观影体验',
    compactSummary: '面向电视与投影场景，优化内容发现、详情浏览与遥控操作体验',
    label: 'Video Experience',
    type: 'Video Experience',
    tags: ['视频产品', 'C端', '界面设计'],
    image: project2,
  },
  {
    id: '03',
    title: '如影',
    summary: '为腾讯视频制片平台设计短剧模块，并参与制片流程优化，推动业务线上化',
    compactSummary: '为腾讯视频制片平台设计短剧模块，优化制片流程并推动业务线上化',
    label: 'Production Platform',
    type: 'Production Platform',
    tags: ['影视制作', 'B端', '界面设计'],
    image: project3,
  },
  {
    id: '04',
    title: '即行',
    summary: '串联旅行发现、规划与记录，侧重 IP 设计与 AIGC 探索，融合角色塑造与情感化视觉表达',
    compactSummary: '串联旅行发现、规划与记录，侧重 IP 设计、AIGC 与情感化视觉探索',
    label: 'Interactive Portfolio',
    type: 'Travel App',
    tags: ['出行App', '交互设计', '全流程'],
    image: project4,
  },
] as const
