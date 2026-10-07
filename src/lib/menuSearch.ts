import type { MenuTreeNode } from '@/types/menu';
import { resolveMenuCaption } from '@/utils/resolveConfigCaption';

export type MenuTranslator = (key: string, fallback?: string) => string;

const combiningMarksRegex = /[\u0300-\u036f]/g;
const nonSearchCharRegex = /[^\p{L}\p{N}]+/gu;
const whitespaceRegex = /\s+/g;

function foldMenuSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(combiningMarksRegex, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .toLowerCase();
}

function normalizeMenuSearchText(value: string): string {
  return foldMenuSearchText(value)
    .replace(nonSearchCharRegex, ' ')
    .replace(whitespaceRegex, ' ')
    .trim();
}

function compactMenuSearchText(value: string): string {
  return value.replace(whitespaceRegex, '');
}

function hasMenuSearchMatch(searchText: string, searchTerm: string): boolean {
  if (!searchTerm) {
    return true;
  }

  if (searchText.includes(searchTerm)) {
    return true;
  }

  if (compactMenuSearchText(searchText).includes(compactMenuSearchText(searchTerm))) {
    return true;
  }

  const searchWords = searchTerm.split(whitespaceRegex).filter(Boolean);
  return searchWords.length > 1 && searchWords.every((word) => searchText.includes(word));
}

export function buildMenuNodeSearchText(node: MenuTreeNode, translate: MenuTranslator): string {
  const translatedName = resolveMenuCaption(node, translate);
  return [node.caption, node.name, node.code, translatedName]
    .map((value) => normalizeMenuSearchText(value))
    .filter((value) => value.length > 0)
    .join(' ');
}

export function menuNodeMatchesSearchTerm(
  node: MenuTreeNode,
  searchTerm: string,
  translate: MenuTranslator,
): boolean {
  const normalizedTerm = normalizeMenuSearchText(searchTerm);
  if (!normalizedTerm) {
    return true;
  }

  return hasMenuSearchMatch(buildMenuNodeSearchText(node, translate), normalizedTerm);
}

export function findAllPathsToMatchedMenuNodes(
  nodeList: MenuTreeNode[],
  searchTerm: string,
  translate: MenuTranslator,
  path: string[] = [],
): string[][] {
  const normalizedTerm = normalizeMenuSearchText(searchTerm);
  if (!normalizedTerm) {
    return [];
  }

  let result: string[][] = [];

  for (const node of nodeList) {
    const currentPath = [...path, node.id];
    const nodeMatch = menuNodeMatchesSearchTerm(node, normalizedTerm, translate);
    let childMatched = false;

    if (node.children && node.children.length > 0) {
      const childPaths = findAllPathsToMatchedMenuNodes(node.children, normalizedTerm, translate, currentPath);
      if (childPaths.length > 0) {
        result = result.concat(childPaths);
        childMatched = true;
      }
    }

    if (nodeMatch || childMatched) {
      result.push(currentPath);
    }
  }

  return result;
}

export function filterMenuTreeBySearchTerm(
  nodes: MenuTreeNode[],
  searchTerm: string,
  translate: MenuTranslator,
): MenuTreeNode[] {
  const normalizedTerm = normalizeMenuSearchText(searchTerm);
  if (!normalizedTerm) {
    return nodes;
  }

  const allPaths = findAllPathsToMatchedMenuNodes(nodes, normalizedTerm, translate, []);
  const idsToShow = new Set<string>();
  allPaths.forEach((path) => path.forEach((id) => idsToShow.add(id)));

  const filterNodes = (items: MenuTreeNode[]): MenuTreeNode[] =>
    items
      .filter((item) => idsToShow.has(item.id))
      .map((item) => ({
        ...item,
        children: item.children && item.children.length > 0 ? filterNodes(item.children) : item.children,
      }));

  return filterNodes(nodes);
}

export function splitHighlightedText(text: string, term: string): Array<{ text: string; highlighted: boolean }> {
  const normalizedTerm = normalizeMenuSearchText(term);
  if (!normalizedTerm) {
    return [{ text, highlighted: false }];
  }

  const normalizedText = foldMenuSearchText(text);
  const matchStart = normalizedText.indexOf(normalizedTerm);
  if (matchStart < 0) {
    return [{ text, highlighted: false }];
  }

  const matchEnd = matchStart + normalizedTerm.length;
  const parts = [
    { text: text.slice(0, matchStart), highlighted: false },
    { text: text.slice(matchStart, matchEnd), highlighted: true },
    { text: text.slice(matchEnd), highlighted: false },
  ];

  return parts
    .filter((part) => part.text.length > 0);
}
