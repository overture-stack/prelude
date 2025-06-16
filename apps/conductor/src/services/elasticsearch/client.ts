/**
 * Elasticsearch Client Module
 *
 * Enhanced with ErrorFactory patterns for better error handling and user feedback.
 * Provides functions for creating and managing Elasticsearch client connections.
 */

import { Client, ClientOptions } from "@elastic/elasticsearch";
import { Config } from "../../types/cli";
import { ErrorFactory } from "../../utils/errors";
import { Logger } from "../../utils/logger";

/**
 * Interface for Elasticsearch client options with enhanced validation
 */
interface ESClientOptions {
  url: string;
  username?: string;
  password?: string;
  requestTimeout?: number;
  retries?: number;
}

/**
 * Enhanced client creation from application config with comprehensive validation
 *
 * @param config - Application configuration
 * @returns A configured Elasticsearch client instance
 * @throws Enhanced ConductorError if client creation fails
 */
export function createClientFromConfig(config: Config): Client {
  // Enhanced URL validation and defaults
  const url = validateAndNormalizeUrl(config.elasticsearch?.url);

  Logger.info`Connecting to Elasticsearch at: ${url}`;

  // Validate authentication configuration
  const authConfig = validateAuthConfiguration(config.elasticsearch);

  // Create client options with enhanced validation
  const esClientOptions: ESClientOptions = {
    url,
    username: authConfig.user,
    password: authConfig.password,
    requestTimeout: 30000, // Increased default timeout
    retries: 3,
  };

  return createClient(esClientOptions);
}

/**
 * Enhanced connection validation with detailed health information
 *
 * @param client - Elasticsearch client instance
 * @returns Promise resolving to true if connection is valid
 * @throws Enhanced ConductorError with specific guidance if connection fails
 */
export async function validateConnection(client: Client): Promise<boolean> {
  try {
    Logger.debug`Validating Elasticsearch connection...`;

    // Enhanced connection test with timeout
    const startTime = Date.now();
    const [infoResult, healthResult] = await Promise.all([
      Promise.race([
        client.info(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Info request timeout")), 10000)
        ),
      ]),
      Promise.race([
        client.cluster.health(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Health check timeout")), 10000)
        ),
      ]).catch(() => null), // Health check is optional
    ]);

    const responseTime = Date.now() - startTime;

    // Extract connection information
    const info = (infoResult as any).body;
    const health = healthResult ? (healthResult as any).body : null;

    // Log detailed connection information
    Logger.debug`Connected to Elasticsearch cluster successfully (${responseTime}ms)`;
    Logger.debug`Cluster: ${info.cluster_name}`;
    Logger.debug`Version: ${info.version.number}`;

    if (health) {
      Logger.debug`Cluster Status: ${health.status}`;
      Logger.debug`Active Nodes: ${health.number_of_nodes}`;

      // Provide health warnings
      if (health.status === "red") {
        Logger.warn`Cluster health is RED - some data may be unavailable`;
        Logger.tipString("Check cluster configuration and node status");
      } else if (health.status === "yellow") {
        Logger.warn`Cluster health is YELLOW - replicas may be missing`;
        Logger.tipString(
          "This is often normal for single-node development clusters"
        );
      }
    }

    // Version compatibility check
    validateElasticsearchVersion(info.version.number);

    return true;
  } catch (error: any) {
    // Enhanced error analysis
    const connectionError = analyzeConnectionError(error);
    throw connectionError;
  }
}

/**
 * Enhanced URL validation and normalization
 */
function validateAndNormalizeUrl(url?: string): string {
  if (!url) {
    Logger.info`No Elasticsearch URL specified, using default: http://localhost:9200`;
    return "http://localhost:9200";
  }

  // Validate URL format
  try {
    const parsedUrl = new URL(url);

    // Validate protocol
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw ErrorFactory.config(
        `Invalid Elasticsearch URL protocol: ${parsedUrl.protocol}`,
        "url",
        [
          "Use HTTP or HTTPS protocol",
          "Example: http://localhost:9200",
          "Example: https://elasticsearch.company.com:9200",
          "Check if SSL/TLS is required",
        ]
      );
    }

    // Validate port
    if (parsedUrl.port && isNaN(parseInt(parsedUrl.port))) {
      throw ErrorFactory.config(
        `Invalid port in Elasticsearch URL: ${parsedUrl.port}`,
        "url",
        [
          "Use a valid port number",
          "Default Elasticsearch port is 9200",
          "Check your Elasticsearch configuration",
          "Example: http://localhost:9200",
        ]
      );
    }

    // Log URL details for debugging
    Logger.debug`Elasticsearch URL validated: ${parsedUrl.protocol}//${parsedUrl.host}`;

    return url;
  } catch (error) {
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }

    throw ErrorFactory.config(
      `Invalid Elasticsearch URL format: ${url}`,
      "url",
      [
        "Use a valid URL format with protocol",
        "Example: http://localhost:9200",
        "Example: https://elasticsearch.company.com:9200",
        "Check for typos in the URL",
        "Ensure proper protocol (http:// or https://)",
      ]
    );
  }
}

