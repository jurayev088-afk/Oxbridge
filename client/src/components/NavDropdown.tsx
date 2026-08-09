import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, type LucideIcon } from 'lucide-react';

export interface NavDropdownItem {
  label: string;
  to: string;
}

interface NavDropdownProps {
  label: string;
  icon: LucideIcon;
  items: NavDropdownItem[];
  activePaths?: string[];
}

interface MenuPosition {
  top: number;
  left: number;
  minWidth: number;
}

export function NavDropdown({ label, icon: Icon, items, activePaths = [] }: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const isActive =
    activePaths.some((path) => location.pathname.startsWith(path)) ||
    items.some((item) => {
      const [pathname] = item.to.split(/[#?]/);
      return location.pathname === pathname;
    });

  function updateMenuPosition() {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMenuStyle({
      top: rect.bottom + 6,
      left: rect.left,
      minWidth: Math.max(rect.width, 220),
    });
  }

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (!open) return;

    updateMenuPosition();

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    function handleReposition() {
      updateMenuPosition();
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`nav-dropdown ${open ? 'open' : ''}`}>
      <button
        ref={buttonRef}
        type="button"
        className={`nav-item ${isActive ? 'active' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Icon size={15} />
        <span>{label}</span>
        <ChevronDown size={12} className={`nav-dropdown-chevron ${open ? 'open' : ''}`} />
      </button>

      {open && menuStyle &&
        createPortal(
          <div
            ref={menuRef}
            className="nav-dropdown-menu nav-dropdown-menu-portal"
            style={{
              top: menuStyle.top,
              left: menuStyle.left,
              minWidth: menuStyle.minWidth,
            }}
            role="menu"
          >
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="nav-dropdown-item"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
