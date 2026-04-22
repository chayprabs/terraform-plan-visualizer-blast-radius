export type TerraformIndexValue = number | string;

export type TerraformReplacePath = TerraformIndexValue[];

export interface TerraformLooseObject {
  [key: string]: unknown;
}

export interface TerraformImporting extends TerraformLooseObject {
  id?: string;
}

export interface TerraformChange extends TerraformLooseObject {
  actions: string[];
  before?: unknown;
  after?: unknown;
  after_unknown?: unknown;
  before_sensitive?: unknown;
  after_sensitive?: unknown;
  replace_paths?: TerraformReplacePath[] | null;
  importing?: TerraformImporting | null;
  generated_config?: string | null;
}

export interface TerraformResourceChange extends TerraformLooseObject {
  address: string;
  previous_address?: string | null;
  module_address?: string | null;
  mode?: string;
  type: string;
  name: string;
  index?: TerraformIndexValue | null;
  provider_name?: string;
  deposed?: string | null;
  change: TerraformChange;
}

export interface TerraformOutputChange extends TerraformLooseObject {
  actions?: string[];
  before?: unknown;
  after?: unknown;
  after_unknown?: unknown;
  before_sensitive?: unknown;
  after_sensitive?: unknown;
}

export interface TerraformStateResource extends TerraformLooseObject {
  address?: string;
  mode?: string;
  type?: string;
  name?: string;
  index?: TerraformIndexValue | null;
  provider_name?: string;
  depends_on?: string[] | null;
  values?: TerraformLooseObject | null;
  sensitive_values?: TerraformLooseObject | null;
}

export interface TerraformStateModule extends TerraformLooseObject {
  address?: string;
  resources?: TerraformStateResource[] | null;
  child_modules?: TerraformStateModule[] | null;
}

export interface TerraformStateValues extends TerraformLooseObject {
  root_module?: TerraformStateModule | null;
  outputs?: Record<string, TerraformLooseObject> | null;
}

export interface TerraformPriorState extends TerraformLooseObject {
  format_version?: string;
  terraform_version?: string;
  values?: TerraformStateValues | null;
}

export interface TerraformPlannedValues extends TerraformLooseObject {
  root_module?: TerraformStateModule | null;
  outputs?: Record<string, TerraformLooseObject> | null;
}

export interface TerraformProviderConfig extends TerraformLooseObject {
  name?: string;
  full_name?: string;
  alias?: string;
  module_address?: string;
  version_constraint?: string;
  expressions?: Record<string, unknown>;
}

export interface TerraformConfigurationResource extends TerraformLooseObject {
  address?: string;
  mode?: string;
  type?: string;
  name?: string;
  provider_config_key?: string;
  depends_on?: string[] | null;
  expressions?: Record<string, unknown>;
}

export interface TerraformConfigurationModule extends TerraformLooseObject {
  address?: string;
  resources?: TerraformConfigurationResource[] | null;
  child_modules?: TerraformConfigurationModule[] | null;
  module_calls?: Record<string, TerraformLooseObject> | null;
}

export interface TerraformConfiguration extends TerraformLooseObject {
  provider_config?: Record<string, TerraformProviderConfig>;
  root_module?: TerraformConfigurationModule | null;
}

export interface TerraformRelevantAttribute extends TerraformLooseObject {
  resource?: string;
  attribute?: TerraformReplacePath;
}

export interface TerraformCheckResult extends TerraformLooseObject {
  address?: string;
  status?: string;
  instances?: TerraformLooseObject[] | null;
}

export interface TerraformPlan extends TerraformLooseObject {
  format_version: string;
  terraform_version?: string;
  prior_state?: TerraformPriorState | null;
  planned_values?: TerraformPlannedValues | null;
  proposed_unknown?: unknown;
  resource_changes?: TerraformResourceChange[] | null;
  output_changes?: Record<string, TerraformOutputChange> | null;
  configuration?: TerraformConfiguration | null;
  relevant_attributes?: TerraformRelevantAttribute[] | null;
  checks?: TerraformCheckResult[] | null;
  timestamp?: string;
}
