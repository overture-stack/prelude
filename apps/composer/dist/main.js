#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cli_1 = require("./cli");
const commandRegistry_1 = require("./commands/commandRegistry");
const errors_1 = require("./utils/errors"); // UPDATED: Import from utils/errors
const logger_1 = require("./utils/logger");
async function main() {
    try {
        const cliOutput = await (0, cli_1.setupCLI)();
        logger_1.Logger.debug `  Version: 1.0.0`;
        logger_1.Logger.debug `  Profile: ${cliOutput.profile}`;
        logger_1.Logger.initialize();
        logger_1.Logger.debug `Starting CLI setup`;
        logger_1.Logger.debug `Executing command via registry`;
        await commandRegistry_1.CommandRegistry.execute(cliOutput.profile, cliOutput);
    }
    catch (error) {
        (0, errors_1.handleError)(error, () => { });
    }
}
main().catch(errors_1.handleError);
//# sourceMappingURL=main.js.map