// Singleton registry and event bus for imperative, id-scoped table control.
//
// A table publishes slices of its state under `(id, scope)`. Scoping by both is what lets a
// composed table register alongside the plain one it renders inside: they share the `id`, and
// the outer table owns `sort` / `pagination` / `selection` / `columnVisibility` while
// `PlainTable` owns `columnAlign` and `columnWidth`. Without the scope key the inner
// registration would overwrite the outer one.
//
// This is deliberately module-level mutable state, not React state — the point is to reach a
// table from outside the tree that renders it (a toolbar in another branch, an app-level
// keyboard shortcut). Everything that can go through props should.

/** The imperative surface one scope publishes. */
export interface TableScopeApi<TState = unknown> {
  getState: () => TState
  actions: Record<string, (...args: never[]) => unknown>
}

/** Every scope of one table, as returned by {@link getSnapshot}. */
export type TableSnapshot = Record<string, unknown>

type Listener = (snapshot: TableSnapshot) => void

interface Entry {
  scopes: Map<string, TableScopeApi>
  listeners: Set<Listener>
}

const registry = new Map<string, Entry>()

function ensureEntry(id: string): Entry {
  let entry = registry.get(id)

  if (!entry) {
    entry = { scopes: new Map(), listeners: new Set() }
    registry.set(id, entry)
  }

  return entry
}

// An id with neither scopes nor listeners left is dropped, so a page that mounts and unmounts
// many tables does not grow the map forever.
function cleanupEntry(id: string): void {
  const entry = registry.get(id)

  if (entry && entry.scopes.size === 0 && entry.listeners.size === 0) {
    registry.delete(id)
  }
}

export function registerScope(
  id: string,
  scope: string,
  scopeApi: TableScopeApi
): void {
  if (!id || !scope) return

  ensureEntry(id).scopes.set(scope, scopeApi)
}

export function unregisterScope(id: string, scope: string): void {
  if (!id || !scope) return

  const entry = registry.get(id)
  if (!entry) return

  entry.scopes.delete(scope)
  cleanupEntry(id)
}

export function getScope(id: string, scope: string): TableScopeApi | undefined {
  return registry.get(id)?.scopes.get(scope)
}

export function getSnapshot(id: string): TableSnapshot | undefined {
  const entry = registry.get(id)
  if (!entry) return undefined

  const snapshot: TableSnapshot = {}

  for (const [scope, scopeApi] of entry.scopes) {
    snapshot[scope] = scopeApi.getState()
  }

  return snapshot
}

export function subscribe(id: string, listener: Listener): () => void {
  if (!id) return () => {}

  const entry = ensureEntry(id)
  entry.listeners.add(listener)

  return () => {
    const current = registry.get(id)
    if (!current) return

    current.listeners.delete(listener)
    cleanupEntry(id)
  }
}

export function emitChange(id: string): void {
  const entry = registry.get(id)
  if (!entry || entry.listeners.size === 0) return

  const snapshot = getSnapshot(id) ?? {}

  for (const listener of entry.listeners) {
    try {
      listener(snapshot)
    } catch {
      // One bad listener must not stop the rest of the chain.
    }
  }
}
