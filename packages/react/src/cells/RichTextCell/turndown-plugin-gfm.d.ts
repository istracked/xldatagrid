/**
 * Minimal ambient types for `turndown-plugin-gfm`, which ships without its
 * own `.d.ts`. We only consume the `gfm` bundle (strikethrough + tables +
 * task-list rules) via `TurndownService#use`, so the signature is narrow by
 * design: a plugin is any function that receives the service instance.
 */
declare module 'turndown-plugin-gfm' {
  import type TurndownService from 'turndown';

  export type Plugin = (service: TurndownService) => void;

  /** Bundled plugin: strikethrough + tables + task lists. */
  export const gfm: Plugin;
  /** Individual plugins, exported for completeness. */
  export const tables: Plugin;
  export const strikethrough: Plugin;
  export const taskListItems: Plugin;
}
