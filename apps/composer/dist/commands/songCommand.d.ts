import { Command } from "./baseCommand";
import { CLIOutput } from "../types";
export declare class SongCommand extends Command {
    constructor();
    private sanitizeSchemaName;
    /**
     * Override isUsingDefaultPath to handle Song schema-specific defaults
     */
    protected isUsingDefaultPath(cliOutput: CLIOutput): boolean;
    protected validate(cliOutput: CLIOutput): Promise<void>;
    protected execute(cliOutput: CLIOutput): Promise<void>;
}
//# sourceMappingURL=songCommand.d.ts.map