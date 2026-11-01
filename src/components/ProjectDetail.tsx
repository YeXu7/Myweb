import '../styles/contact-font.css'
import { galleryReturnHash } from '../garden/galleryReturn'
import { projectDetails } from '../garden/projectDetails'
import '../styles/project-detail.css'

export function ProjectDetail({ projectIndex = 0 }: { projectIndex?: number }) {
  const index = projectDetails[projectIndex] ? projectIndex : 0
  const project = projectDetails[index]
  const next = projectDetails[(index + 1) % projectDetails.length]
  return (
    <div className="project-case">
      <div className="project-case__garden" aria-hidden="true" />
      <div className="project-case__top-shade" aria-hidden="true" />
      <a className="project-case__close" href={`${import.meta.env.BASE_URL}${galleryReturnHash(index)}`} aria-label="关闭项目详情" title="关闭项目详情">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      </a>
      <main className="project-case__content" aria-label={`${project.title}项目详情`}>
        <header className="project-case__intro">
          <h1>{project.title}</h1>
          <p className="project-case__disciplines">{project.disciplines}</p>
        </header>
        <section className="project-case__overview" aria-labelledby="project-overview-title">
          <h2 className="project-case__section-title" id="project-overview-title">作品概览 <span>/ Work overview</span></h2>
          <p>{project.overview}</p>
        </section>
        <section className="project-case__gallery" aria-labelledby="project-gallery-title">
          <h2 className="project-case__section-title" id="project-gallery-title">项目详情 <span>/ Project gallery</span></h2>
          {project.pages.map((page, index) => (
            <figure className="project-case__image" key={page.file}>
              <img
                src={`${import.meta.env.BASE_URL}project-details/${project.slug}/${page.file}`}
                alt={`${project.title}项目详情，第 ${index + 1} 页，共 ${project.pages.length} 页`}
                width={page.width} height={page.height}
                loading={index === 0 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : 'auto'} decoding="async"
              />
            </figure>
          ))}
        </section>
        <footer className="project-case__footer">
          <a href={`${import.meta.env.BASE_URL}${galleryReturnHash(index)}`}>返回作品集 <span>/ Selected works</span></a>
          <a href={`${import.meta.env.BASE_URL}projects/${next.slug}/`}>下一个项目 <span>/ {next.title} →</span></a>
        </footer>
      </main>
    </div>
  )
}
