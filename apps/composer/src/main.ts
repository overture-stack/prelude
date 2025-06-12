#!/usr/bin/env node

import { setupCLI } from "./cli";
import { CommandRegistry } from "./commands/commandRegistry";
import { handleError } from "./utils/errors"; // UPDATED: Import from utils/errors
import { Logger } from "./utils/logger";

async function main() {
  try {
    const cliOutput = await setupCLI();
    Logger.debug`  Version: 1.0.0`;
    Logger.debug`  Profile: ${cliOutput.profile}`;
    Logger.initialize();
    Logger.debug`Starting CLI setup`;
    Logger.debug`Executing command via registry`;
    await CommandRegistry.execute(cliOutput.profile, cliOutput);
  } catch (error) {
    handleError(error, () => {});
  }
}

main().catch(handleError);
