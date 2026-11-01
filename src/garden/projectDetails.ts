import lingji from './lingjiPages.json'
import ott from './ottPages.json'
import ruying from './ruyingPages.json'
import jixing from './jixingPages.json'

export const projectDetails = [
  {
    slug: 'lingji', title: '灵机', description: 'IP 资产管理平台设计案例',
    disciplines: 'B端系统设计 · UI/UX · AI工作流结合',
    overview: '灵机是腾讯视频内部的 IP 资产管理平台，涵盖 IP 资产沉淀、权益引入、授权合作及播放上线等业务场景。本阶段重点围绕资产管理展开，我独立完成了核心页面从 0 到 1 的设计，在传统 B 端界面的基础上探索更清晰、轻盈的视觉表达，并结合多Agent工作流及skills进行设计提效。', pages: lingji,
  },
  {
    slug: 'ott', title: '腾讯视频 OTT 端', description: '视频产品设计案例',
    disciplines: '大屏体验 · UI/UX · 交互设计',
    overview: '腾讯视频 OTT 端面向电视与投影设备的观影场景。本项目围绕内容发现、详情浏览与遥控操作展开，优化大屏界面的信息呈现与交互体验。', pages: ott,
  },
  {
    slug: 'ruying', title: '如影', description: '影视制作平台设计案例',
    disciplines: 'B端系统设计 · 短剧模块 · 制片流程',
    overview: '如影是腾讯视频的制片平台。本项目聚焦短剧模块的界面与交互设计，并参与制片流程优化，支持相关业务线上化。', pages: ruying,
  },
  {
    slug: 'jixing', title: '即行', description: '出行 App 设计案例',
    disciplines: '出行体验 · IP设计 · AIGC探索',
    overview: '即行是一款串联旅行发现、规划与记录的出行产品。本项目围绕旅行流程开展界面与交互设计，同时探索 IP 设计与 AIGC，通过角色塑造和情感化视觉表达丰富产品体验。', pages: jixing,
  },
] as const
