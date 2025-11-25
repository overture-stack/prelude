import { Profiles } from "./profiles";
import { ArrangerConfig } from "./arranger";
import { PostgresConfig } from "./postgres";
export type Profile = (typeof Profiles)[keyof typeof Profiles];
export interface ElasticsearchConfig {
    index: string;
    shards: number;
    replicas: number;
    ignoredFields?: string[];
    ignoredSchemas?: string[];
    skipMetadata?: boolean;
}
export interface DictionaryConfig {
    name: string;
    description: string;
    version: string;
}
export interface SongConfig {
    name?: string;
    fileTypes?: string[];
}
export interface EnvConfig {
    inputFiles?: string[];
    outputPath?: string;
    dictionaryName?: string;
    dictionaryDescription?: string;
    dictionaryVersion?: string;
    schemaName?: string;
    fileTypes?: string[];
    esIndex?: string;
    esShards?: number;
    esReplicas?: number;
    esIgnoredFields?: string[];
    esIgnoredSchemas?: string[];
    esSkipMetadata?: boolean;
    csvDelimiter?: string;
    arrangerDocType?: string;
    postgresTableName?: string;
}
export interface CLIOutput {
    profile: Profile;
    debug?: boolean;
    filePaths: string[];
    force?: boolean;
    outputPath?: string;
    envConfig: EnvConfig;
    elasticsearchConfig: ElasticsearchConfig;
    csvDelimiter: string;
    dictionaryConfig?: DictionaryConfig;
    songConfig?: SongConfig;
    postgresConfig?: PostgresConfig;
    arrangerConfig?: ArrangerConfig;
}
//# sourceMappingURL=cli.d.ts.map