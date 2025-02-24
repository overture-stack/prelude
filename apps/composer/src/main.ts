#!/usr/bin/env node

import { setupCLI } from "./cli";
import { CommandFactory } from "./commands/Commandfactory";
import { handleError } from "./utils/errors";
import { Logger } from "./utils/logger";
import chalk from "chalk";

async function main() {
  try {
    // Initialize logger first thing
    Logger.initialize();
    Logger.debug("Starting CLI setup");

    const cliOutput = await setupCLI();

    Logger.header(" ♬♪ Composer: Overture configurations generator");
    console.log(chalk.grey.italic(`Version: 1.0.0-beta`));
    console.log(chalk.grey.italic(`Profile: ${cliOutput.profile}`));
    Logger.generic("");

    Logger.debug("Creating command instance");
    const command = CommandFactory.createCommand(cliOutput.profile);

    Logger.debug("Running command");
    await command.run(cliOutput);
  } catch (error) {
    handleError(error);
  }
}

main();
