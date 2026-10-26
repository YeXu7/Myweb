import lingji from './lingjiPages.json'
import ott from './ottPages.json'
import ruying from './ruyingPages.json'
import jixing from './jixingPages.json'

export const projectDetails = [
  { slug: 'lingji', title: '灵机', description: 'IP 资产管理平台设计案例', pages: lingji },
  { slug: 'ott', title: '腾讯视频 OTT 端', description: '视频产品设计案例', pages: ott },
  { slug: 'ruying', title: '如影', description: '影视制作平台设计案例', pages: ruying },
  { slug: 'jixing', title: '即行', description: '出行 App 设计案例', pages: jixing },
] as const
