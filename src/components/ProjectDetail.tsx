import { galleryReturnHash } from '../garden/galleryReturn'
import pages from '../garden/lingjiPages.json'

export function ProjectDetail() {
  return (
    <>
      <div className="project-detail__top-shade" aria-hidden="true" />
      <a className="project-detail__back" href={`${import.meta.env.BASE_URL}${galleryReturnHash}`}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m10 3-5 5 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span>返回</span>
      </a>
      <main className="project-detail" aria-label="灵机项目详情">
        <h1 className="project-detail__title">灵机 — IP 资产管理平台设计案例</h1>
        {pages.map((page, index) => (
          <img
            key={page.file}
            src={`${import.meta.env.BASE_URL}project-details/lingji/${page.file}`}
            alt={`灵机项目详情，第 ${index + 1} 页，共 ${pages.length} 页`}
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
