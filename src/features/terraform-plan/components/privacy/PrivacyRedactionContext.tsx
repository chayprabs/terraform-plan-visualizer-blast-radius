"use client";

import {
  createContext,
  useContext,
  type PropsWithChildren,
} from "react";
import {
  DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS,
  type TerraformPlanRedactionSettings,
} from "@/features/terraform-plan/privacy/redactionTypes";

interface PrivacyRedactionContextValue {
  settings: TerraformPlanRedactionSettings;
}

const defaultContextValue: PrivacyRedactionContextValue = {
  settings: DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS,
};

const PrivacyRedactionContext = createContext<PrivacyRedactionContextValue>(
  defaultContextValue,
);

interface PrivacyRedactionProviderProps extends PropsWithChildren {
  settings: TerraformPlanRedactionSettings;
}

export function PrivacyRedactionProvider({
  children,
  settings,
}: PrivacyRedactionProviderProps) {
  return (
    <PrivacyRedactionContext.Provider value={{ settings }}>
      {children}
    </PrivacyRedactionContext.Provider>
  );
}

export function usePrivacyRedaction() {
  return useContext(PrivacyRedactionContext);
}
