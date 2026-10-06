export type ApiListTableColumnType = 'text' | 'date' | 'status';

type BivariantCallback<Arg, Result> = {
  bivarianceHack(arg: Arg): Result;
}['bivarianceHack'];

export interface ApiListTableColumn<Row extends object = object> {
  key: Extract<keyof Row, string> | string;
  label: string;
  type?: ApiListTableColumnType;
  emptyValue?: string;
  resolveValue?: BivariantCallback<Row, unknown>;
}

export type ApiListTableRowActionTone = 'primary' | 'success' | 'neutral';

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
