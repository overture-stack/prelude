import { Command } from "commander";
import { CLIOutput } from "../types";
export declare const PROFILE_DESCRIPTIONS: Map<"SongSchema" | "LecternDictionary" | "ElasticsearchMapping" | "ArrangerConfigs" | "PostgresTable", string>;
/**
 * Configure CLI command options - separated from parsing logic
 */
export declare function configureCommandOptions(program: Command): Command;
/**
 * Parse command line arguments into structured CLIOutput
 */
export declare function parseOptions(opts: any): CLIOutput;
//# sourceMappingURL=commandOptions.d.ts.map