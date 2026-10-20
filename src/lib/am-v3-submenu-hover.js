/* AMnote DevExtreme navigation with cascading submenus.
   Reuse the real tree rows for expansion and navigation; never copy route data. */
(() => {
  const rootSelector = '.am-sidebar-tree-expanded';
  const panels = [];
  let internalAction = false;
  let closeTimer;
  let refreshFrame;
  let observedTree;
  let wasSearching = false;
  let pointer;
  const sentence = (text) => {
    const value = text.trim().toLocaleLowerCase();
    return value.replace(/\p{L}/u, (letter) => letter.toLocaleUpperCase());
  };
  const direct = (element, selector) => Array.from(element.children).find((child) => child.matches(selector));
  const rowOf = (node) => direct(node, '.dx-treeview-item');
  const childrenOf = (node) => {
    const group = direct(node, '.dx-treeview-node-container');
    return group ? Array.from(group.children).filter((child) => child.matches('.dx-treeview-node')) : [];
  };
  const labelOf = (node) => sentence(rowOf(node)?.querySelector('.am-sidebar-tree-item-text')?.textContent || node.getAttribute('aria-label') || '');
  const hasChildren = (node) => Boolean(rowOf(node)?.querySelector('.dx-treeview-toggle-item-visibility'));
  const isDisabled = (node) => node.getAttribute('aria-disabled') === 'true' || rowOf(node)?.classList.contains('dx-state-disabled');
  const currentNode = (node) => node.isConnected ? node : Array.from(observedTree?.querySelectorAll('.dx-treeview-node') || []).find((candidate) => candidate.getAttribute('data-item-id') === node.getAttribute('data-item-id'));
  const isSearching = () => Boolean(document.querySelector('.menu-search-wrapper input')?.value.trim());
  const collapseSiblings = (node) => {
    if (isSearching() || !node?.parentElement) return;
    for (const sibling of Array.from(node.parentElement.children)) {
      if (sibling === node || !sibling.matches('.dx-treeview-node[aria-expanded="true"]')) continue;
      internalAction = true;
      try { rowOf(sibling)?.querySelector('.dx-treeview-toggle-item-visibility')?.click(); }
      finally { internalAction = false; }
    }
  };
  const normalizeExpandedGroups = (tree) => {
    if (isSearching()) return;
    for (const group of tree.querySelectorAll('.dx-treeview-node-container')) {
      const expanded = Array.from(group.children).filter((node) => node.matches('.dx-treeview-node[aria-expanded="true"]'));
      if (expanded.length < 2) continue;
      const active = expanded.find((node) => rowOf(node)?.querySelector('.am-sidebar-tree-item-active'));
      collapseSiblings(active || expanded[expanded.length - 1]);
    }
  };
  const cancelClose = () => window.clearTimeout(closeTimer);
  const closeFrom = (depth = 0) => {
    cancelClose();
    while (panels.length > depth) {
      const panel = panels.pop();
      panel.anchor.removeAttribute('data-submenu-open');
      if (panel.anchor.getAttribute('role') === 'menuitem') panel.anchor.setAttribute('aria-expanded', 'false');
      panel.element.remove();
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer = window.setTimeout(() => closeFrom(), 180);
  };
  const activateOriginal = (node) => {
    node = currentNode(node);
    if (!node) return;
    if (isDisabled(node)) return;
    internalAction = true;
    try { rowOf(node)?.click(); } finally { internalAction = false; }
    closeFrom();
  };
  const positionPanel = (panel) => {
    const bounds = panel.anchor.getBoundingClientRect();
    const host = panel.depth === 0
      ? observedTree?.closest('.flex.flex-col.border-r')
      : panels[panel.depth - 1]?.element;
    const edge = host?.getBoundingClientRect() || bounds;
    const width = panel.element.getBoundingClientRect().width;
    let left = edge.right + 6;
    if (left + width > window.innerWidth - 8) left = Math.max(8, edge.left - width - 6);
    const height = panel.element.getBoundingClientRect().height;
    const top = Math.max(8, Math.min(bounds.top - 2, window.innerHeight - height - 8));
    panel.element.style.left = `${left}px`;
    panel.element.style.top = `${top}px`;
  };
  const renderPanel = (panel) => {
    const nodes = childrenOf(panel.source);
    const signature = nodes.map((node) => [node.getAttribute('data-item-id'), labelOf(node), hasChildren(node), isDisabled(node), Boolean(rowOf(node)?.querySelector('.am-sidebar-tree-item-active'))].join('|')).join('\n');
    if (signature === panel.signature) { positionPanel(panel); return; }
    panel.signature = signature;
    panel.element.replaceChildren();
    panel.element.setAttribute('aria-busy', nodes.length ? 'false' : 'true');
    if (!nodes.length) {
      const skeleton = document.createElement('div');
      skeleton.className = 'am-cascade__loading';
      skeleton.setAttribute('aria-label', 'Loading menu');
      panel.element.append(skeleton);
    }
    nodes.forEach((node) => {
      const branch = hasChildren(node);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'am-cascade__item';
      button.dataset.sourceId = node.getAttribute('data-item-id');
      button.setAttribute('role', 'menuitem');
      button.disabled = isDisabled(node);
      if (rowOf(node)?.querySelector('.am-sidebar-tree-item-active')) button.classList.add('am-cascade__item--active');
      const label = document.createElement('span');
      label.className = 'am-cascade__label';
      label.textContent = labelOf(node);
      button.append(label);
      if (branch) {
        button.setAttribute('aria-haspopup', 'menu');
        button.setAttribute('aria-expanded', 'false');
        const arrow = document.createElement('span');
        arrow.className = 'am-cascade__arrow';
        arrow.setAttribute('aria-hidden', 'true');
        button.append(arrow);
      }
      button.addEventListener('pointerenter', () => {
        cancelClose();
        if (branch && !button.disabled) open(node, button, panel.depth + 1);
        else closeFrom(panel.depth + 1);
      });
      button.addEventListener('click', () => {
        if (branch) open(node, button, panel.depth + 1);
        else activateOriginal(node);
      });
      button.addEventListener('keydown', (event) => {
        const buttons = Array.from(panel.element.querySelectorAll('button:not(:disabled)'));
        const index = buttons.indexOf(button);
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          buttons[(index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length]?.focus();
        } else if (event.key === 'ArrowRight' && branch) {
          event.preventDefault();
          open(node, button, panel.depth + 1, true);
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          const anchor = panel.anchor;
          closeFrom(panel.depth);
          anchor.focus();
        }
      });
      panel.element.append(button);
    });
    positionPanel(panel);
  };
  function open(source, anchor, depth = 0, focus = false) {
    cancelClose();
    source = currentNode(source);
    if (!source || isDisabled(source)) return;
    collapseSiblings(source);
    if (panels[depth]?.source === source) {
      if (focus) panels[depth].element.querySelector('button:not(:disabled)')?.focus();
      return;
    }
    closeFrom(depth);
    if (source.getAttribute('aria-expanded') !== 'true') {
      internalAction = true;
      try { rowOf(source)?.querySelector('.dx-treeview-toggle-item-visibility')?.click(); }
      finally { internalAction = false; }
    }
    const element = document.createElement('div');
    element.className = 'am-cascade';
    element.setAttribute('role', 'menu');
    element.setAttribute('aria-label', labelOf(source));
    element.id = `am-cascade-${depth}`;
    element.addEventListener('pointerenter', cancelClose);
    element.addEventListener('pointerleave', scheduleClose);
    element.addEventListener('focusout', (event) => {
      if (!event.relatedTarget?.closest('.am-cascade, .am-sidebar-tree-expanded')) scheduleClose();
    });
    document.body.append(element);
    anchor.setAttribute('data-submenu-open', 'true');
    if (anchor.getAttribute('role') === 'menuitem') {
      anchor.setAttribute('aria-expanded', 'true');
      anchor.setAttribute('aria-controls', element.id);
    }
    const panel = { source, sourceId: source.getAttribute('data-item-id'), anchor, depth, element, signature: null };
    panels.push(panel);
    renderPanel(panel);
    if (focus) element.querySelector('button:not(:disabled)')?.focus();
  }
  const refresh = () => {
    const tree = document.querySelector(rootSelector);
    const treeChanged = tree !== observedTree;
    if (tree !== observedTree) {
      closeFrom();
      observedTree = tree;
    }
    if (tree) {
      const searching = isSearching();
      tree.classList.toggle('am-cascade-enabled', !searching);
      if (searching) closeFrom();
      else if (treeChanged || wasSearching) normalizeExpandedGroups(tree);
      wasSearching = searching;
    }
    for (const panel of panels) {
      if (!panel.source.isConnected) {
        const replacement = Array.from(tree?.querySelectorAll('.dx-treeview-node') || []).find((node) => node.getAttribute('data-item-id') === panel.sourceId);
        if (!replacement) { closeFrom(panel.depth); break; }
        panel.source = replacement;
        if (panel.depth === 0) panel.anchor = rowOf(replacement);
      }
      if (!panel.anchor.isConnected) {
        const parent = panels[panel.depth - 1];
        panel.anchor = Array.from(parent?.element.querySelectorAll('button') || []).find((button) => button.dataset.sourceId === panel.sourceId);
        if (!panel.anchor) { closeFrom(panel.depth); break; }
      }
      panel.anchor.setAttribute('data-submenu-open', 'true');
      renderPanel(panel);
    }
    const pointed = pointer && document.elementFromPoint(pointer.x, pointer.y);
    if (pointed?.closest('.am-cascade, .am-sidebar-tree-expanded')) cancelClose();
  };
  const observer = new MutationObserver((records) => {
    // Last newly opened node in each group wins, including keyboard expansion.
    const openedGroups = new Map();
    for (const record of records) {
      if (record.type !== 'attributes' || record.attributeName !== 'aria-expanded' || record.oldValue === 'true') continue;
      const node = record.target;
      if (node.matches('.dx-treeview-node[aria-expanded="true"]') && node.closest(rootSelector)) openedGroups.set(node.parentElement, node);
    }
    for (const node of openedGroups.values()) collapseSiblings(node);
    if (!records.some((record) => record.target instanceof Element && !record.target.closest('.am-cascade'))) return;
    window.cancelAnimationFrame(refreshFrame);
    refreshFrame = window.requestAnimationFrame(refresh);
  });
  observer.observe(document.getElementById('root') || document.body, {
    childList: true, subtree: true, characterData: true,
    attributes: true, attributeFilter: ['aria-expanded'], attributeOldValue: true,
  });
  document.addEventListener('pointerover', (event) => {
    pointer = { x: event.clientX, y: event.clientY };
    if (!(event.target instanceof Element)) return;
    const row = event.target.closest(`${rootSelector} .dx-treeview-item`);
    if (!row || !observedTree?.classList.contains('am-cascade-enabled')) return;
    cancelClose();
    const node = row.parentElement;
    if (node === event.relatedTarget?.closest?.('.dx-treeview-node')) return;
    if (Number(node.getAttribute('aria-level')) >= 2 && hasChildren(node)) open(node, row);
    else closeFrom();
  });
  document.addEventListener('pointerout', (event) => {
    if (!(event.target instanceof Element) || !event.target.closest(rootSelector)) return;
    if (!event.relatedTarget && !event.target.isConnected) return;
    if (!event.relatedTarget?.closest?.(`${rootSelector}, .am-cascade`)) scheduleClose();
  });
  document.addEventListener('click', (event) => {
    if (internalAction || !(event.target instanceof Element)) return;
    const row = event.target.closest(`${rootSelector} .dx-treeview-item`);
    const node = row?.parentElement;
    if (node && hasChildren(node) && !isDisabled(node) && node.getAttribute('aria-expanded') !== 'true') collapseSiblings(node);
    if (node && observedTree?.classList.contains('am-cascade-enabled') && Number(node.getAttribute('aria-level')) >= 2 && hasChildren(node) && !isDisabled(node)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      open(node, row);
    } else if (!event.target.closest('.am-cascade')) closeFrom();
  }, true);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panels.length) {
      const anchor = panels[0].anchor;
      closeFrom();
      anchor.setAttribute('tabindex', '-1');
      anchor.focus();
    }
    if (event.key === 'ArrowRight' && event.target instanceof Element) {
      const node = event.target.closest(`${rootSelector} .dx-treeview-node`);
      if (node && observedTree?.classList.contains('am-cascade-enabled') && Number(node.getAttribute('aria-level')) >= 2 && hasChildren(node)) {
        event.preventDefault();
        open(node, rowOf(node), 0, true);
      }
    }
  });
  window.addEventListener('resize', () => closeFrom());
  document.addEventListener('input', (event) => {
    if (event.target instanceof Element && event.target.closest('.menu-search-wrapper')) refresh();
  });
  document.addEventListener('wheel', (event) => {
    if (event.target instanceof Element && event.target.closest(rootSelector)) closeFrom();
  }, { passive: true });
  refresh();
})();
