#!/usr/bin/env node

import { setupCLI } from "./cli";
import { CommandFactory } from "./commands/Commandfactory";
import { handleError } from "./utils/errors";

async function main() {
  try {
    const cliOutput = await setupCLI();
    const command = CommandFactory.createCommand(cliOutput.profile);
    await command.run(cliOutput);
  } catch (error) {
    handleError(error);
  }
}

main();
