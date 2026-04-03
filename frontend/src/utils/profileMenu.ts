export function setupProfileMenuBehavior(menuSelector = '.profile-menu'): void {
  const menus = Array.from(document.querySelectorAll<HTMLDetailsElement>(menuSelector));
  if (!menus.length) {
    return;
  }

  const closeOpenMenus = (): void => {
    menus.forEach((menu) => {
      if (menu.open) {
        menu.removeAttribute('open');
      }
    });
  };

  document.addEventListener('click', (event) => {
    const target = event.target as Node | null;
    if (!target) {
      return;
    }

    menus.forEach((menu) => {
      if (menu.open && !menu.contains(target)) {
        menu.removeAttribute('open');
      }
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeOpenMenus();
    }
  });
}
