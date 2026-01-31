import type { ReactNode } from 'react';

interface SelectorItem {
  id: number;
  label: ReactNode;
}

interface SelectorDetailLayoutProps {
  items: SelectorItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  detail: ReactNode | null;
  emptyMessage: string;
  scrollable?: boolean;
}

export const SelectorDetailLayout = ({
  items,
  selectedId,
  onSelect,
  detail,
  emptyMessage,
  scrollable,
}: SelectorDetailLayoutProps) => (
  <div className="selector-detail-layout">
    <div className="item-selector">
      {items.map((item) => (
        <button
          key={item.id}
          className={`btn btn-dark btn-sm selector-button ${selectedId === item.id ? 'active' : ''}`}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>

    <div className={scrollable ? 'detail-panel-scroll' : 'detail-panel'}>
      {detail ?? <div className="detail-empty">{emptyMessage}</div>}
    </div>
  </div>
);
