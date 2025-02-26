#!/usr/bin/env node

import { setupCLI } from "./cli";
import { CommandFactory } from "./commands/commandFactory";
import { handleError } from "./utils/errors";
import { Logger } from "./utils/logger";
import chalk from "chalk";

async function main() {
  try {
    // Initialize logger first thing
    const cliOutput = await setupCLI();

    Logger.header(`Conductor: Data Processing Pipeline`);
    console.log(chalk.grey.italic`  Version: 1.0.0`);
    console.log(chalk.grey.italic`  Profile: ${cliOutput.profile}`);
    Logger.generic(" ");
    Logger.initialize();
    Logger.debug`Starting CLI setup`;

    Logger.debug`Creating command instance`;
    const command = CommandFactory.createCommand(cliOutput.profile);

    Logger.debug`Running command`;
    await command.run(cliOutput);
  } catch (error) {
    // Let the handleError function handle this error
    handleError(error);
    // This line will never be reached due to process.exit in handleError
  }
}

// Replace the catch with a simpler approach that defers to handleError
main().catch(handleError);
