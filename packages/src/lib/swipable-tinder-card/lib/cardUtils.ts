export function calculateCardPosition(index: number, total: number) {
  const scale = 1 - (index * 0.05)
  const translateY = index * 10
  const zIndex = total - index
  
  return {
    scale,
    translateY,
    zIndex,
    transform: `scale(${scale}) translateY(${translateY}px)`,
  }
}