import { useState, type FormEvent } from 'react';
import { navigate } from '../../app/navigation';
import { useSession } from '../../app/useSession';
import { Icon } from '../../components/Icon';
import { Alert, Dialog, EmptyState, ErrorState, Loading, PageHeading } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { initials } from '../../lib/booking';
import { useResource } from '../../lib/useResource';
import type { Role, User } from '../../types/api';

const roleNames: Record<Role, string> = {
  BORROWER: 'Borrower',
  STAFF: 'Staff',
  ADMIN: 'Administrator',
};
const roleDescriptions: Record<Role, string> = {
  BORROWER: 'Browse equipment and manage their own bookings.',
  STAFF: 'Borrow equipment, review requests, record handovers and manage maintenance.',
  ADMIN: 'All staff permissions, plus equipment, category and user role management.',
};

function RoleForm({
  person,
  currentUser,
  onClose,
  onSaved,
}: {
  person: User;
  currentUser: User;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [role, setRole] = useState<Role>(person.role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.updateRole(person.id, role);
      await onSaved();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title="Change account role" onClose={onClose} busy={busy}>
      <form onSubmit={(event) => void submit(event)}>
        <div className="dialog-body form-stack">
          <div className="confirmation-summary">
            <strong>{person.name}</strong>
            <span>{person.email}</span>
          </div>
          <label>
            Role
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
              disabled={busy}
            >
              {(Object.keys(roleNames) as Role[]).map((value) => (
                <option value={value} key={value}>
                  {roleNames[value]}
                </option>
              ))}
            </select>
          </label>
          <p className="muted">{roleDescriptions[role]}</p>
          {person.id === currentUser.id && role !== 'ADMIN' && (
            <Alert tone="info">
              This is your own account. Changing its role will remove your access to administration
              pages.
            </Alert>
          )}
          {error && <Alert>{error}</Alert>}
        </div>
        <div className="dialog-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="button button-primary" disabled={busy || role === person.role}>
            {busy ? 'Saving…' : 'Save role'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function UsersPage() {
  const { user, refresh } = useSession();
  const { data, loading, error, reload } = useResource(api.users);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [editing, setEditing] = useState<User | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const items = (data ?? []).filter(
    (person) =>
      (!role || person.role === role) &&
      `${person.name} ${person.email}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="ACCESS"
        title="People & roles"
        description="Give each person the access they need to use and manage the equipment room."
      />
      {notice && <Alert tone="success">{notice}</Alert>}
      <section className="panel">
        <div className="panel-toolbar">
          <label className="search-field">
            <Icon name="search" size={18} />
            <span className="sr-only">Search people</span>
            <input
              type="search"
              placeholder="Search by name or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="toolbar-actions">
            <label>
              <span className="sr-only">Filter by role</span>
              <select value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="">All roles</option>
                {(Object.keys(roleNames) as Role[]).map((value) => (
                  <option value={value} key={value}>
                    {roleNames[value]}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="icon-button"
              onClick={reload}
              disabled={loading}
              aria-label="Refresh people"
            >
              <Icon name="refresh" size={18} />
            </button>
          </div>
        </div>
        {loading ? (
          <Loading label="Loading people…" />
        ) : error ? (
          <ErrorState message={error} retry={reload} />
        ) : items.length ? (
          <div className="table-scroll" tabIndex={0} role="region" aria-label="People and roles">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Role</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((person) => (
                  <tr key={person.id}>
                    <td data-label="Person">
                      <div className="person-cell">
                        <span className="avatar">{initials(person.name)}</span>
                        <div>
                          <strong>
                            {person.name}
                            {person.id === user?.id && <span className="you-label">You</span>}
                          </strong>
                          <small>{person.email}</small>
                        </div>
                      </div>
                    </td>
                    <td data-label="Role">
                      <span className={`user-role role-${person.role.toLowerCase()}`}>
                        {roleNames[person.role]}
                      </span>
                    </td>
                    <td data-label="Actions">
                      <div className="row-actions">
                        <button
                          className="button button-secondary button-small"
                          onClick={() => setEditing(person)}
                        >
                          Change role<span className="sr-only"> for {person.name}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No people match this view">
            Try another name, email address or role.
          </EmptyState>
        )}
      </section>
      <div className="role-guide">
        {(Object.keys(roleNames) as Role[]).map((value) => (
          <div key={value}>
            <h2>{roleNames[value]}</h2>
            <p>{roleDescriptions[value]}</p>
          </div>
        ))}
      </div>
      {editing && user && (
        <RoleForm
          person={editing}
          currentUser={user}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            const ownAccount = editing.id === user.id;
            setEditing(null);
            setNotice('Account role updated.');
            if (ownAccount) {
              navigate('/equipment');
              await refresh();
            } else reload();
          }}
        />
      )}
    </>
  );
}
