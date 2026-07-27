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
    title: '品牌系统',
    label: 'Visual System',
    type: 'Brand Identity',
    tags: ['品牌视觉系统', '设计规范', '全案输出'],
    image: project2,
  },
  {
    id: '03',
    title: '金融 AI',
    label: 'Mobile Experience',
    type: 'AI Product',
    tags: ['金融科技', '移动端', 'AI产品'],
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
