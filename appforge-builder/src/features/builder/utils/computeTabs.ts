import type { CanvasElement } from '../../../store/useBuilderStore';
import { getModule } from '../../../modules/registry';

export interface TabInfo {
  index: number;
  label: string;
  icon: string;
}

/**
 * Compute the list of navigation tabs from canvas elements.
 * The first element encountered with a given tabIndex defines
 * the label and icon for that tab.
 */
export function computeTabs(elements: CanvasElement[]): TabInfo[] {
  const tabMap = new Map<number, { label: string; icon: string }>();
  for (const el of elements) {
    if (el.tabIndex != null && !tabMap.has(el.tabIndex)) {
      tabMap.set(el.tabIndex, {
        label: el.tabLabel || getModule(el.moduleId)?.name || `Tab ${el.tabIndex + 1}`,
        icon: el.tabIcon || 'circle',
      });
    }
  }
  return Array.from(tabMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([index, data]) => ({ index, ...data }));
}
