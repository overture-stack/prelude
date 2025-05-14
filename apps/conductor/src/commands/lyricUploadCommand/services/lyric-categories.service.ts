import axios from "axios";
import { Logger } from "../../../utils/logger";
import { LyricCategory } from "../interfaces/lyric-category.interface";

/**
 * Service for managing Lyric categories
 */
export class LyricCategoriesService {
  /**
   * Fetches available categories from Lyric
   * @param lyricUrl Base URL for Lyric service
   * @returns Array of category information
   */
  static async fetchCategories(lyricUrl: string): Promise<LyricCategory[]> {
    try {
      const url = `${lyricUrl.replace(/\/$/, "")}/category`;
      Logger.debug(`Fetching categories from: ${url}`);

      const response = await axios.get(url, {
        headers: { accept: "application/json" },
        timeout: 10000,
      });

      if (Array.isArray(response.data)) {
        return response.data;
      }

      return [];
    } catch (error) {
      Logger.debug(
        `Error fetching categories: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return [];
    }
  }

  /**
   * Formats available categories for display
   * @param categories Array of Lyric categories
   * @returns Formatted string of categories with IDs and names
   */
  static formatCategories(categories: LyricCategory[]): string {
    if (!categories || categories.length === 0) {
      return "No categories available";
    }

    return categories.map((cat) => `${cat.id} (${cat.name})`).join(", ");
  }

  /**
   * Validates if a category ID exists in the available categories
   * @param categoryId Category ID to validate
   * @param categories Array of available categories
   * @returns True if category ID is valid
   */
  static validateCategoryId(
    categoryId: string | number,
    categories: LyricCategory[]
  ): boolean {
    if (!categories || categories.length === 0) {
      return false;
    }

    const categoryIdStr = String(categoryId);
    const categoryIdNum = Number(categoryId);

    return categories.some(
      (cat) =>
        String(cat.id) === categoryIdStr ||
        (Number.isInteger(categoryIdNum) && cat.id === categoryIdNum) ||
        cat.name === categoryIdStr
    );
  }
}
