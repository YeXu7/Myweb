/** Leave room for About to enter the lower viewport after the reading mask clears. */
export const aboutLeadScreens = .45
export const homeExitPosition = (aboutTop: number, height: number) => Math.max(0, aboutTop - Math.max(1, height) * aboutLeadScreens)

export function chapterAt(scroll: number, homeEnd: number, projectsTop: number) {
  return scroll < homeEnd ? 'home' : scroll < projectsTop ? 'about' : 'projects'
}


/** Last keywords have reached the upper third before the garden begins to soften. */
export const capabilitiesBlurStart = (contentBottom: number, height: number) => Math.max(0, contentBottom - Math.max(1, height) / 3)