/**
 * Enhanced authentication configuration validation
 */
function validateAuthConfiguration(esConfig: any): {
  user?: string;
  password?: string;
} {
  const user = esConfig?.user;
  const password = esConfig?.password;

  // If one auth field is provided, both should be provided
  if ((user && !password) || (!user && password)) {
    throw ErrorFactory.config(
      "Incomplete Elasticsearch authentication configuration",
      "authentication",
      [
        "Provide both username and password, or neither",
        "Use --user and --password parameters together",
        "Set both ELASTICSEARCH_USER and ELASTICSEARCH_PASSWORD environment variables",
        "Check if authentication is required for your Elasticsearch instance",
      ]
    );
  }

  if (user && password) {
    Logger.debug`Using authentication for user: ${user}`;

    // Validate username format
    if (typeof user !== "string" || user.trim() === "") {
      throw ErrorFactory.config(
        "Invalid Elasticsearch username format",
        "user",
        [
          "Username must be a non-empty string",
          "Check username spelling and format",
          "Verify username exists in Elasticsearch",
        ]
      );
    }

    // Validate password format
    if (typeof password !== "string" || password.trim() === "") {
      throw ErrorFactory.config(
        "Invalid Elasticsearch password format",
        "password",
        [
          "Password must be a non-empty string",
          "Check password is correct",
          "Verify password hasn't expired",
        ]
      );
    }
  } else {
    Logger.debug`Using Elasticsearch without authentication`;
  }

  return { user, password };
}

/**
 * Enhanced client options creation with validation
 */
function createClientOptions(options: ESClientOptions): ClientOptions {
  const clientOptions: ClientOptions = {
    node: options.url,
    requestTimeout: options.requestTimeout || 30000,
    maxRetries: options.retries || 3,
    resurrectStrategy: "ping",
    sniffOnStart: false, // Disable sniffing for simpler setup
    sniffOnConnectionFault: false,
  };

  // Add authentication if provided
  if (options.username && options.password) {
    clientOptions.auth = {
      username: options.username,
      password: options.password,
    };
  }

  return clientOptions;
}

/**
 * Enhanced Elasticsearch client creation with error handling
 */
function createClient(options: ESClientOptions): Client {
  try {
    const clientOptions = createClientOptions(options);
    const client = new Client(clientOptions);

    Logger.debug`Elasticsearch client created successfully`;

    return client;
  } catch (error) {
    throw ErrorFactory.connection(
      "Failed to create Elasticsearch client",
      "Elasticsearch",
      options.url,
      [
        "Check Elasticsearch configuration parameters",
        "Verify URL format and accessibility",
        "Ensure authentication credentials are correct",
        "Check client library compatibility",
        "Review connection settings",
      ]
    );
  }
}

/**
 * Validate Elasticsearch version compatibility
 */
function validateElasticsearchVersion(version: string): void {
  try {
    const versionParts = version.split(".").map((part) => parseInt(part));
    const majorVersion = versionParts[0];
    const minorVersion = versionParts[1];

    // Check for supported versions (7.x and 8.x)
    if (majorVersion < 7) {
      Logger.warn`Elasticsearch version ${version} is quite old and may have compatibility issues`;
      Logger.tipString(
        "Consider upgrading to Elasticsearch 7.x or 8.x for better features and support"
      );
    } else if (majorVersion > 8) {
      Logger.warn`Elasticsearch version ${version} is newer than tested versions`;
      Logger.tipString(
        "This client library may not support all features of this Elasticsearch version"
      );
    } else {
      Logger.debug`Elasticsearch version ${version} is supported`;
    }

    // Specific version warnings
    if (majorVersion === 7 && minorVersion < 10) {
      Logger.warn`Elasticsearch 7.${minorVersion} has known issues with some operations`;
      Logger.tipString(
        "Consider upgrading to Elasticsearch 7.10+ for better stability"
      );
    }
  } catch (error) {
    Logger.debug`Could not parse Elasticsearch version: ${version}`;
    // Don't throw - version parsing is informational
  }
}

/**
 * Enhanced connection error analysis
 */
