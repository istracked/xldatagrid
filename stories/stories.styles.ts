import type { CSSProperties } from 'react';

// ---------------------------------------------------------------------------
// Common styles shared across stories
// ---------------------------------------------------------------------------

/** h2 headings inside story wrappers */
export const heading: CSSProperties = { margin: 0 };

/** Subtitle paragraph below the heading */
export const subtitle: CSSProperties = { margin: 0, color: '#64748b' };

/** Pre block for event log output */
export const logPre: CSSProperties = {
  margin: 0,
  fontSize: 12,
  background: '#f1f5f9',
  padding: 8,
  borderRadius: 4,
  maxHeight: 120,
  overflow: 'auto',
};

/** Pre block for compact state display (no maxHeight/overflow) */
export const statePre: CSSProperties = {
  margin: 0,
  fontSize: 12,
  background: '#f1f5f9',
  padding: 8,
  borderRadius: 4,
};

// ---------------------------------------------------------------------------
// Keyboard story
// ---------------------------------------------------------------------------

export const keyboardDescriptionBlock: CSSProperties = {
  margin: 0,
  color: '#64748b',
  fontSize: 13,
  lineHeight: 1.6,
};

export const keyboardTable: CSSProperties = { borderCollapse: 'collapse', fontSize: 13 };

export const keyboardTh: CSSProperties = {
  textAlign: 'left',
  padding: '4px 16px 4px 0',
  borderBottom: '1px solid #e2e8f0',
};

export const keyboardTdKey: CSSProperties = {
  padding: '3px 16px 3px 0',
  fontFamily: 'monospace',
  whiteSpace: 'nowrap',
};

export const keyboardTdDesc: CSSProperties = { padding: '3px 0' };

// ---------------------------------------------------------------------------
// Introduction story
// ---------------------------------------------------------------------------

export const introWrapper: CSSProperties = {
  padding: 40,
  maxWidth: 720,
  fontFamily: 'system-ui, sans-serif',
  lineHeight: 1.6,
};

export const introTitle: CSSProperties = { margin: '0 0 8px' };

export const introSubtitle: CSSProperties = { color: '#64748b', marginTop: 0 };

export const introTable: CSSProperties = {
  borderCollapse: 'collapse',
  width: '100%',
  fontSize: 14,
};

export const introTh: CSSProperties = {
  textAlign: 'left',
  padding: '6px 12px',
  borderBottom: '2px solid #e2e8f0',
};

export const introTd: CSSProperties = {
  padding: '6px 12px',
  borderBottom: '1px solid #f1f5f9',
  verticalAlign: 'top',
};

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

export const flexRow: CSSProperties = { display: 'flex', gap: 8 };

export const flexRowCenter: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12 };

export const flexRowCenterWide: CSSProperties = { display: 'flex', alignItems: 'center', gap: 16 };

export const headingFlex: CSSProperties = { margin: 0, flex: 1 };

// ---------------------------------------------------------------------------
// MasterDetail story
// ---------------------------------------------------------------------------

export const masterDetailLoading: CSSProperties = { padding: 16 };

export const masterDetailPanel: CSSProperties = {
  padding: 16,
  background: '#f8fafc',
  display: 'flex',
  gap: 32,
  fontSize: 13,
};

export const masterDetailTable: CSSProperties = {
  marginTop: 8,
  borderCollapse: 'collapse',
};

export const masterDetailKeyCell: CSSProperties = {
  padding: '2px 12px 2px 0',
  color: '#64748b',
  fontWeight: 600,
};

export const masterDetailValueCell: CSSProperties = { padding: '2px 0' };

export const masterDetailPre: CSSProperties = {
  fontSize: 11,
  background: '#e2e8f0',
  padding: 8,
  borderRadius: 4,
};

// ---------------------------------------------------------------------------
// Theming story
// ---------------------------------------------------------------------------

export const themingDarkWrapper: CSSProperties = {
  background: '#0f172a',
  color: '#f1f5f9',
};

export const themingDarkGridBorder: CSSProperties = {
  borderColor: '#334155',
};

export const themingSwitcherWrapper = (dark: boolean): CSSProperties => ({
  background: dark ? '#0f172a' : '#ffffff',
  color: dark ? '#f1f5f9' : '#1e293b',
  transition: 'all 0.3s',
});

export const themingSwitcherButton = (dark: boolean): CSSProperties => ({
  padding: '6px 16px',
  borderRadius: 6,
  border: '1px solid',
  cursor: 'pointer',
  background: dark ? '#334155' : '#f1f5f9',
  color: dark ? '#f1f5f9' : '#1e293b',
});

export const themingSwitcherGridBorder = (dark: boolean): CSSProperties => ({
  borderColor: dark ? '#334155' : '#e2e8f0',
});

// ---------------------------------------------------------------------------
// Extensions story
// ---------------------------------------------------------------------------

export const extensionsBtnStyle: CSSProperties = {
  padding: '6px 16px',
  borderRadius: 6,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  cursor: 'pointer',
  fontSize: 13,
};

export const extensionsExportStatus: CSSProperties = {
  alignSelf: 'center',
  color: '#10b981',
  fontSize: 13,
};

// ---------------------------------------------------------------------------
// KitchenSink story
// ---------------------------------------------------------------------------

export const kitchenSinkWrapper = (dark: boolean): CSSProperties => ({
  background: dark ? '#0f172a' : '#fff',
  color: dark ? '#f1f5f9' : '#1e293b',
  transition: 'all 0.3s',
});

export const kitchenSinkSubtitle = (dark: boolean): CSSProperties => ({
  margin: 0,
  color: dark ? '#94a3b8' : '#64748b',
  fontSize: 13,
});

export const kitchenSinkGridBorder = (dark: boolean): CSSProperties => ({
  borderColor: dark ? '#334155' : '#e2e8f0',
});

export const kitchenSinkLogPre = (dark: boolean): CSSProperties => ({
  margin: 0,
  fontSize: 11,
  padding: 8,
  borderRadius: 4,
  maxHeight: 100,
  overflow: 'auto',
  background: dark ? '#1e293b' : '#f1f5f9',
  color: dark ? '#cbd5e1' : '#334155',
});

export const kitchenSinkBtnStyle = (dark: boolean): CSSProperties => ({
  padding: '6px 16px',
  borderRadius: 6,
  border: '1px solid',
  borderColor: dark ? '#475569' : '#e2e8f0',
  background: dark ? '#334155' : '#f8fafc',
  color: dark ? '#f1f5f9' : '#1e293b',
  cursor: 'pointer',
  fontSize: 13,
});

export const kitchenSinkGroupedSubtitle: CSSProperties = {
  margin: 0,
  color: '#64748b',
  fontSize: 13,
};
