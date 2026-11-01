import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { ProjectDetail } from './ProjectDetail'

it('renders all 16 case-study pages in order with their original aspect ratios', () => {
  render(<ProjectDetail />)
  const images = screen.getAllByRole('img')
  const heights = [1080, 3950, 1400, 1650, 3700, 2100, 2430, 5940, 1080, 2600, 1080, 2960, 1080, 2300, 4480, 1080]
  expect(images).toHaveLength(16)
  images.forEach((image, index) => {
    const page = String(index + 1).padStart(2, '0')
    expect(image.getAttribute('src')).toMatch(new RegExp(`/Myweb/project-details/lingji/01-${page}\\.(webp|png)$`))
    expect(image).toHaveAttribute('width', '1920')
    expect(image).toHaveAttribute('height', String(heights[index]))
    expect(image).toHaveAttribute('loading', index === 0 ? 'eager' : 'lazy')
    expect(image).toHaveAccessibleName(`灵机项目详情，第 ${index + 1} 页，共 16 页`)
  })
  expect(images[0]).toHaveAttribute('fetchpriority', 'high')
  expect(screen.getByRole('link', { name: '关闭项目详情' })).toHaveAttribute('href', '/Myweb/#project-01')
})


it.each([
  [1, '腾讯视频 OTT 端', 'ott', 13], [2, '如影', 'ruying', 23], [3, '即行', 'jixing', 16],
] as const)('renders complete ordered detail pages and return link for project %i', (projectIndex, title, slug, count) => {
  render(<ProjectDetail projectIndex={projectIndex} />)
  const images = screen.getAllByRole('img')
  expect(images).toHaveLength(count)
  images.forEach((image, index) => {
    const name = `0${projectIndex + 1}-${String(index + 1).padStart(2, '0')}`
    expect(image.getAttribute('src')).toContain(`/Myweb/project-details/${slug}/${name}.`)
    expect(image).toHaveAccessibleName(`${title}项目详情，第 ${index + 1} 页，共 ${count} 页`)
    const width = (projectIndex === 1 && index === 0) || (projectIndex === 2 && index === 18) ? 1920 : 3840
    expect(image).toHaveAttribute('width', String(width))
    expect(image).toHaveAttribute('loading', index === 0 ? 'eager' : 'lazy')
  })
  expect(screen.getByRole('link', { name: '关闭项目详情' })).toHaveAttribute('href', `/Myweb/#project-0${projectIndex + 1}`)
})

it('gives Lingji a visible overview and responsive framed images without a viewer', () => {
  const { container } = render(<ProjectDetail />)
  expect(screen.getByRole('heading', { level: 1, name: '灵机' })).toBeInTheDocument()
  expect(screen.getByText(/灵机是腾讯视频内部的 IP 资产管理平台/)).toBeInTheDocument()
  expect(container.querySelectorAll('.project-case__image')).toHaveLength(16)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /大图/ })).not.toBeInTheDocument()
  expect(container.querySelector('.project-case')).toBeInTheDocument()
})
it.each([
  [0, '灵机', 'ott', 16], [1, '腾讯视频 OTT 端', 'ruying', 13],
  [2, '如影', 'jixing', 23], [3, '即行', 'lingji', 16],
] as const)('uses the approved case layout and correct next/return destinations for project %i', (index, title, next, count) => {
  const { container } = render(<ProjectDetail projectIndex={index} />)
  expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: '作品概览 / Work overview' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: '项目详情 / Project gallery' })).toBeInTheDocument()
  expect(container.querySelectorAll('.project-case__image')).toHaveLength(count)
  expect(screen.getByRole('link', { name: /下一个项目/ })).toHaveAttribute('href', `/Myweb/projects/${next}/`)
  expect(screen.getByRole('link', { name: /返回作品集/ })).toHaveAttribute('href', `/Myweb/#project-0${index + 1}`)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
it('falls back to project one consistently for an invalid index', () => {
  render(<ProjectDetail projectIndex={-1} />)
  expect(screen.getByRole('heading', { level: 1, name: '灵机' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '关闭项目详情' })).toHaveAttribute('href', '/Myweb/#project-01')
})
