/** Extend only the continuation; opening pace and the exit remain native. */
export function profileReadingContinuation(height: number, firstTravel: number, totalTravel: number) {
  return Math.ceil(Math.max(height, Math.max(0, totalTravel - firstTravel) / .65 + height * .3))
}
export function profileReadingState(top: number, cardHeight: number, windowHeight: number, complete: boolean) {
  return {
    present: !complete && top < windowHeight && top + cardHeight > 0,
    interactive: !complete && top >= windowHeight * .04 && top + cardHeight <= windowHeight * .96,
  }
}
