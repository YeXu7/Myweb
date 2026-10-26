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
  expect(screen.getByRole('link', { name: '返回' })).toHaveAttribute('href', '/Myweb/#project-01')
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
  expect(screen.getByRole('link', { name: '返回' })).toHaveAttribute('href', `/Myweb/#project-0${projectIndex + 1}`)
})
