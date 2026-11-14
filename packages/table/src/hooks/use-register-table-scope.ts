import type { TableScopeApi } from "../lib/table-registry"
import { registerScope, unregisterScope } from "../lib/table-registry"
import * as React from "react"

/**
 * Publishes one slice of a table's state into the global table registry under `(id, scope)`.
 *
 * The caller passes a fresh `scopeApi` on every render — its methods close over current state —
 * so registering it directly would unregister and re-register on each one. Instead the latest api
 * is kept in a ref and the registry is handed a delegate built once per `(id, scope)`: the
 * registry's reference stays put, and every call through it reaches the current closures.
 *
 * Both the ref update and the delegate live in effects rather than in the render body, because a
 * ref written during render is not a render output and React may discard the attempt.
 *
 * The ref update is a LAYOUT effect, so it has landed before any passive effect of the same commit
 * runs. The tables call `emitChange` from a passive effect, and a subscriber reading the snapshot
 * there would otherwise be handed the state from one render ago.
 *
 * Passing no `id` is the documented way to opt out — an anonymous table simply does not register.
 */
export function useRegisterTableScope(
  id: string | undefined,
  scope: string,
  scopeApi: TableScopeApi
): void {
  const apiRef = React.useRef(scopeApi)

  // No dependency array: the api is rebuilt every render and the ref has to follow it.
  React.useLayoutEffect(() => {
    apiRef.current = scopeApi
  })

  React.useEffect(() => {
    if (!id || !scope) return

    // A Proxy rather than a fixed list of forwarded methods, so a scope can add an action
    // without this hook having to learn its name.
    const delegate: TableScopeApi = {
      getState: () => apiRef.current.getState(),
      actions: new Proxy({} as TableScopeApi["actions"], {
        get:
          (_target, action: string) =>
          (...args: never[]) =>
            apiRef.current.actions[action]?.(...args),
        has: (_target, action: string) => action in apiRef.current.actions,
      }),
    }

    registerScope(id, scope, delegate)
    return () => unregisterScope(id, scope)
  }, [id, scope])
}
