/**
 * Barrel file for the `hooks/` directory.
 *
 * Each hook gets one line here so consumers can import from
 * `@istracked/datagrid-react/hooks` without knowing the internal file layout.
 */

export { useBackgroundIndexer } from './use-background-indexer';
export type {
  BackgroundIndexerOptions,
  BackgroundIndexerState,
  BackgroundIndexerFieldStatus,
  ColumnSearchIndex,
  IdbAdapter,
} from './use-background-indexer';
