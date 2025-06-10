#!/usr/bin/env node

import { setupCLI } from "./cli";
import { CommandRegistry } from "./commands/commandRegistry";
import { ErrorService } from "./services/errorService";
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
    ErrorService.handle(error, () => {
      Logger.section("Available Commands");
      CommandRegistry.showHelp();
    });
  }
}

main().catch(ErrorService.handle);
