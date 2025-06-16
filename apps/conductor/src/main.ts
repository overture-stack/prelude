#!/usr/bin/env node

import { setupCLI } from "./cli";
import { CommandRegistry } from "./commands/commandRegistry";
import { handleError } from "./utils/errors";
import { Logger } from "./utils/logger";

async function main() {
  try {
    // Enable debug mode from environment BEFORE any logging
    if (process.argv.includes("--debug")) {
      Logger.enableDebug();
    }

    const cliOutput = await setupCLI();
    Logger.debug`Version: 1.0.0`;
    Logger.debug`Profile: ${cliOutput.profile}`;

    // Initialize other logger settings (not debug mode again)
    Logger.initialize();

    Logger.debug`Starting CLI setup`;
    Logger.debug`Executing command via registry`;
    await CommandRegistry.execute(cliOutput.profile, cliOutput);
  } catch (error) {
    handleError(error, () => {});
  }
}
main().catch(handleError);
