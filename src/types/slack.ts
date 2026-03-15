export interface SlackPlainTextInputValue {
  type: "plain_text_input";
  value?: string | null;
}

export interface SlackStaticSelectValue {
  type: "static_select";
  selected_option?: {
    value: string;
  };
}

export interface SlackCheckboxesValue {
  type: "checkboxes";
  selected_options?: Array<{
    value: string;
  }>;
}

export interface SlackConversationSelectValue {
  type: "conversations_select";
  selected_conversation?: string;
}

export interface SlackDatetimePickerValue {
  type: "datetimepicker";
  selected_date_time?: number | string | null;
}

export type SlackViewValue =
  | SlackCheckboxesValue
  | SlackConversationSelectValue
  | SlackDatetimePickerValue
  | SlackPlainTextInputValue
  | SlackStaticSelectValue;

export type SlackViewStateValues = Record<
  string,
  Record<string, SlackViewValue>
>;

export interface SlackButtonActionBody {
  actions: Array<{
    value?: string;
  }>;
  channel?: {
    id: string;
  };
  team?: {
    id: string;
  };
  trigger_id?: string;
  user: {
    id: string;
  };
  view?: {
    hash: string;
    id: string;
    private_metadata: string;
    state: {
      values: SlackViewStateValues;
    };
  };
}

export interface SlackMessageShortcutBody {
  channel: {
    id: string;
  };
  message: {
    text?: string;
    ts: string;
  };
  team?: {
    id: string;
  };
  trigger_id: string;
}
