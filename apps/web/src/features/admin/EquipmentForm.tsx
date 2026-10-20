import { useState, type FormEvent } from 'react';
import { Link } from '../../components/Link';
import { Alert, Dialog } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import type { Category, Equipment } from '../../types/api';

export function EquipmentForm({
  equipment,
  categories,
  onClose,
  onSaved,
}: {
  equipment: Equipment | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(equipment?.name ?? '');
  const [description, setDescription] = useState(equipment?.description ?? '');
  const [categoryId, setCategoryId] = useState(equipment?.category.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !categoryId) {
      setError('Enter an equipment name and choose a category.');
      return;
    }
    setBusy(true);
    setError(null);
    const body = { name: name.trim(), description: description.trim(), categoryId };
    try {
      if (equipment) await api.updateEquipment(equipment.id, body);
      else await api.createEquipment(body);
      onSaved();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title={equipment ? 'Edit equipment' : 'Add equipment'} onClose={onClose} busy={busy}>
      <form onSubmit={(event) => void submit(event)}>
        <div className="dialog-body form-stack">
          <label>
            Equipment name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Canon EOS R6 #001"
              maxLength={100}
              required
              disabled={busy}
              autoFocus
            />
          </label>
          <label>
            Category
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              required
              disabled={busy}
            >
              <option value="" disabled>
                Choose a category
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          {!categories.length && (
            <Alert tone="info">
              Add a category before adding equipment.{' '}
              <Link href="/admin/categories" onClick={onClose}>
                Manage categories
              </Link>
            </Alert>
          )}
          <label>
            Description <span className="optional">Optional</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What should a borrower know about this item?"
              rows={4}
              maxLength={500}
              disabled={busy}
            />
          </label>
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
          <button className="button button-primary" disabled={busy || !categories.length}>
            {busy ? 'Saving…' : equipment ? 'Save changes' : 'Add equipment'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
