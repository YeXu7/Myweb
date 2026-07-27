import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { DigitalGardenHero } from './components/DigitalGardenHero'
import { DigitalGardenScene } from './components/DigitalGardenScene'
import { GlobalNav } from './components/GlobalNav'
import { AboutMe } from './components/AboutMe'
import { ProjectHelix } from './components/ProjectHelix'

export default function App() {
  const shellRef = useRef<HTMLElement>(null)
  const [progress, setProgress] = useState(0)
  const activeSection = progress > 1.55 ? 'projects' : progress > 0.55 ? 'about' : 'home'
  const firstScreenProgress = Math.min(Math.max(progress, 0), 1)

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return

    let frame = 0
    const syncScrollState = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const pageHeight = Math.max(window.innerHeight, 1)
        setProgress(Math.min(Math.max(shell.scrollTop / pageHeight, 0), 2))
      })
    }

    syncScrollState()
    shell.addEventListener('scroll', syncScrollState, { passive: true })
    window.addEventListener('resize', syncScrollState)

    return () => {
      window.cancelAnimationFrame(frame)
      shell.removeEventListener('scroll', syncScrollState)
      window.removeEventListener('resize', syncScrollState)
    }
  }, [])

  return (
    <main
      ref={shellRef}
      className="site-shell"
      aria-label="Portfolio snap pages"
      style={
        {
          '--page-progress': progress,
          '--first-screen-progress': firstScreenProgress,
        } as CSSProperties
      }
    >
      <div className="shared-garden" aria-hidden="true">
        <DigitalGardenScene />
      </div>
      <GlobalNav activeSection={activeSection} />
      <DigitalGardenHero />
      <AboutMe />
      <ProjectHelix />
    </main>
  )
}
