/**
 * TEMPORARY COMPATIBILITY SHIM
 * Re-exports types from legacy @shared/types so callers can switch to @platform/sdk/types
 * without breaking. Remove once domain types are split into per-service packages.
 */
// eslint-disable-next-line import/no-restricted-imports
export * from '@shared/types';