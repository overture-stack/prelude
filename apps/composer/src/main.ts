#!/usr/bin/env node

import { setupCLI } from "./cli";
import { CommandRegistry } from "./commands/commandRegistry";
import { handleError } from "./utils/errors"; // UPDATED: Import from utils/errors
import { Logger } from "./utils/logger";
import chalk from "chalk";

async function main() {
  try {
    const cliOutput = await setupCLI();

    Logger.header(`Conductor: Data Processing Utilities`);
    console.log(chalk.grey.italic`  Version: 1.0.0`);
    console.log(chalk.grey.italic`  Profile: ${cliOutput.profile}`);
    Logger.generic(" ");
    Logger.initialize();
    Logger.debug`Starting CLI setup`;

    Logger.debug`Executing command via registry`;
    await CommandRegistry.execute(cliOutput.profile, cliOutput);
  } catch (error) {
    // UPDATED: Use consolidated handleError function
    handleError(error, () => {
      Logger.section("Available Commands");
      CommandRegistry.showHelp();
    });
  }
}

main().catch(handleError); // UPDATED: Use consolidated handleError
