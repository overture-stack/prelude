#!/usr/bin/env node

import { setupCLI } from "./cli";
import { CommandFactory } from "./commands/Commandfactory";
import { handleError } from "./utils/errors";
import { Logger } from "./utils/logger";

async function main() {
  try {
    // Initialize logger first thing
    Logger.initialize();

    Logger.debug("Starting CLI setup");
    const cliOutput = await setupCLI();

    Logger.debug("Creating command instance");
    const command = CommandFactory.createCommand(cliOutput.profile);

    Logger.debug("Running command");
    await command.run(cliOutput);
  } catch (error) {
    handleError(error);
  }
}

main();
