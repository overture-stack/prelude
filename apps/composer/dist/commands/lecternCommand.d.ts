import { Command } from "./baseCommand";
import { CLIOutput } from "../types";
export declare class DictionaryCommand extends Command {
    protected readonly defaultOutputFileName = "dictionary.json";
    constructor();
    /**
     * Override isUsingDefaultPath to handle dictionary-specific defaults
     */
    protected isUsingDefaultPath(cliOutput: CLIOutput): boolean;
    protected validate(cliOutput: CLIOutput): Promise<void>;
    protected execute(cliOutput: CLIOutput): Promise<any>;
}
//# sourceMappingURL=lecternCommand.d.ts.map