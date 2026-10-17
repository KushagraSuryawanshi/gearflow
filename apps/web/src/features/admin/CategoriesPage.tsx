import { useState, type FormEvent } from 'react';
import { ConfirmAction } from '../../components/ConfirmAction';
import { Icon } from '../../components/Icon';
import { Alert, Dialog, EmptyState, ErrorState, Loading, PageHeading } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { useResource } from '../../lib/useResource';
import type { Category } from '../../types/api';

function CategoryForm({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Enter a category name.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      if (category) await api.updateCategory(category.id, name.trim());
      else await api.createCategory(name.trim());
      onSaved();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title={category ? 'Edit category' : 'Add category'} onClose={onClose} busy={busy}>
      <form onSubmit={(event) => void submit(event)}>
        <div className="dialog-body form-stack">
          <p className="muted">Use a clear name to help borrowers find the right equipment.</p>
          <label>
            Category name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Cameras"
              required
              disabled={busy}
              autoFocus
            />
          </label>
          {error && <Alert>{error}</Alert>}
        </div>
        <div className="dialog-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="button button-primary" disabled={busy}>
            {busy ? 'Saving…' : category ? 'Save changes' : 'Add category'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function CategoriesPage() {
  const { data, loading, error, reload } = useResource(api.categories);
  const [editing, setEditing] = useState<{ category: Category | null } | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <>
      <PageHeading
        eyebrow="MANAGE / ORGANISATION"
        title="Categories"
        description="A simple way to keep the equipment room easy to explore."
        actions={
          <button className="button button-primary" onClick={() => setEditing({ category: null })}>
            <Icon name="plus" size={18} />
            Add category
          </button>
        }
      />
      {notice && <Alert tone="success">{notice}</Alert>}
      <section className="panel">
        <div className="panel-heading">
          <h2>
            Equipment categories <span className="count-label">{data?.length ?? '—'}</span>
          </h2>
          <button className="button button-quiet button-small" onClick={reload} disabled={loading}>
            <Icon name="refresh" size={16} />
            Refresh
          </button>
        </div>
        {loading ? (
          <Loading label="Loading categories…" />
        ) : error ? (
          <ErrorState message={error} retry={reload} />
        ) : data?.length ? (
          <ul className="category-list">
            {data.map((category) => (
              <li key={category.id}>
                <span className="category-symbol">
                  <Icon name="categories" size={21} />
                </span>
                <div className="category-info">
                  <h3>{category.name}</h3>
                  <span className="mono">{category.id}</span>
                </div>
                <div className="row-actions">
                  <button
                    className="button button-quiet button-small"
                    onClick={() => setEditing({ category })}
                  >
                    <Icon name="edit" size={15} />
                    Edit<span className="sr-only"> {category.name}</span>
                  </button>
                  <button
                    className="icon-button danger-text"
                    aria-label={`Delete ${category.name}`}
                    onClick={() => setDeleting(category)}
                  >
                    <Icon name="trash" size={17} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Give the collection some structure">
            Create your first category before adding equipment.
          </EmptyState>
        )}
      </section>
      {editing && (
        <CategoryForm
          category={editing.category}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setNotice(editing.category ? 'Category updated.' : 'Category added.');
            setEditing(null);
            reload();
          }}
        />
      )}
      {deleting && (
        <ConfirmAction
          title="Delete this category?"
          label="Delete category"
          danger
          onClose={() => setDeleting(null)}
          action={() => api.deleteCategory(deleting.id)}
          onSuccess={() => {
            setDeleting(null);
            setNotice('Category deleted.');
            reload();
          }}
        >
          <p>
            <strong>{deleting.name}</strong> will be removed.
          </p>
          <p>
            If equipment still uses this category, the server may require you to reassign those
            items first.
          </p>
        </ConfirmAction>
      )}
    </>
  );
}
