import { Profiles } from "./constants";

type Profile = (typeof Profiles)[keyof typeof Profiles];

interface Config {
  elasticsearch: {
    url: string;
    user?: string;
    password?: string;
    index: string;
  };
  postgresql?: {
    connectionString?: string;
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    ssl?: boolean;
    table?: string;
    addMetadata?: boolean;
    maxConnections?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
    statementTimeout?: number;
  };
  batchSize: number;
  delimiter: string;
}

interface CLIOutput {
  profile: Profile;
  debug?: boolean;
  filePaths: string[];
  config: Config;
  options: Record<string, unknown>;
}

export { Config, CLIOutput };
