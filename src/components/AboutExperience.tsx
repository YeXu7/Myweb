import { useRef } from 'react'
import { useAboutDefocus } from '../hooks/useAboutDefocus'
import tencentLogo from '../assets/about/tencent.png'
import '../styles/contact-font.css'
import '../styles/about-experience.css'

const experienceProjects = [
  {
    category: '资产与制片系统',
    name: '灵机',
    contribution: '独立完成核心页面从 0 到 1 的 UI/UX 设计，以 IP 为主线组织资产信息，梳理归属关系与查找路径，并结合多 Agent 工作流及 Skills 进行设计提效',
  },
  {
    category: '大屏与创作体验',
    name: '腾讯视频 OTT',
    contribution: '参与剧集容器、详情页与预约功能设计，结合大屏使用习惯和数据反馈，优化内容浏览与发现体验',
  },
  {
    category: '影视制片管理系统',
    name: '如影',
    contribution: '负责短剧排播看板、品类地图等功能设计，参与剧组访谈与制片流程优化，推动线下工作流线上化',
  },
  {
    category: '内容创作平台',
    name: '创作号',
    contribution: '独立完成引导、发布等专项设计，参与创作灵感与数据中心改版，帮助创作者明确方向、改善创作体验',
  },
] as const

const capabilities = [
  {
    title: '经验覆盖 B/C 端设计场景',
    description: '兼顾专业用户的工作流程与普通用户的使用习惯。在资产管理、影视制片等复杂系统中梳理信息与操作路径，也从大众用户视角优化大屏浏览、内容发现与创作体验',
    tags: ['复杂系统', '内容生产与消费', '信息架构'],
  },
  {
    title: '用户研究与体验分析结合',
    description: '参与剧组用户访谈，结合 OTT 大屏用户的使用习惯、竞品分析与数据反馈，定位流程中的痛点与体验障碍，将研究发现转化为针对性的功能设计和体验迭代',
    tags: ['用户访谈', '场景与习惯', '数据反馈'],
  },
  {
    title: 'AI 工作流与工程能力',
    description: '将工程思维与多 Agent、Skills、Vibe Coding 融入设计流程，串联方案探索、界面初稿、代码实现与设计走查；结合业务知识库沉淀可复用步骤，提升设计迭代与落地效率',
    tags: ['多 Agent 协作', 'Skills', 'Vibe Coding'],
  },
] as const

export function AboutExperience() {
  const ref = useRef<HTMLElement>(null)
  useAboutDefocus(ref)
  return (
    <section ref={ref} id="about" className="about-experience" data-about-chapter aria-label="About Yulia" lang="zh-CN">
      <div className="about-experience__content" data-about-content>
        <div className="about-experience__columns">
          <section className="about-experience__work" aria-labelledby="about-work-heading">
            <h2 id="about-work-heading" className="about-experience__title" lang="en">Work Experience</h2>
            <header className="about-experience__company">
              <img className="about-experience__logo" src={tencentLogo} alt="Tencent" width="160" height="48" loading="lazy" decoding="async" />
              <div className="about-experience__company-copy">
                <h3 id="about-company">腾讯科技（深圳）</h3>
                <p className="about-experience__team">腾讯视频 · 交互设计 · <span><time dateTime="2023-08">2023.08</time>-<time dateTime="2026-08">2026.08</time></span></p>
              </div>
            </header>
            <ol className="about-experience__timeline" aria-label="任职期间参与的四个项目">
              {experienceProjects.map(project => (
                <li key={project.name}>
                  <div className="about-experience__project-heading">
                    <h4>{project.category}</h4>
                    <p className="about-experience__project-name">/ {project.name}</p>
                  </div>
                  <p className="about-experience__contribution">{project.contribution}</p>
                </li>
              ))}
            </ol>
          </section>
          <section className="about-experience__capabilities" aria-labelledby="about-capabilities-heading">
            <h2 id="about-capabilities-heading" className="about-experience__title" lang="en">Capabilities</h2>
            <div className="about-experience__capability-list">
            {capabilities.map((capability) => (
              <article className="about-experience__card" key={capability.title}>
                <header className="about-experience__card-heading">
                  <div>
                    <h3>{capability.title}</h3>
                  </div>
                </header>
                <p className="about-experience__description">{capability.description}</p>
                <ul className="about-experience__tags" aria-label="能力关键词">
                  {capability.tags.map(tag => <li key={tag}>{tag}</li>)}
                </ul>
              </article>
            ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  )
}
