export type ResourceTypeGroup =
  | "iam"
  | "network"
  | "database"
  | "storage"
  | "compute"
  | "dns"
  | "kms"
  | "unknown";

function normalizeProviderSource(providerName: string): string {
  const match = providerName.match(/provider\["([^"]+)"\]/);

  return match?.[1] ?? providerName;
}

export function getProviderShortName(provider_name?: string): string {
  if (!provider_name?.trim()) {
    return "unknown";
  }

  const normalizedSource = normalizeProviderSource(provider_name.trim());
  const lastSegment =
    normalizedSource.split("/").filter(Boolean).pop() ?? normalizedSource;
  const shortName = lastSegment.split(".").filter(Boolean)[0] ?? "";

  return shortName || "unknown";
}

export function getResourceTypeGroup(resourceType: string): ResourceTypeGroup {
  const normalizedType = resourceType.trim().toLowerCase();

  if (!normalizedType) {
    return "unknown";
  }

  const networkKeywords = [
    "security_group",
    "subnet",
    "vpc",
    "network",
    "firewall",
    "route",
    "gateway",
    "load_balancer",
    "lb_",
    "target_group",
  ];
  const databaseKeywords = [
    "db_",
    "database",
    "rds",
    "sql_",
    "spanner",
    "redis",
    "postgres",
    "mysql",
  ];
  const storageKeywords = [
    "bucket",
    "storage_account",
    "storage_bucket",
    "filesystem",
    "efs",
    "blob",
  ];
  const iamKeywords = [
    "_iam_",
    "service_account",
    "_role",
    "_policy",
    "role_assignment",
    "rbac",
    "permission_set",
    "access_policy",
  ];
  const computeKeywords = [
    "instance",
    "launch_template",
    "autoscaling",
    "compute",
    "virtual_machine",
    "node_group",
  ];
  const dnsKeywords = ["route53", "dns", "record", "zone"];
  const kmsKeywords = ["kms_", "key_ring", "crypto_key", "_key", "_alias"];

  if (networkKeywords.some((keyword) => normalizedType.includes(keyword))) {
    return "network";
  }

  if (databaseKeywords.some((keyword) => normalizedType.includes(keyword))) {
    return "database";
  }

  if (storageKeywords.some((keyword) => normalizedType.includes(keyword))) {
    return "storage";
  }

  if (iamKeywords.some((keyword) => normalizedType.includes(keyword))) {
    return "iam";
  }

  if (computeKeywords.some((keyword) => normalizedType.includes(keyword))) {
    return "compute";
  }

  if (dnsKeywords.some((keyword) => normalizedType.includes(keyword))) {
    return "dns";
  }

  if (kmsKeywords.some((keyword) => normalizedType.includes(keyword))) {
    return "kms";
  }

  return "unknown";
}
