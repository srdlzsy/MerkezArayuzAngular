export type ApiListTableColumnType = 'text' | 'date' | 'date-only' | 'status';

type BivariantCallback<Arg, Result> = {
  bivarianceHack(arg: Arg): Result;
}['bivarianceHack'];

export interface ApiListTableColumn<Row extends object = object> {
  key: Extract<keyof Row, string> | string;
  label: string;
  type?: ApiListTableColumnType;
  emptyValue?: string;
  resolveValue?: BivariantCallback<Row, unknown>;
  tableWidth?: string;
  tableAlign?: 'left' | 'center' | 'right';
  allowWrap?: boolean;
  printWidth?: string;
  printAlign?: 'left' | 'center' | 'right';
}

export type ApiListTableRowActionTone = 'primary' | 'success' | 'neutral' | 'danger';

export interface ApiListTableRowAction<Row extends object = object> {
  key: string;
  label: string;
  tone?: ApiListTableRowActionTone;
  isVisible?: BivariantCallback<Row, boolean>;
  isDisabled?: BivariantCallback<Row, boolean>;
}

export interface ApiListTableActionEvent<Row extends object = object> {
  actionKey: string;
  row: Row;
}
