import { useEffect } from 'react';
import { Link } from './components/Link';
import { usePath } from './app/navigation';
import { SessionProvider } from './app/session';
import { ThemeProvider } from './app/ThemeProvider';
import { useSession } from './app/useSession';
import { Brand, Shell } from './app/Shell';
import { EmptyState, ErrorState, Loading } from './components/ui';
import { CategoriesPage } from './features/admin/CategoriesPage';
import { InventoryPage } from './features/admin/InventoryPage';
import { UsersPage } from './features/admin/UsersPage';
import { LoginPage } from './features/auth/LoginPage';
import { LoanDeskPage } from './features/bookings/LoanDeskPage';
import { MyBookingsPage } from './features/bookings/MyBookingsPage';
import { CataloguePage } from './features/equipment/CataloguePage';
import { EquipmentPage } from './features/equipment/EquipmentPage';
import type { User } from './types/api';

function Routes({ path, user }: { path: string; user: User }) {
  const fallback = (
    <Link className="button button-primary" href="/equipment">
      Back to equipment
    </Link>
  );
  if (
    (path.startsWith('/admin/') && user.role !== 'ADMIN') ||
    (['/requests', '/loans'].includes(path) && user.role === 'BORROWER')
  ) {
    return (
      <EmptyState title="This page needs a different role" action={fallback}>
        Your account does not have access to this area. You can still browse equipment and manage
        your own bookings.
      </EmptyState>
    );
  }
  if (path === '/' || path === '/equipment' || path === '/login') return <CataloguePage />;
  const match = /^\/equipment\/([^/]+)$/.exec(path);
  if (match?.[1]) {
    try {
      return <EquipmentPage key={match[1]} id={decodeURIComponent(match[1])} />;
    } catch {
      return (
        <EmptyState title="That equipment link is invalid" action={fallback}>
          Choose an item from the catalogue to continue.
        </EmptyState>
      );
    }
  }
  if (path === '/bookings') return <MyBookingsPage />;
  if (path === '/requests' || path === '/loans')
    return <LoanDeskPage key={path} mode={path === '/requests' ? 'requests' : 'loans'} />;
  if (path === '/admin/equipment') return <InventoryPage />;
  if (path === '/admin/categories') return <CategoriesPage />;
  if (path === '/admin/users') return <UsersPage />;
  return (
    <EmptyState title="This page is not in the equipment room" action={fallback}>
      The link may have changed. Head back to the collection to find what you need.
    </EmptyState>
  );
}

function AuthenticatedApp() {
  const { user, loading, error, refresh, signOut } = useSession();
  const path = usePath();
  useEffect(() => {
    const titles: Record<string, string> = {
      '/bookings': 'My bookings',
      '/requests': 'Pending requests',
      '/loans': 'Active loans',
      '/admin/equipment': 'Equipment management',
      '/admin/categories': 'Categories',
      '/admin/users': 'People & roles',
    };
    document.title = `${user ? (titles[path] ?? 'Equipment room') : 'Sign in'} · GearFlow`;
    document.getElementById('main-content')?.focus({ preventScroll: true });
  }, [path, user]);
  if (loading)
    return (
      <div className="session-screen">
        <Brand />
        <Loading label="Opening your workspace…" />
      </div>
    );
  if (error)
    return (
      <div className="session-screen">
        <Brand />
        <ErrorState message={error} retry={() => void refresh()} />
        <button className="text-button" onClick={signOut}>
          Return to sign in
        </button>
      </div>
    );
  if (!user) return <LoginPage />;
  return (
    <Shell user={user} path={path === '/' || path === '/login' ? '/equipment' : path}>
      <Routes path={path} user={user} />
    </Shell>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <SessionProvider>
        <AuthenticatedApp />
      </SessionProvider>
    </ThemeProvider>
  );
}
