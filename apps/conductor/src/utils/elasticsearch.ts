import { Client } from "@elastic/elasticsearch";
import { Config } from "../types";
import chalk from "chalk";

export function createClient(config: Config): Client {
  const clientConfig: any = {
    node: config.elasticsearch.url,
  };

  // Only add auth if both username and password are provided
  if (config.elasticsearch.user && config.elasticsearch.password) {
    clientConfig.auth = {
      username: config.elasticsearch.user,
      password: config.elasticsearch.password,
    };
  }

  return new Client(clientConfig);
}

export async function sendBulkWriteRequest(
  client: Client,
  records: any[],
  indexName: string,
  onFailure: (count: number) => void
): Promise<void> {
  try {
    const body = records.flatMap((doc) => [
      { index: { _index: indexName } },
      doc,
    ]);

    const { body: result } = await client.bulk({
      body,
      refresh: true,
    });

    if (result.errors) {
      let failureCount = 0;
      result.items.forEach((item: any) => {
        if (item.index?.error) {
          failureCount++;
          process.stdout.write(chalk.red("\nError details:"));
          console.error({
            status: item.index.status,
            error: item.index.error,
            document: item.index._id,
          });
        }
      });
      onFailure(failureCount);
    }
  } catch (error) {
    onFailure(records.length);
    process.stdout.write(
      chalk.red("\nError sending to Elasticsearch: ") + error + "\n"
    );
    throw error;
  }
}