function analyzeConnectionError(error: any): Error {
  const errorMessage = error.message || String(error);

  // Connection refused
  if (errorMessage.includes("ECONNREFUSED")) {
    return ErrorFactory.connection(
      "Cannot connect to Elasticsearch - connection refused",
      "Elasticsearch",
      undefined,
      [
        "Check that Elasticsearch is running",
        "Verify the URL and port are correct",
        "Ensure no firewall is blocking the connection",
        "Check if Elasticsearch is binding to the correct interface",
        "Test with: curl http://localhost:9200",
      ]
    );
  }

  // Timeout errors
  if (errorMessage.includes("timeout") || errorMessage.includes("ETIMEDOUT")) {
    return ErrorFactory.connection(
      "Elasticsearch connection timed out",
      "Elasticsearch",
      undefined,
      [
        "Elasticsearch may be starting up or overloaded",
        "Check Elasticsearch service health and performance",
        "Verify network connectivity and latency",
        "Consider increasing timeout settings",
        "Check system resources (CPU, memory, disk space)",
        "Review Elasticsearch logs for performance issues",
      ]
    );
  }

  // Authentication errors
  if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
    return ErrorFactory.connection(
      "Elasticsearch authentication failed",
      "Elasticsearch",
      undefined,
      [
        "Check username and password are correct",
        "Verify authentication credentials haven't expired",
        "Ensure user has proper cluster permissions",
        "Check if authentication is enabled on this Elasticsearch instance",
        "Review Elasticsearch security configuration",
      ]
    );
  }

  // Permission errors
  if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
    return ErrorFactory.connection(
      "Elasticsearch access forbidden - insufficient permissions",
      "Elasticsearch",
      undefined,
      [
        "User lacks necessary cluster or index permissions",
        "Check user roles and privileges in Elasticsearch",
        "Verify cluster-level permissions",
        "Contact Elasticsearch administrator for access",
        "Review security policy and user roles",
      ]
    );
  }

  // SSL/TLS errors
  if (
    errorMessage.includes("SSL") ||
    errorMessage.includes("certificate") ||
    errorMessage.includes("CERT")
  ) {
    return ErrorFactory.connection(
      "Elasticsearch SSL/TLS connection error",
      "Elasticsearch",
      undefined,
      [
        "Check SSL certificate validity and trust",
        "Verify TLS configuration matches server settings",
        "Ensure proper SSL/TLS version compatibility",
        "Check if HTTPS is required for this instance",
        "Try HTTP if HTTPS is causing issues (development only)",
        "Verify certificate authority and trust chain",
      ]
    );
  }

  // DNS resolution errors
  if (
    errorMessage.includes("ENOTFOUND") ||
    errorMessage.includes("getaddrinfo")
  ) {
    return ErrorFactory.connection(
      "Cannot resolve Elasticsearch hostname",
      "Elasticsearch",
      undefined,
      [
        "Check hostname spelling in the URL",
        "Verify DNS resolution is working",
        "Try using IP address instead of hostname",
        "Check network connectivity and DNS servers",
        "Test with: nslookup <hostname>",
        "Verify hosts file doesn't have conflicting entries",
      ]
    );
  }

  // Version compatibility errors
  if (
    errorMessage.includes("version") ||
    errorMessage.includes("compatibility")
  ) {
    return ErrorFactory.connection(
      "Elasticsearch version compatibility issue",
      "Elasticsearch",
      undefined,
      [
        "Check Elasticsearch version compatibility with client",
        "Verify client library version supports your Elasticsearch version",
        "Update client library if needed",
        "Check Elasticsearch version with: GET /",
        "Review compatibility matrix in documentation",
        "Consider upgrading Elasticsearch or downgrading client",
      ]
    );
  }

  // Network errors
  if (
    errorMessage.includes("ENOTCONN") ||
    errorMessage.includes("ECONNRESET")
  ) {
    return ErrorFactory.connection(
      "Elasticsearch network connection error",
      "Elasticsearch",
      undefined,
      [
        "Network connection was interrupted",
        "Check network stability and connectivity",
        "Verify Elasticsearch service stability",
        "Check for network proxies or load balancers",
        "Review firewall and security group settings",
        "Consider connection pooling or retry strategies",
      ]
    );
  }

  // Generic connection error with enhanced context
  return ErrorFactory.connection(
    `Elasticsearch connection failed: ${errorMessage}`,
    "Elasticsearch",
    undefined,
    [
      "Check Elasticsearch service is running and accessible",
      "Verify connection parameters (URL, auth, etc.)",
      "Review network connectivity and firewall settings",
      "Check Elasticsearch service logs for errors",
      "Test basic connectivity with curl or similar tool",
      "Ensure Elasticsearch is properly configured",
      "Use --debug flag for detailed connection information",
    ]
  );
}
