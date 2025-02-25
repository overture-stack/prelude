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
    handleError(error);
  }
}

main().catch((error) => {
  console.error(chalk.red("Fatal error:"));
  if (error instanceof Error) {
    console.error(chalk.red(error.message));
    if (error.stack) {
      console.error(chalk.gray(error.stack));
    }
  } else {
    console.error(chalk.red(String(error)));
  }
  process.exit(1);
});
