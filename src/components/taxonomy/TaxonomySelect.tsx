"use client";

import { useMemo } from "react";
import { Select } from "@/components/ui/Select";
import { useCategoryTree } from "@/hooks/use-taxonomy";
import type { TaxonomyNode, TaxonomyType } from "@/services/taxonomy";

interface Props {
  type: TaxonomyType;
  value: string;
  onChange: (id: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  id?: string;
  disabled?: boolean;
  onBlur?: () => void;
  className?: string;
  /**
   * The current value may point at a category that has since been deactivated
   * (existing records stay valid). Pass its name so it still renders.
   */
  currentName?: string;
}

/** Options for a node: roots with children become groups; deeper levels are indented. */
function renderNodes(nodes: TaxonomyNode[], depth = 0): React.ReactNode[] {
  return nodes.flatMap((node) => {
    const indent = "  ".repeat(depth);
    if (node.children.length === 0) {
      return [
        <option key={node.id} value={node.id}>
          {indent}
          {node.name}
        </option>,
      ];
    }
    if (depth === 0) {
      return [
        <optgroup key={node.id} label={node.name}>
          <option value={node.id}>{node.name}</option>
          {renderNodes(node.children, 1)}
        </optgroup>,
      ];
    }
    return [
      <option key={node.id} value={node.id}>
        {indent}
        {node.name}
      </option>,
      ...renderNodes(node.children, depth + 1),
    ];
  });
}

/**
 * Category picker backed by the taxonomy API. Options are whatever the admin
 * has active right now: a new category shows up with no frontend change.
 */
export function TaxonomySelect({
  type,
  value,
  onChange,
  placeholder = "Select…",
  currentName,
  ...rest
}: Props) {
  const { data, isLoading, isError } = useCategoryTree(type);

  const options = useMemo(() => renderNodes(data ?? []), [data]);
  const known = useMemo(() => {
    const ids = new Set<string>();
    const walk = (nodes: TaxonomyNode[]) => nodes.forEach((n) => (ids.add(n.id), walk(n.children)));
    walk(data ?? []);
    return ids;
  }, [data]);

  return (
    <Select
      {...rest}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={rest.disabled || isLoading}
      hint={isError ? "Couldn't load options. Refresh to retry." : rest.hint}
    >
      <option value="">{isLoading ? "Loading…" : placeholder}</option>
      {value && currentName && !known.has(value) && !isLoading && (
        <option value={value}>{currentName} (unavailable)</option>
      )}
      {options}
    </Select>
  );
}
