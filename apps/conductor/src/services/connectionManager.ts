// src/services/connectionManager.ts
/**
 * Manages database connections with automatic cleanup
 * Ensures all connections are properly closed to prevent hanging processes
 */

import { Logger } from "../utils/logger";

interface ManagedConnection {
  close: () => Promise<void>;
  name: string;
}

export class ConnectionManager {
  private connections: ManagedConnection[] = [];

  /**
   * Register a connection for automatic cleanup
   * @param connection - Any connection object with an end() method
   * @param name - Descriptive name for logging
   * @returns The original connection object
   */
  register<T extends { end?: () => Promise<void> }>(
    connection: T,
    name: string = "connection"
  ): T {
    if (connection.end) {
      this.connections.push({
        close: connection.end.bind(connection),
        name,
      });
      Logger.debug`Registered ${name} connection for cleanup`;
    }
    return connection;
  }

  /**
   * Close all registered connections
   * Continues cleanup even if some connections fail to close
   */
  async closeAll(): Promise<void> {
    if (this.connections.length === 0) {
      Logger.debug`No connections to close`;
      return;
    }

    Logger.debug`Closing ${this.connections.length} connections`;

    const closePromises = this.connections.map(async (conn) => {
      try {
        await conn.close();
        Logger.debug`✓ Closed ${conn.name} connection`;
      } catch (error) {
        Logger.debug`⚠ Error closing ${conn.name}: ${
          error instanceof Error ? error.message : String(error)
        }`;
        // Don't throw - continue closing other connections
      }
    });

    await Promise.all(closePromises);
    this.connections = []; // Clear the registry
  }

  /**
   * Get count of registered connections (useful for debugging)
   */
  getConnectionCount(): number {
    return this.connections.length;
  }
}
