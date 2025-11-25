export declare const Profiles: {
    readonly GENERATE_SONG_SCHEMA: "SongSchema";
    readonly GENERATE_LECTERN_DICTIONARY: "LecternDictionary";
    readonly GENERATE_ELASTICSEARCH_MAPPING: "ElasticsearchMapping";
    readonly GENERATE_ARRANGER_CONFIGS: "ArrangerConfigs";
    readonly GENERATE_POSTGRES_TABLE: "PostgresTable";
    readonly GENERATE_CONFIGS: "GenerateConfigs";
    readonly DEFAULT: "default";
};
export type Profile = (typeof Profiles)[keyof typeof Profiles];
//# sourceMappingURL=profiles.d.ts.map