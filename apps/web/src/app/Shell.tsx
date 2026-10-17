import { useState, type ReactNode } from 'react';
import type { User } from '../types/api';
import { initials } from '../lib/booking';
import { Dialog } from '../components/ui';
import { Icon, type IconName } from '../components/Icon';
import { Link } from '../components/Link';
import { ThemeToggle } from '../components/ThemeToggle';
import { useSession } from './useSession';

export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
      </span>
      <span>
        gearflow<span className="brand-period">.</span>
      </span>
    </span>
  );
}

function Navigation({ user, path, close }: { user: User; path: string; close?: () => void }) {
  function item(href: string, label: string, icon: IconName) {
    const active = path === href || (href === '/equipment' && path.startsWith('/equipment/'));
    return (
      <Link
        key={href}
        href={href}
        className={`nav-link${active ? ' active' : ''}`}
        aria-current={active ? 'page' : undefined}
        onClick={close}
      >
        <Icon name={icon} />
        <span>{label}</span>
        {active && <span className="nav-active-dot" />}
      </Link>
    );
  }
  return (
    <nav aria-label="Main navigation">
      <p className="nav-label">Your workspace</p>
      {item('/equipment', 'Equipment', 'equipment')}
      {item('/bookings', 'My bookings', 'calendar')}
      {user.role !== 'BORROWER' && (
        <>
          <p className="nav-label">Loan desk</p>
          {item('/requests', 'Pending requests', 'requests')}
          {item('/loans', 'Active loans', 'loans')}
        </>
      )}
      {user.role === 'ADMIN' && (
        <>
          <p className="nav-label">Manage</p>
          {item('/admin/equipment', 'Equipment', 'equipment')}
          {item('/admin/categories', 'Categories', 'categories')}
          {item('/admin/users', 'People & roles', 'users')}
        </>
      )}
    </nav>
  );
}

export function Shell({ user, path, children }: { user: User; path: string; children: ReactNode }) {
  const { signOut } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const role =
    user.role === 'ADMIN' ? 'Administrator' : user.role === 'STAFF' ? 'Staff' : 'Borrower';
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link href="/equipment" className="brand-link" aria-label="GearFlow equipment catalogue">
          <Brand />
        </Link>
        <div className="workspace-label">THE EQUIPMENT ROOM</div>
        <Navigation user={user} path={path} />
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="small-dot" />
            Shared equipment. Kept in order.
          </div>
          <div className="account">
            <span className="avatar">{initials(user.name)}</span>
            <div>
              <strong>{user.name}</strong>
              <small>{role}</small>
            </div>
            <button
              className="icon-button"
              onClick={signOut}
              aria-label="Sign out"
              title="Sign out"
            >
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="workspace-bar">
          <div className="mobile-brand">
            <Brand />
          </div>
          <button
            className="icon-button mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMenuOpen(true)}
          >
            <Icon name="menu" />
          </button>
          <span className="workspace-breadcrumb">
            GearFlow <span>/</span> Shared equipment
          </span>
          <div className="workspace-user">
            <ThemeToggle />
            <span className="role-chip">{role}</span>
            <span className="avatar avatar-small">{initials(user.name)}</span>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} key={user.id}>
          {children}
        </main>
        <footer className="workspace-footer">
          <span>GearFlow equipment booking</span>
          <span>Borrow. Use. Return.</span>
        </footer>
      </div>
      {menuOpen && (
        <Dialog title="Your workspace" onClose={() => setMenuOpen(false)}>
          <div className="mobile-navigation">
            <Navigation user={user} path={path} close={() => setMenuOpen(false)} />
            <div className="mobile-account">
              <strong>{user.name}</strong>
              <span>{user.email}</span>
              <button
                className="button button-secondary"
                onClick={() => {
                  setMenuOpen(false);
                  signOut();
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
