/**
 * Excel 365-style "Custom AutoFilter" dialog.
 *
 * Allows the user to define up to two filter conditions combined with And/Or
 * logic, matching the layout of the Excel 365 Custom AutoFilter modal.
 */
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { FilterDescriptor, FilterOperator, CompositeFilterDescriptor } from '@istracked/datagrid-core';
import * as styles from './FilterConditionDialog.styles';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterConditionDialogProps {
  open: boolean;
  field: string;
  title: string;
  dataType: 'text' | 'number' | 'date';
  /** Current filter for this field, if any — prefills the form. */
  initial?: CompositeFilterDescriptor;
  /** null means "clear the filter". */
  onApply: (filter: CompositeFilterDescriptor | null) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Operator definitions
// ---------------------------------------------------------------------------

interface OperatorOption {
  label: string;
  operator: FilterOperator;
  /** When true the value input is hidden (isNull / isNotNull). */
  noValue?: boolean;
  /** When true a second "between" value input is shown. */
  between?: boolean;
}

const TEXT_OPERATORS: OperatorOption[] = [
  { label: 'equals', operator: 'eq' },
  { label: 'does not equal', operator: 'neq' },
  { label: 'begins with', operator: 'startsWith' },
  { label: 'ends with', operator: 'endsWith' },
  { label: 'contains', operator: 'contains' },
  { label: 'is empty', operator: 'isNull', noValue: true },
  { label: 'is not empty', operator: 'isNotNull', noValue: true },
];

const NUMBER_OPERATORS: OperatorOption[] = [
  { label: 'equals', operator: 'eq' },
  { label: 'does not equal', operator: 'neq' },
  { label: 'is greater than', operator: 'gt' },
  { label: 'is greater than or equal to', operator: 'gte' },
  { label: 'is less than', operator: 'lt' },
  { label: 'is less than or equal to', operator: 'lte' },
  { label: 'is between', operator: 'between', between: true },
  { label: 'is empty', operator: 'isNull', noValue: true },
  { label: 'is not empty', operator: 'isNotNull', noValue: true },
];

const DATE_OPERATORS: OperatorOption[] = [
  { label: 'equals', operator: 'eq' },
  { label: 'does not equal', operator: 'neq' },
  { label: 'is after', operator: 'gt' },
  { label: 'is after or on', operator: 'gte' },
  { label: 'is before', operator: 'lt' },
  { label: 'is before or on', operator: 'lte' },
  { label: 'is between', operator: 'between', between: true },
  { label: 'is empty', operator: 'isNull', noValue: true },
  { label: 'is not empty', operator: 'isNotNull', noValue: true },
];

function getOperators(dataType: 'text' | 'number' | 'date'): OperatorOption[] {
  if (dataType === 'number') return NUMBER_OPERATORS;
  if (dataType === 'date') return DATE_OPERATORS;
  return TEXT_OPERATORS;
}

function findOption(operators: OperatorOption[], operator: FilterOperator): OperatorOption | undefined {
  return operators.find((o) => o.operator === operator);
}

// ---------------------------------------------------------------------------
// Per-row local state
// ---------------------------------------------------------------------------

interface ConditionState {
  operator: FilterOperator | '';
  value: string;
  value2: string; // only used for "between"
}

const EMPTY_CONDITION: ConditionState = { operator: '', value: '', value2: '' };

function conditionFromDescriptor(
  desc: FilterDescriptor,
  operators: OperatorOption[],
): ConditionState {
  const opt = findOption(operators, desc.operator);
  if (!opt) return EMPTY_CONDITION;
  if (opt.between) {
    const arr = Array.isArray(desc.value) ? desc.value : [desc.value, ''];
    return { operator: desc.operator, value: String(arr[0] ?? ''), value2: String(arr[1] ?? '') };
  }
  return { operator: desc.operator, value: desc.value == null ? '' : String(desc.value), value2: '' };
}

function buildDescriptor(field: string, cond: ConditionState, opt: OperatorOption): FilterDescriptor {
  if (opt.noValue) {
    return { field, operator: opt.operator, value: null };
  }
  if (opt.between) {
    return { field, operator: opt.operator, value: [cond.value, cond.value2] };
  }
  return { field, operator: opt.operator, value: cond.value };
}

// ---------------------------------------------------------------------------
// Sub-component: one condition row
// ---------------------------------------------------------------------------

interface ConditionRowProps {
  index: 1 | 2;
  dataType: 'text' | 'number' | 'date';
  operators: OperatorOption[];
  state: ConditionState;
  onChange: (next: ConditionState) => void;
}

function ConditionRow({ index, dataType, operators, state, onChange }: ConditionRowProps) {
  const inputType = dataType === 'date' ? 'date' : 'text';
  const selectedOpt = state.operator ? findOption(operators, state.operator as FilterOperator) : undefined;
  const hideValue = selectedOpt?.noValue === true;
  const showBetween = selectedOpt?.between === true;

  return (
    <div style={styles.conditionRow}>
      <select
        data-testid={`filter-cond-op-${index}`}
        style={styles.operatorSelect}
        value={state.operator}
        onChange={(e) => {
          const op = e.target.value as FilterOperator | '';
          onChange({ ...state, operator: op, value: '', value2: '' });
        }}
      >
        <option value="">-- select --</option>
        {operators.map((o) => (
          <option key={o.operator} value={o.operator}>
            {o.label}
          </option>
        ))}
      </select>

      {!hideValue && (
        <input
          data-testid={`filter-cond-val-${index}`}
          type={inputType}
          style={styles.valueInput}
          value={state.value}
          onChange={(e) => onChange({ ...state, value: e.target.value })}
        />
      )}

      {showBetween && (
        <>
          <span style={styles.andLabel}>and</span>
          <input
            data-testid={`filter-cond-val-${index}-b`}
            type={inputType}
            style={styles.valueInput}
            value={state.value2}
            onChange={(e) => onChange({ ...state, value2: e.target.value })}
          />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dialog
// ---------------------------------------------------------------------------

/** Excel 365 "Custom AutoFilter" modal. Portal-rendered to document.body. */
export function FilterConditionDialog({
  open,
  field,
  title,
  dataType,
  initial,
  onApply,
  onClose,
}: FilterConditionDialogProps): React.ReactElement | null {
  const operators = getOperators(dataType);

  const [cond1, setCond1] = useState<ConditionState>(EMPTY_CONDITION);
  const [cond2, setCond2] = useState<ConditionState>(EMPTY_CONDITION);
  const [logic, setLogic] = useState<'and' | 'or'>('and');

  // Seed from `initial` when open flips to true.
  // useEffect is necessary here: we need to react to the `open` prop
  // transitioning from false → true to reset form state to `initial`.
  useEffect(() => {
    if (!open) return;
    if (!initial || initial.filters.length === 0) {
      setCond1(EMPTY_CONDITION);
      setCond2(EMPTY_CONDITION);
      setLogic('and');
      return;
    }
    setLogic(initial.logic);
    const [f1, f2] = initial.filters as FilterDescriptor[];
    setCond1(f1 ? conditionFromDescriptor(f1, operators) : EMPTY_CONDITION);
    setCond2(f2 ? conditionFromDescriptor(f2, operators) : EMPTY_CONDITION);
  // operators is derived from dataType (stable reference per render, but
  // dataType itself never changes while the dialog is open)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const hasCond1 = cond1.operator !== '';
  const hasCond2 = cond2.operator !== '';

  function handleOk() {
    if (!hasCond1 && !hasCond2) {
      onApply(null);
      return;
    }
    const filters: FilterDescriptor[] = [];
    if (hasCond1) {
      const opt = findOption(operators, cond1.operator as FilterOperator)!;
      filters.push(buildDescriptor(field, cond1, opt));
    }
    if (hasCond2) {
      const opt = findOption(operators, cond2.operator as FilterOperator)!;
      filters.push(buildDescriptor(field, cond2, opt));
    }
    if (filters.length === 1) {
      onApply({ logic: 'and', filters });
    } else {
      onApply({ logic, filters });
    }
  }

  return createPortal(
    <>
      {/* Backdrop — click closes dialog */}
      <div
        data-testid="filter-cond-backdrop"
        style={styles.backdrop}
        onClick={onClose}
      />

      {/* Dialog panel — clicks inside must not bubble to backdrop */}
      <div
        role="dialog"
        aria-label={`Custom AutoFilter: ${title}`}
        data-testid="filter-cond-dialog"
        style={styles.dialog}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.heading}>Show rows where:</div>

        <ConditionRow
          index={1}
          dataType={dataType}
          operators={operators}
          state={cond1}
          onChange={setCond1}
        />

        {hasCond1 && (
          <>
            <div style={styles.radioRow}>
              <label>
                <input
                  type="radio"
                  data-testid="filter-cond-and"
                  name="filter-cond-logic"
                  value="and"
                  checked={logic === 'and'}
                  onChange={() => setLogic('and')}
                />
                {' And'}
              </label>
              <label>
                <input
                  type="radio"
                  data-testid="filter-cond-or"
                  name="filter-cond-logic"
                  value="or"
                  checked={logic === 'or'}
                  onChange={() => setLogic('or')}
                />
                {' Or'}
              </label>
            </div>

            <ConditionRow
              index={2}
              dataType={dataType}
              operators={operators}
              state={cond2}
              onChange={setCond2}
            />
          </>
        )}

        <div style={styles.footer}>
          <button
            data-testid="filter-cond-cancel"
            style={styles.button(false)}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            data-testid="filter-cond-ok"
            style={styles.button(true)}
            onClick={handleOk}
          >
            OK
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
