// src/types/index.ts - Fixed to avoid duplicate exports
export * from "./elasticsearch";
export * from "./arranger";
export * from "./song";
export * from "./lectern";
export * from "./validations";

// Export profiles types explicitly to avoid conflicts
export { Profiles, type Profile } from "./profiles";

// Export CLI types
export * from "./cli";
