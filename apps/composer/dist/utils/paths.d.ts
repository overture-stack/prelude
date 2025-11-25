/**
 * Base directory for all configuration files
 */
export declare const BASE_CONFIG_DIR = "configs";
/**
 * Configuration paths organized by type
 */
export declare const CONFIG_PATHS: {
    readonly song: {
        readonly dir: string;
        readonly schema: string;
    };
    readonly lectern: {
        readonly dir: string;
        readonly dictionary: string;
    };
    readonly elasticsearch: {
        readonly dir: string;
        readonly mapping: string;
    };
    readonly arranger: {
        readonly dir: string;
        readonly configs: string;
    };
    readonly postgres: {
        readonly dir: string;
        readonly table: string;
    };
    readonly samples: {
        readonly fileMetadata: "data/sampleData/fileMetadata.json";
        readonly tabular: "data/tabularData.csv";
    };
};
//# sourceMappingURL=paths.d.ts.map