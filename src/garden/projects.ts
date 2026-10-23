import project1 from '../assets/projects/project-1.png'
import project2 from '../assets/projects/project-2.png'
import project3 from '../assets/projects/project-3.png'
import project4 from '../assets/projects/project-4.png'

export const projects = [
  {
    id: '01',
    title: '灵机',
    label: 'Product Platform',
    type: 'IP Asset Platform',
    tags: ['IP资产管理平台', 'B端', 'AI结合'],
    image: project1,
  },
  {
    id: '02',
    title: '腾讯视频 OTT 端',
    label: 'Video Experience',
    type: 'Video Experience',
    tags: ['视频产品', 'C端', '界面设计'],
    image: project2,
  },
  {
    id: '03',
    title: '如影',
    label: 'Production Platform',
    type: 'Production Platform',
    tags: ['影视制作', 'B端', '界面设计'],
    image: project3,
  },
  {
    id: '04',
    title: '即行',
    label: 'Interactive Portfolio',
    type: 'Travel App',
    tags: ['出行App', '交互设计', '全流程'],
    image: project4,
  },
] as const
