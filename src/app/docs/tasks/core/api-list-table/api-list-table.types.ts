export type ApiListTableColumnType = 'text' | 'date' | 'status';

type BivariantCallback<Arg, Result> = {
  bivarianceHack(arg: Arg): Result;
}['bivarianceHack'];

export interface ApiListTableColumn<Row = any> {
  key: Extract<keyof Row, string> | string;
  label: string;
  type?: ApiListTableColumnType;
  emptyValue?: string;
  resolveValue?: BivariantCallback<Row, unknown>;
}

export type ApiListTableRowActionTone = 'primary' | 'success' | 'neutral';

export interface ApiListTableRowAction<Row = any> {
  key: string;
  label: string;
  tone?: ApiListTableRowActionTone;
  isVisible?: BivariantCallback<Row, boolean>;
  isDisabled?: BivariantCallback<Row, boolean>;
}

export interface ApiListTableActionEvent<Row = any> {
  actionKey: string;
  row: Row;
}
