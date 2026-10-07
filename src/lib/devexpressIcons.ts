const DEVEXPRESS_ICON_ALIASES: Record<string, string> = {
  barchart3: 'chart',
  bar_chart_3: 'chart',
  bar_chart: 'chart',
  database: 'database',
  building2: 'home',
  building: 'home',
  users: 'group',
  target: 'target',
  usercheck: 'user',
  user_check: 'user',
  user: 'user',
  banknote: 'money',
  key: 'key',
  creditcard: 'card',
  credit_card: 'card',
  warehouse: 'boxes',
  package: 'box',
  layers: 'layers',
  archive: 'save',
  grid: 'grid',
  ruler: 'ruler',
  settings: 'preferences',
  setting: 'preferences',
  filetext: 'doc',
  file_text: 'doc',
  bookopen: 'book',
  book: 'book',
  calculator: 'calc',
  shoppingcart: 'cart',
  shopping_cart: 'cart',
  trendingup: 'chart',
  trending_up: 'chart',
  receipt: 'file',
  home: 'home',
  file: 'file',
  wallet: 'money',
  menu: 'menu',
  dashboard: 'chart',
  repeat: 'refresh',
  download: 'download',
  upload: 'upload',
  shuffle: 'refresh',
  boxes: 'box',
  box: 'box',
  truck: 'truck',
  table: 'table',
  list: 'list',
  shield: 'shield',
  percent: 'percent',
  search: 'search',
  clear: 'clear',
  help: 'help',
  usergroup: 'group',
  group: 'group',
};

export function normalizeDevExtremeIconName(iconName?: string): string {
  const raw = String(iconName || '').trim().toLowerCase();
  if (!raw) return 'menu';
  const normalized = raw.replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');
  return DEVEXPRESS_ICON_ALIASES[normalized] ?? normalized;
}

export function getDevExtremeIconClass(iconName?: string): string {
  const name = normalizeDevExtremeIconName(iconName);
  return `dx-icon dx-icon-${name}`;
}
