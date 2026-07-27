import { projects } from '../garden/projects'
import type { CSSProperties } from 'react'

export function ProjectArchive() {
  const renderProjectCard = (project: (typeof projects)[number], index: number, isClone = false) => {
    const card = (
      <>
        <div className="project-card__topline">
          <p className="project-card__number">
            {project.id} / {project.title}
          </p>
          <span>{project.type}</span>
        </div>
        <figure className="project-card__media">
          <img src={project.image} alt={isClone ? '' : `${project.title} project cover`} />
        </figure>
        <div className="project-card__body">
          <p>{project.label}</p>
          {isClone ? (
            <span className="project-card__link">View Project</span>
          ) : (
            <a className="project-card__link" href="#projects" aria-label={`View ${project.title}`}>
              View Project
            </a>
          )}
        </div>
      </>
    )

    if (isClone) {
      return (
        <div
          className="project-card project-card--ghost"
          key={`ghost-${project.id}`}
          aria-hidden="true"
          style={{ '--delay': `${index * 0.12}s` } as CSSProperties}
        >
          {card}
        </div>
      )
    }

    return (
      <article
        className="project-card"
        key={project.id}
        style={{ '--delay': `${index * 0.12}s` } as CSSProperties}
      >
        {card}
      </article>
    )
  }

  return (
    <section className="projects snap-section" id="projects" aria-labelledby="projects-title">
      <div className="projects__ambient" aria-hidden="true" />
      <div className="projects__grain" aria-hidden="true" />

      <div className="projects__intro">
        <h2 className="projects__title" id="projects-title">
          Projects
        </h2>
        <p className="projects__description">
          Wet-glass archive · hover to pause
        </p>
      </div>

      <div className="projects__rail" aria-label="Selected project cards">
        <div className="projects__shelf">
          <div className="projects__marquee-group" data-testid="projects-marquee-group">
            {projects.map((project, index) => renderProjectCard(project, index))}
          </div>
          <div
            className="projects__marquee-group"
            data-testid="projects-marquee-group"
            aria-hidden="true"
          >
            {projects.map((project, index) => renderProjectCard(project, index, true))}
          </div>
        </div>
      </div>

      <p className="projects__index">02 / 03</p>
    </section>
  )
}
