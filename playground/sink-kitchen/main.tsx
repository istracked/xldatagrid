import React from 'react';
import { createRoot } from 'react-dom/client';
import * as Sections from './sections';

const sections = [
  { id: 'cell-types', title: 'All Cell Types', component: Sections.CellTypesSection },
  { id: 'actions-column', title: 'Actions Column', component: Sections.ActionsColumnSection },
  { id: 'sort-single', title: 'Single Sort', component: Sections.SortSingleSection },
  { id: 'sort-multi', title: 'Multi Sort', component: Sections.SortMultiSection },
  { id: 'filtering', title: 'Filtering', component: Sections.FilteringSection },
  { id: 'selection', title: 'Selection Modes', component: Sections.SelectionSection },
  { id: 'edit-validation', title: 'Editing + Validation', component: Sections.EditValidationSection },
  { id: 'undo-redo', title: 'Undo / Redo', component: Sections.UndoRedoSection },
  { id: 'clipboard', title: 'Clipboard', component: Sections.ClipboardSection },
  { id: 'col-resize-reorder', title: 'Resize & Reorder', component: Sections.ColResizeReorderSection },
  { id: 'col-visibility', title: 'Column Visibility', component: Sections.ColVisibilitySection },
  { id: 'col-freeze', title: 'Frozen Columns', component: Sections.ColFreezeSection },
  { id: 'col-menu', title: 'Column Menu', component: Sections.ColMenuSection },
  { id: 'ghost-row', title: 'Ghost Row', component: Sections.GhostRowSection },
  { id: 'grouping-row', title: 'Row Grouping', component: Sections.GroupingRowSection },
  { id: 'grouping-multi', title: 'Multi-Level Grouping', component: Sections.GroupingMultiSection },
  { id: 'grouping-column', title: 'Column Grouping', component: Sections.GroupingColumnSection },
  { id: 'master-detail', title: 'Master-Detail', component: Sections.MasterDetailSection },
  { id: 'context-menu', title: 'Context Menu', component: Sections.ContextMenuSection },
  { id: 'keyboard-nav', title: 'Keyboard Navigation', component: Sections.KeyboardNavSection },
  { id: 'theming', title: 'Theming', component: Sections.ThemingSection },
  { id: 'transposed', title: 'Transposed Grid', component: Sections.TransposedSection },
  { id: 'virtualization', title: 'Virtualization (500)', component: Sections.VirtualizationSection },
  { id: 'extensions', title: 'Extensions', component: Sections.ExtensionsSection },
  { id: 'empty-state', title: 'Empty State', component: Sections.EmptyStateSection },
  { id: 'read-only', title: 'Read-Only', component: Sections.ReadOnlySection },
  { id: 'chrome-columns', title: 'Chrome Columns', component: Sections.ChromeColumnsSection },
];

const sidebarStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, bottom: 0, width: 220,
  background: '#f8fafc', borderRight: '1px solid #e2e8f0',
  display: 'flex', flexDirection: 'column', zIndex: 10,
};
const sidebarTitleStyle: React.CSSProperties = {
  padding: '20px 16px 12px', fontWeight: 700, fontSize: 16,
  borderBottom: '1px solid #e2e8f0',
};
const sidebarNavStyle: React.CSSProperties = {
  flex: 1, overflowY: 'auto', padding: '8px 0',
};
const navLinkStyle: React.CSSProperties = {
  display: 'block', padding: '6px 16px', fontSize: 13,
  color: '#64748b', textDecoration: 'none',
};
const navLinkActiveStyle: React.CSSProperties = {
  ...navLinkStyle, color: '#1e293b', fontWeight: 600,
  borderLeft: '3px solid #3b82f6', paddingLeft: 13,
};
const mainStyle: React.CSSProperties = {
  marginLeft: 220, padding: 24,
  display: 'flex', flexDirection: 'column', gap: 48,
};

function App() {
  const [activeId, setActiveId] = React.useState(sections[0].id);

  // IntersectionObserver to track which section is currently visible in the viewport
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Sidebar */}
      <nav style={sidebarStyle}>
        <div style={sidebarTitleStyle}>Sink Kitchen</div>
        <div style={sidebarNavStyle}>
          {sections.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              style={s.id === activeId ? navLinkActiveStyle : navLinkStyle}
            >
              {s.title}
            </a>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main style={mainStyle}>
        {sections.map(s => (
          <section key={s.id} id={s.id} data-testid={`section-${s.id}`}>
            <s.component />
          </section>
        ))}
      </main>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
