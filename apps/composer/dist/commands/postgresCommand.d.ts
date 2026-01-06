import { Command } from "./baseCommand";
import { CLIOutput } from "../types";
export declare class PostgresCommand extends Command {
    protected readonly defaultOutputFileName = "create_table.sql";
    constructor();
    /**
     * Override isUsingDefaultPath to handle postgres-specific defaults
     */
    protected isUsingDefaultPath(cliOutput: CLIOutput): boolean;
    protected validate(cliOutput: CLIOutput): Promise<void>;
    protected execute(cliOutput: CLIOutput): Promise<any>;
}
//# sourceMappingURL=postgresCommand.d.ts.map