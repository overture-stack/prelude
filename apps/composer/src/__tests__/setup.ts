import * as nodePath from "node:path";
import * as nodeFs from "node:fs";
import * as nodeFsPromises from "node:fs/promises";

// Determine the current file's path
const currentFilePath = process.cwd();
const projectRoot = nodePath.resolve(currentFilePath, ".");
const fixturesDir = nodePath.join(projectRoot, "/src/__fixtures__");
const outputDir = nodePath.join(fixturesDir, "output");

// Ensure output directory exists
if (!nodeFs.existsSync(outputDir)) {
  nodeFs.mkdirSync(outputDir, { recursive: true });
}

// Recursive directory removal function
async function removeDirectory(dirPath: string) {
  try {
    // Check if directory exists
    if (!nodeFs.existsSync(dirPath)) {
      return;
    }

    // Get all entries in the directory
    const entries = await nodeFsPromises.readdir(dirPath, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const fullPath = nodePath.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Recursively remove subdirectories
        await removeDirectory(fullPath);
      } else {
        // Remove files, ignoring any that don't exist
        try {
          await nodeFsPromises.unlink(fullPath);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
            console.error(`Error removing file ${fullPath}:`, error);
          }
        }
      }
    }

    // Remove the now-empty directory
    try {
      await nodeFsPromises.rmdir(dirPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error(`Error removing directory ${dirPath}:`, error);
      }
    }
  } catch (error) {
    // Log but don't throw for cleanup operations
    console.error(`Error removing directory ${dirPath}:`, error);
  }
}

// Mock file system utility
export const mockFileSystem = {
  files: new Map<string, string>(),

  addFile(path: string, content: string) {
    // Add to in-memory map
    this.files.set(path, content);

    // Also write to actual filesystem to simulate real file creation
    try {
      // Ensure directory exists
      const dir = nodePath.dirname(path);
      if (!nodeFs.existsSync(dir)) {
        nodeFs.mkdirSync(dir, { recursive: true });
      }

      // Write file
      nodeFs.writeFileSync(path, content);
    } catch (error) {
      console.error(`Error in mockFileSystem.addFile: ${error}`);
    }
  },

  getFile(path: string) {
    return this.files.get(path);
  },

  exists(path: string) {
    // Check both in-memory map and actual filesystem
    return this.files.has(path) || nodeFs.existsSync(path);
  },

  async reset() {
    this.files.clear();

    // Clean up output directory contents
    try {
      const entries = await nodeFsPromises.readdir(outputDir);
      for (const entry of entries) {
        const fullPath = nodePath.join(outputDir, entry);
        const stat = await nodeFsPromises.stat(fullPath);

        if (stat.isDirectory()) {
          // Use recursive removal for directories
          await removeDirectory(fullPath);
        } else {
          // Remove files directly, ignoring ENOENT
          try {
            await nodeFsPromises.unlink(fullPath);
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
              console.error(`Error removing file ${fullPath}:`, error);
            }
          }
        }
      }
    } catch (error) {
      // If the directory itself doesn't exist, that's fine
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error(`Error in mockFileSystem.reset: ${error}`);
      }
    }
  },
};

// Reusable test setup hook
import { beforeEach } from "node:test";
beforeEach(async () => {
  await mockFileSystem.reset();
});

// Export useful utilities
export const testUtils = {
  fixturesDir,
  outputDir,
  projectRoot,
};
