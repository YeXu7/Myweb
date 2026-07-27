import { useEffect, useState } from 'react'
import { aboutContent } from '../garden/content'
import { PixelText } from './PixelText'

type AboutMeProps = {
  language?: 'en' | 'zh'
}

export function AboutMe({ language = 'en' }: AboutMeProps) {
  const content = aboutContent[language]
  const [ready, setReady] = useState(false)

  // 与 Hero 一致：进入视口区域后柔和入场，尊重减弱动效偏好
  useEffect(() => {
    if (
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      typeof IntersectionObserver === 'undefined'
    ) {
      setReady(true)
      return
    }
    const section = document.getElementById('about')
    if (!section) {
      setReady(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setReady(true)
          io.disconnect()
        }
      },
      { threshold: 0.35 },
    )
    io.observe(section)
    return () => io.disconnect()
  }, [])

  return (
    <section
      id="about"
      className={`about snap-section${ready ? ' is-ready' : ''}`}
      aria-labelledby="about-title"
    >
      <div className="about__ambient" aria-hidden="true" />
      <div className="about__grain" aria-hidden="true" />

      <p className="about__eyebrow">{content.eyebrow}</p>

      <div className="about__body">
        <div className="about__lead">
          <h2 className="about__title" id="about-title" aria-label={content.title}>
            <PixelText
              className="about__pixel"
              lines={[content.title]}
              cell={8}
              gap={0.1}
              color="#f6fcf8"
              opacity={0.7}
              ariaLabel={content.title}
            />
          </h2>
          <p className="about__statement">{content.statement}</p>
        </div>

        <dl className="about__meta">
          <div className="about__block">
            <dt className="about__block-label">{content.skillsLabel}</dt>
            <dd className="about__tags">
              {content.skills.map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </dd>
          </div>

          <div className="about__block">
            <dt className="about__block-label">{content.metaLabel}</dt>
            <dd className="about__metrics">
              {content.metrics.map((metric) => (
                <span className="about__metric" key={metric.label}>
                  <em>{metric.value}</em>
                  <small>{metric.label}</small>
                </span>
              ))}
            </dd>
          </div>

          <div className="about__block">
            <dt className="about__block-label">{content.contactLabel}</dt>
            <dd className="about__contact">
              <a href={`mailto:${content.email}`}>{content.email}</a>
              <span>{content.social}</span>
            </dd>
          </div>
        </dl>
      </div>

      <p className="about__index">{content.index}</p>
    </section>
  )
}
