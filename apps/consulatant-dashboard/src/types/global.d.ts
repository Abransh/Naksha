/**
 * Global type definitions to fix React 18/19 compatibility issues
 * This file resolves TypeScript conflicts between React 18 runtime and React 19 types
 */

// Fix React.ReactNode compatibility
declare global {
  namespace React {
    // Ensure ReactNode is compatible with both React 18 and 19
    type ReactNode = React.ReactChild | React.ReactFragment | React.ReactPortal | boolean | null | undefined;
  }
}

// Export to make this a module
export {};