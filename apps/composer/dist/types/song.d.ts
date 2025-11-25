export interface SongOptions {
    fileTypes?: string[];
    externalValidations?: Array<{
        url?: string;
        jsonPath?: string;
    }>;
}
export interface SongSchema {
    name: string;
    options?: SongOptions;
    schema: {
        type: string;
        required: string[];
        properties: Record<string, SongField>;
    };
}
export interface SongField {
    type: string | string[];
    description?: string;
    pattern?: string;
    enum?: string[];
    items?: SongField;
    properties?: Record<string, SongField>;
    required?: string[];
    propertyNames?: {
        enum: string[];
    };
    minItems?: number;
    maxItems?: number;
}
//# sourceMappingURL=song.d.ts.map