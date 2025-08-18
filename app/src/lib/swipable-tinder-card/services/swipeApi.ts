import { SwipeAction, SwipeableItem } from '../types/common'

export async function sendSwipeAction<T extends SwipeableItem>(
  item: T,
  action: SwipeAction
): Promise<void> {
  // API implementation placeholder
  console.log(`Swipe action: ${action} for item ${item.id}`)
}