export const DIVIDER = "—————————————————————";

export function formatList(items: string[], prefix: string = '•') {
  return items.map(item => `${prefix} ${item}`).join('\n');
}
