import { useState } from 'react';
import { Link } from '../../components/Link';
import { Icon } from '../../components/Icon';
import { EquipmentArt } from '../../components/EquipmentArt';
import { EmptyState, EquipmentBadge, ErrorState, Loading, PageHeading } from '../../components/ui';
import { api } from '../../lib/api';
import { useResource } from '../../lib/useResource';

const loadCatalogue = async (signal: AbortSignal) => {
  const [equipment, categories] = await Promise.all([
    api.equipment(signal),
    api.categories(signal),
  ]);
  return { equipment, categories };
};

export function CataloguePage() {
  const { data, loading, error, reload } = useResource(loadCatalogue);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const items =
    data?.equipment.filter(
      (item) =>
        (!category || item.category.id === category) &&
        (!availableOnly || item.status === 'AVAILABLE') &&
        `${item.name} ${item.description ?? ''} ${item.category.name}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
    ) ?? [];
  function clearFilters() {
    setSearch('');
    setCategory('');
    setAvailableOnly(false);
  }
  return (
    <>
      <div className="catalogue-heading">
        <PageHeading
          eyebrow="EQUIPMENT"
          title="Find your next piece of kit."
          description="Shared equipment, ready when you are."
          actions={
            <Link className="button button-secondary" href="/bookings">
              My bookings
              <Icon name="arrow" size={17} />
            </Link>
          }
        />
        <div className="collection-index">
          <strong>{data ? String(data.equipment.length).padStart(2, '0') : '--'}</strong>
          <span>
            items
            <br />
            in circulation
          </span>
        </div>
      </div>
      <section aria-label="Equipment catalogue">
        <div className="catalogue-toolbar">
          <label className="search-field">
            <Icon name="search" />
            <span className="sr-only">Search equipment</span>
            <input
              type="search"
              placeholder="Search the equipment room"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="select-field">
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
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(event) => setAvailableOnly(event.target.checked)}
            />
            Open for requests
          </label>
        </div>
        {loading ? (
          <Loading label="Opening the equipment room…" />
        ) : error ? (
          <ErrorState message={error} retry={reload} />
        ) : (
          <>
            <div className="results-heading">
              <p>
                <strong>{items.length}</strong> {items.length === 1 ? 'item' : 'items'}
                {category
                  ? ` in ${data?.categories.find((item) => item.id === category)?.name ?? 'this category'}`
                  : ' in the collection'}
              </p>
              <span>Bookings are subject to staff approval</span>
            </div>
            {items.length ? (
              <div className="equipment-grid">
                {items.map((item) => (
                  <Link
                    key={item.id}
                    className="equipment-card"
                    href={`/equipment/${encodeURIComponent(item.id)}`}
                  >
                    <div className="equipment-card-image">
                      <EquipmentArt category={item.category.name} name={item.name} />
                      {item.status === 'UNDER_MAINTENANCE' && (
                        <span className="maintenance-flag">In service / maintenance</span>
                      )}
                    </div>
                    <div className="equipment-card-body">
                      <div className="equipment-card-category">
                        {item.category.name}
                        <span className="mono">{item.id.slice(-6).toUpperCase()}</span>
                      </div>
                      <h2>{item.name}</h2>
                      <p>{item.description || 'View this item and choose your booking dates.'}</p>
                      <div className="equipment-card-footer">
                        <EquipmentBadge maintenance={item.status === 'UNDER_MAINTENANCE'} />
                        <span className="card-cta">
                          View kit <Icon name="arrow" size={17} />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                title={
                  data?.equipment.length
                    ? 'No equipment matches your search'
                    : 'The equipment room is getting ready'
                }
                action={
                  data?.equipment.length ? (
                    <button className="button button-secondary" onClick={clearFilters}>
                      Clear filters
                    </button>
                  ) : undefined
                }
              >
                {data?.equipment.length
                  ? 'Try another name or category, or clear the filters to see the collection.'
                  : 'Equipment will appear here once an administrator adds it.'}
              </EmptyState>
            )}
          </>
        )}
      </section>
    </>
  );
}
