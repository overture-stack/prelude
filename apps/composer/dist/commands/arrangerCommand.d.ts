import { Command } from "./baseCommand";
import { CLIOutput } from "../types";
/**
 * Command implementation for generating Arranger configurations
 * Takes an Elasticsearch mapping file as input and generates the required
 * configuration files for setting up Arranger
 */
export declare class ArrangerCommand extends Command {
    protected readonly defaultOutputFileName = "configs";
    constructor();
    /**
     * Override isUsingDefaultPath to handle arranger-specific defaults
     */
    protected isUsingDefaultPath(cliOutput: CLIOutput): boolean;
    /**
     * Validates the command input parameters
     * @param cliOutput The CLI output containing command parameters
     * @throws {ComposerError} If validation fails
     */
    protected validate(cliOutput: CLIOutput): Promise<void>;
    /**
     * Executes the command to generate Arranger configurations
     * @param cliOutput The CLI output containing command parameters
     * @returns The generated configurations
     * @throws {ComposerError} If generation fails
     */
    protected execute(cliOutput: CLIOutput): Promise<any>;
}
//# sourceMappingURL=arrangerCommand.d.ts.map