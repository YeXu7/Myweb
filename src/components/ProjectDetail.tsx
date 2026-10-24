import pages from '../garden/lingjiPages.json'

export function ProjectDetail() {
  return (
    <>
      <a className="project-detail__back" href={`${import.meta.env.BASE_URL}#projects`}>返回作品</a>
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
