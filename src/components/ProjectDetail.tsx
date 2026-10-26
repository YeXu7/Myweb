import { galleryReturnHash } from '../garden/galleryReturn'
import { projectDetails } from '../garden/projectDetails'

export function ProjectDetail({ projectIndex = 0 }: { projectIndex?: number }) {
  const project = projectDetails[projectIndex] ?? projectDetails[0]
  const pages = project.pages
  return (
    <>
      <div className="project-detail__top-shade" aria-hidden="true" />
      <a className="project-detail__back" href={`${import.meta.env.BASE_URL}${galleryReturnHash(projectIndex)}`}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m10 3-5 5 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span>返回</span>
      </a>
      <main className="project-detail" aria-label={`${project.title}项目详情`}>
        <h1 className="project-detail__title">{project.title} — {project.description}</h1>
        {pages.map((page, index) => (
          <img
            key={page.file}
            src={`${import.meta.env.BASE_URL}project-details/${project.slug}/${page.file}`}
            alt={`${project.title}项目详情，第 ${index + 1} 页，共 ${pages.length} 页`}
            width={page.width}
            height={page.height}
            loading={index === 0 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : 'auto'}
            decoding="async"
          />
        ))}
      </main>
    </>
  )
}
