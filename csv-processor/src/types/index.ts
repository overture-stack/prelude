export interface SubmissionMetadata {
    submitter_id: string;
    processing_started: string;
    processed_at: string;
    source_file: string;
    record_number: number;
    hostname: string;
    username: string;
}

export interface Record {
    submission_metadata: SubmissionMetadata;
    [key: string]: any; // Allow any string key with any value type
}

export interface Config {
    elasticsearch: {
        url: string;
        index: string;
        user: string;
        password: string;
    };
    batchSize: number;
    delimiter: string;
}

export interface ElasticsearchError extends Error {
    name: string;
}