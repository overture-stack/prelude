export class Environment {
  static get isDebug(): boolean {
    return process.env.DEBUG === "true" || process.argv.includes("--debug");
  }
}
