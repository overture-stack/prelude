export type ValueType = "string" | "integer" | "number" | "boolean";
export type MatchCase = "all" | "any" | "none";
export type CompareRelation = "equal" | "notEqual" | "contains" | "containedIn" | "greaterThan" | "greaterThanOrEqual" | "lesserThan" | "lesserThanOrEqual";
export interface RangeRule {
    min?: number;
    max?: number;
    exclusiveMin?: number;
    exclusiveMax?: number;
}
export interface FieldRestrictions {
    required?: boolean;
    regex?: string;
    codeList?: any[];
    range?: RangeRule;
    compare?: ComparedFieldsRule;
    count?: number | RangeRule;
    empty?: boolean;
}
export interface ComparedFieldsRule {
    fields: string | string[];
    relation: CompareRelation;
    case?: MatchCase;
}
export interface MetaData {
    [key: string]: string | number | boolean | string[] | number[] | MetaData;
}
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
export interface LecternField {
    name: string;
    description?: string;
    valueType: ValueType;
    meta?: MetaData;
    isArray?: boolean;
    delimiter?: string;
    restrictions?: FieldRestrictions | ConditionalRestriction | Array<FieldRestrictions | ConditionalRestriction>;
    unique?: boolean;
}
export interface LecternSchema {
    name: string;
    description?: string;
    meta?: MetaData;
    fields: LecternField[];
}
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
//# sourceMappingURL=lectern.d.ts.map