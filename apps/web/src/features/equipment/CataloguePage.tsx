import { useState } from 'react';
import { Link } from '../../components/Link';
import { EquipmentArt, Icon } from '../../components/Icon';
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
      <PageHeading
        eyebrow="THE EQUIPMENT ROOM"
        title="Find your next piece of kit."
        description="Browse the collection, choose your dates and send a booking request."
        actions={
          <Link className="button button-secondary" href="/bookings">
            My bookings
            <Icon name="arrow" size={17} />
          </Link>
        }
      />
      <div className="catalogue-intro">
        <div>
          <span className="eyebrow">SHARED TOOLS. MORE POSSIBILITIES.</span>
          <p>
            A little planning goes a long way.
            <br />
            <strong>Book it. Make something. Bring it back.</strong>
          </p>
        </div>
        <div className="intro-number">
          <strong>{data ? String(data.equipment.length).padStart(2, '0') : '—'}</strong>
          <span>items in the collection</span>
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
                    <EquipmentArt category={item.category.name} name={item.name} />
                    <div className="equipment-card-body">
                      <div className="equipment-card-category">
                        {item.category.name}
                        <Icon name="arrow" size={17} />
                      </div>
                      <h2>{item.name}</h2>
                      <p>{item.description || 'View this item and choose your booking dates.'}</p>
                      <div className="equipment-card-footer">
                        <EquipmentBadge maintenance={item.status === 'UNDER_MAINTENANCE'} />
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
