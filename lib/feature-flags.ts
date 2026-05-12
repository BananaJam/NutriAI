export function isAgentLabEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_AGENT_SDK_LAB === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_AGENT_SDK_LAB === "true"
  );
}

export function isAgentLabEnabledClient() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_ENABLE_AGENT_SDK_LAB === "true"
  );
}
