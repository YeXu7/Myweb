import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ProjectDetail } from './components/ProjectDetail'
import './styles/project-detail.css'

const root = document.getElementById('root')!
const projectIndex = Number(root.dataset.projectIndex ?? 0)

createRoot(root).render(
  <StrictMode><ProjectDetail projectIndex={projectIndex} /></StrictMode>,
)
