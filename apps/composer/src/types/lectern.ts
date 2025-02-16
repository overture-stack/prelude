/**
 * Lectern definitions
 */

// Basic value types
export type ValueType = 'string' | 'integer' | 'number' | 'boolean';
export type MatchCase = 'all' | 'any' | 'none';

// Range rule for numeric restrictions
export interface RangeRule {
  min?: number;
  max?: number;
  exclusiveMin?: number;
  exclusiveMax?: number;
}

// Field restriction types
export interface FieldRestrictions {
  required?: boolean;
  regex?: string;
  codeList?: any[];
  range?: RangeRule;
  compare?: ComparedFieldsRule;
  count?: number | RangeRule;
  empty?: boolean;
}

// Comparison relations for fields
export type CompareRelation =
  | 'equal'
  | 'notEqual'
  | 'contains'
  | 'containedIn'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lesserThan'
  | 'lesserThanOrEqual';

// Rule for comparing field values
export interface ComparedFieldsRule {
  fields: string | string[];
  relation: CompareRelation;
  case?: MatchCase;
}

// Base structure for meta data
export interface MetaData {
  [key: string]: string | number | boolean | string[] | number[] | MetaData;
}

// Conditional restriction structure
export interface ConditionalRestriction {
  if: {
    conditions: Array<{
      fields: string[];
      match: {
        value?: any;
        codeList?: any[];
        regex?: string;
        range?: RangeRule;
        count?: number | RangeRule;
        exists?: boolean;
      };
      arrayFieldCase?: MatchCase;
      case?: MatchCase;
    }>;
    case?: MatchCase;
  };
  then: FieldRestrictions | FieldRestrictions[];
  else?: FieldRestrictions | FieldRestrictions[];
}

// Field definition
export interface LecternField {
  name: string;
  description?: string;
  valueType: ValueType;
  meta?: MetaData;
  isArray?: boolean;
  delimiter?: string;
  restrictions?:
    | FieldRestrictions
    | ConditionalRestriction
    | Array<FieldRestrictions | ConditionalRestriction>;
  unique?: boolean;
}

// Schema definition
export interface LecternSchema {
  name: string;
  description?: string;
  meta?: MetaData;
  fields: LecternField[];
}

// Main dictionary interface
export interface LecternDictionary {
  name: string;
  version: string;
  description?: string;
  meta?: MetaData;
  schemas: LecternSchema[];
  references?: {
    [key: string]: any;
  };
}
