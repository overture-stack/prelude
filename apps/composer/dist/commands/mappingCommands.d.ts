import { Command } from "./baseCommand";
import { CLIOutput } from "../types";
export declare class MappingCommand extends Command {
    protected readonly defaultOutputFileName = "mapping.json";
    constructor();
    /**
     * Recursively count fields in an Elasticsearch mapping
     */
    private countFields;
    /**
     * Analyze field types in an Elasticsearch mapping
     */
    private analyzeFieldTypes;
    /**
     * Detect input file type based on content and extension
     */
    private detectFileType;
    /**
     * Override isUsingDefaultPath to handle mapping-specific defaults
     */
    protected isUsingDefaultPath(cliOutput: CLIOutput): boolean;
    protected validate(cliOutput: CLIOutput): Promise<void>;
    protected execute(cliOutput: CLIOutput): Promise<any>;
    private handleCSVMapping;
    private handleJSONMapping;
    private handleLecternMapping;
    private logMappingSummary;
}
//# sourceMappingURL=mappingCommands.d.ts.map