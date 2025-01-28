"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = createClient;
exports.sendBulkWriteRequest = sendBulkWriteRequest;
const elasticsearch_1 = require("@elastic/elasticsearch");
const chalk_1 = __importDefault(require("chalk"));
function createClient(config) {
    return new elasticsearch_1.Client({
        node: config.elasticsearch.url,
        auth: {
            username: config.elasticsearch.user,
            password: config.elasticsearch.password
        }
    });
}
async function sendBulkWriteRequest(client, records, indexName, onFailure) {
    try {
        const body = records.flatMap(doc => [
            { index: { _index: indexName } },
            doc
        ]);
        const { body: result } = await client.bulk({
            body,
            refresh: true
        });
        if (result.errors) {
            let failureCount = 0;
            result.items.forEach((item) => {
                var _a;
                if ((_a = item.index) === null || _a === void 0 ? void 0 : _a.error) {
                    failureCount++;
                    process.stdout.write(chalk_1.default.red('\nError details:'));
                    console.error({
                        status: item.index.status,
                        error: item.index.error,
                        document: item.index._id
                    });
                }
            });
            onFailure(failureCount);
        }
    }
    catch (error) {
        onFailure(records.length);
        process.stdout.write(chalk_1.default.red('\nError sending to Elasticsearch: ') + error + '\n');
        throw error;
    }
}
