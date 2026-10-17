import { useState } from 'react';
import { Link } from '../../components/Link';
import { ConfirmAction } from '../../components/ConfirmAction';
import { Icon } from '../../components/Icon';
import {
  Alert,
  EmptyState,
  EquipmentBadge,
  ErrorState,
  Loading,
  PageHeading,
} from '../../components/ui';
import { api } from '../../lib/api';
import { useResource } from '../../lib/useResource';
import type { Equipment } from '../../types/api';
import { EquipmentForm } from './EquipmentForm';

const loadInventory = async (signal: AbortSignal) => {
  const [equipment, categories] = await Promise.all([
    api.equipment(signal),
    api.categories(signal),
  ]);
  return { equipment, categories };
};

export function InventoryPage() {
  const { data, loading, error, reload } = useResource(loadInventory);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [editing, setEditing] = useState<{ equipment: Equipment | null } | null>(null);
  const [deleting, setDeleting] = useState<Equipment | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const items = (data?.equipment ?? []).filter(
    (item) =>
      (!category || item.category.id === category) &&
      item.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="MANAGE / INVENTORY"
        title="Equipment management"
        description="One record for every physical item. Keep the collection accurate and ready to borrow."
        actions={
          <button
            className="button button-primary"
            onClick={() => setEditing({ equipment: null })}
            disabled={loading || !data || !!error}
          >
            <Icon name="plus" size={18} />
            Add equipment
          </button>
        }
      />
      {notice && <Alert tone="success">{notice}</Alert>}
      <section className="panel">
        <div className="panel-toolbar">
          <label className="search-field">
            <Icon name="search" size={18} />
            <span className="sr-only">Search inventory</span>
            <input
              type="search"
              placeholder="Search equipment by name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="toolbar-actions">
            <label>
              <span className="sr-only">Category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="">All categories</option>
                {data?.categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="icon-button"
              onClick={reload}
              disabled={loading}
              aria-label="Refresh inventory"
            >
              <Icon name="refresh" size={18} />
            </button>
          </div>
        </div>
        {loading ? (
          <Loading label="Loading inventory…" />
        ) : error ? (
          <ErrorState message={error} retry={reload} />
        ) : items.length ? (
          <div className="table-scroll" tabIndex={0} role="region" aria-label="Equipment inventory">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Equipment</th>
                  <th>Category</th>
                  <th>Availability</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link
                        className="table-title"
                        href={`/equipment/${encodeURIComponent(item.id)}`}
                      >
                        {item.name}
                      </Link>
                      <small className="mono">{item.id}</small>
                    </td>
                    <td>{item.category.name}</td>
                    <td>
                      <EquipmentBadge maintenance={item.status === 'UNDER_MAINTENANCE'} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="button button-quiet button-small"
                          onClick={() => setEditing({ equipment: item })}
                        >
                          <Icon name="edit" size={15} />
                          Edit<span className="sr-only"> {item.name}</span>
                        </button>
                        <button
                          className="icon-button danger-text"
                          onClick={() => setDeleting(item)}
                          aria-label={`Delete ${item.name}`}
                        >
                          <Icon name="trash" size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={search || category ? 'No matching equipment' : 'Start building the collection'}
          >
            {search || category
              ? 'Try another name or category.'
              : 'Add a category, then add a separate record for each physical item.'}
          </EmptyState>
        )}
      </section>
      <p className="page-footnote">
        <Icon name="info" size={16} />
        Open an equipment record to manage maintenance and view its booking history.
      </p>
      {editing && data && (
        <EquipmentForm
          equipment={editing.equipment}
          categories={data.categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setNotice(
              editing.equipment
                ? 'Equipment details updated.'
                : 'Equipment added to the collection.',
            );
            setEditing(null);
            reload();
          }}
        />
      )}
      {deleting && (
        <ConfirmAction
          title="Delete this equipment?"
          label="Delete equipment"
          danger
          onClose={() => setDeleting(null)}
          action={() => api.deleteEquipment(deleting.id)}
          onSuccess={() => {
            setDeleting(null);
            setNotice('Equipment deleted.');
            reload();
          }}
        >
          <p>
            <strong>{deleting.name}</strong> will be removed from the collection.
          </p>
          <p>
            This cannot be undone. The server may prevent deletion if the equipment has related
            bookings.
          </p>
        </ConfirmAction>
      )}
    </>
  );
}
