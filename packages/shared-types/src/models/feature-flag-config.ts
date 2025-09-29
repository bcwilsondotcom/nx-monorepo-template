/**
 * FeatureFlagConfig Model
 * T040 - Feature flag configuration
 */

export interface FeatureFlagConfig {
  provider: string;               // 'flipt'
  flags: FeatureFlag[];          // Feature flag definitions
  segments?: Segment[];           // User segments
  rules?: Rule[];                 // Evaluation rules
}

export interface FeatureFlag {
  key: string;                   // Flag identifier
  name: string;                  // Display name
  description: string;           // Flag purpose
  enabled: boolean;              // Default state
  variants?: Variant[];          // Flag variants for A/B testing
}

export interface Variant {
  key: string;                   // Variant identifier
  name: string;                  // Display name
  description?: string;          // Variant purpose
  weight: number;                // Distribution weight (0-100)
  attachment?: any;              // Additional data
}

export interface Segment {
  key: string;                   // Segment identifier
  name: string;                  // Display name
  description?: string;          // Segment description
  constraints: Constraint[];     // Matching rules
  match_type?: 'ALL' | 'ANY';   // How constraints are combined
}

export interface Constraint {
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATETIME';
  property: string;              // Property to evaluate
  operator: ConstraintOperator;  // Comparison operator
  value: any;                    // Value to compare against
}

export type ConstraintOperator =
  | 'eq'    // equals
  | 'neq'   // not equals
  | 'lt'    // less than
  | 'lte'   // less than or equal
  | 'gt'    // greater than
  | 'gte'   // greater than or equal
  | 'in'    // in list
  | 'nin'   // not in list
  | 'contains'
  | 'not_contains';

export interface Rule {
  flagKey: string;               // Associated flag
  segmentKey?: string;           // Target segment
  distributions: Distribution[]; // Variant distributions
  rank: number;                  // Evaluation order
}

export interface Distribution {
  variantKey: string;           // Variant identifier
  rollout: number;              // Percentage (0-100)
}