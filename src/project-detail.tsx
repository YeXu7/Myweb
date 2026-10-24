import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ProjectDetail } from './components/ProjectDetail'
import './styles/project-detail.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode><ProjectDetail /></StrictMode>,
)
