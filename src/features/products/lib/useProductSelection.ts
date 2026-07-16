"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "admin-produkty-selection";

type SelectionState = {
  filterKey: string;
  mode: "ids" | "all";
  ids: string[];
  excludedIds: string[];
};

const EMPTY_STATE = (filterKey: string): SelectionState => ({
  filterKey,
  mode: "ids",
  ids: [],
  excludedIds: [],
});

function loadState(filterKey: string): SelectionState {
  if (typeof window === "undefined") return EMPTY_STATE(filterKey);
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE(filterKey);
    const parsed = JSON.parse(raw) as SelectionState;
    // Filter changed since last selection (new search term) — stale, start fresh.
    if (parsed.filterKey !== filterKey) return EMPTY_STATE(filterKey);
    return parsed;
  } catch {
    return EMPTY_STATE(filterKey);
  }
}

/**
 * Selection persists across page navigation (sessionStorage) so "select all matching"
 * on page 1 stays selected on page 2. Resets whenever the search filter changes.
 */
export function useProductSelection(filterKey: string, pageIds: string[], totalMatching: number) {
  const [state, setState] = useState<SelectionState>(() => loadState(filterKey));

  useEffect(() => {
    setState((prev) => (prev.filterKey === filterKey ? prev : EMPTY_STATE(filterKey)));
  }, [filterKey]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const isSelected = (id: string) =>
    state.mode === "all" ? !state.excludedIds.includes(id) : state.ids.includes(id);

  const isPageFullySelected = pageIds.length > 0 && pageIds.every(isSelected);
  const isPagePartiallySelected = !isPageFullySelected && pageIds.some(isSelected);

  const count = state.mode === "all" ? totalMatching - state.excludedIds.length : state.ids.length;

  function toggleRow(id: string) {
    setState((prev) => {
      if (prev.mode === "all") {
        const excludedIds = prev.excludedIds.includes(id)
          ? prev.excludedIds.filter((x) => x !== id)
          : [...prev.excludedIds, id];
        return { ...prev, excludedIds };
      }
      const ids = prev.ids.includes(id) ? prev.ids.filter((x) => x !== id) : [...prev.ids, id];
      return { ...prev, ids };
    });
  }

  function togglePageAll() {
    setState((prev) => {
      const allSelected = pageIds.length > 0 && pageIds.every((id) => isSelected(id));
      if (prev.mode === "all") {
        const excludedIds = allSelected
          ? [...new Set([...prev.excludedIds, ...pageIds])]
          : prev.excludedIds.filter((id) => !pageIds.includes(id));
        return { ...prev, excludedIds };
      }
      const ids = allSelected
        ? prev.ids.filter((id) => !pageIds.includes(id))
        : [...new Set([...prev.ids, ...pageIds])];
      return { ...prev, ids };
    });
  }

  function selectAllMatching() {
    setState((prev) => ({ ...prev, mode: "all", excludedIds: [] }));
  }

  function clear() {
    setState(EMPTY_STATE(filterKey));
  }

  return {
    mode: state.mode,
    ids: state.ids,
    excludedIds: state.excludedIds,
    count,
    isSelected,
    isPageFullySelected,
    isPagePartiallySelected,
    toggleRow,
    togglePageAll,
    selectAllMatching,
    clear,
  };
}
