type GlobalNavProps = {
  activeSection: 'home' | 'about' | 'projects'
}

export function GlobalNav({ activeSection }: GlobalNavProps) {
  return (
    <header className="hero__header global-nav">
      <nav className="hero__nav" aria-label="Primary navigation">
        <a
          className={`hero__nav-item${activeSection === 'home' ? ' hero__nav-item--active' : ''}`}
          href="#top"
        >
          Home
        </a>
        <a
          className={`hero__nav-item${activeSection === 'about' ? ' hero__nav-item--active' : ''}`}
          href="#about"
        >
          About
        </a>
        <a
          className={`hero__nav-item${activeSection === 'projects' ? ' hero__nav-item--active' : ''}`}
          href="#projects"
        >
          Projects
        </a>
      </nav>
    </header>
  )
}
