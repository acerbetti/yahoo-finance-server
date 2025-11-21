/**
 * News Scraper Utility
 * Handles article scraping from Yahoo Finance
 */

import https from "https";
import { IncomingHttpHeaders } from "http";
import { load as cheerioLoad } from "cheerio";
import { log } from "./logger";
import type { NewsJson, StoryAtom } from "../types";


/**
 * Fetch article content from a URL with redirect handling.
 *
 * @param articleUrl - The URL to fetch
 * @param redirectCount - Number of redirects followed (to prevent infinite loops)
 * @returns Promise resolving to article content and metadata
 * @throws Error if too many redirects occur or network request fails
 */
export async function fetchArticleContent(
  articleUrl: string,
  redirectCount: number = 0
): Promise<{ data: string; status: number; headers: IncomingHttpHeaders; finalUrl: string }> {
  // Prevent infinite redirect loops
  if (redirectCount > 5) {
    throw new Error("Too many redirects");
  }

  log(
    "debug",
    `Fetching article content from ${articleUrl} (redirect count: ${redirectCount})`
  );

  const urlObj = new URL(articleUrl);
  const options = {
    hostname: urlObj.hostname,
    path: urlObj.pathname + urlObj.search,
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
    timeout: 10000,
    maxHeaderSize: 131072, // 128KB header limit
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          data,
          status: res.statusCode,
          headers: res.headers,
          finalUrl: articleUrl,
        });
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.end();
  });
}

/**
 * Extract article content from HTML.
 *
 * @param html - The HTML content to parse
 * @returns Object containing extracted title and content
 */
export function extractArticleContent(html: string): {
  title: string;
  content: string;
} {
  const $ = cheerioLoad(html);

  // Debug: log the title tag and some content
  log("debug", `HTML title tag: ${$("title").text()}`);
  log("debug", `H1 tags found: ${$("h1").length}`);
  log("debug", `H1.caas-title found: ${$("h1.caas-title").length}`);

  // Extract title - try JSON data first (for /m/ URLs), then HTML selectors
  let title = "";

  // First, try to extract title from JSON data in script tags (for /m/ URLs)
  const scriptTags = $('script[type="application/json"]');
  log("debug", `Found ${scriptTags.length} JSON script tags`);

  for (let i = 0; i < scriptTags.length; i++) {
    try {
      const scriptContent = $(scriptTags[i]).html();
      if (scriptContent && scriptContent.includes("storyAtoms")) {
        const jsonData = JSON.parse(scriptContent) as NewsJson;
        // Try to extract title from JSON data
        if (jsonData.headline || jsonData.title) {
          title = jsonData.headline || jsonData.title;
          log("debug", `Title extracted from JSON: "${title}"`);
          break;
        }
      }
    } catch (e) {
      log(
        "debug",
        `Failed to parse JSON script tag ${i}: ${(e as Error).message}`
      );
    }
  }

  // Fallback: try HTML selectors if title not found in JSON
  if (!title) {
    title = $("h1").first().text().trim();
    if (!title) {
      title = $("h1.caas-title").text().trim();
    }
    if (!title) {
      title = $("title").text().trim();
    }
  }

  log("debug", `Final extracted title: "${title}"`);

  // Extract main content - try multiple selectors and JSON data
  let content = "";

  // First, try to extract from JSON data in script tags (for /m/ URLs)
  for (let i = 0; i < scriptTags.length; i++) {
    try {
      const scriptContent = $(scriptTags[i]).html();
      if (scriptContent && scriptContent.includes("storyAtoms")) {
        const jsonData = JSON.parse(scriptContent) as NewsJson;
        if (
          jsonData.body &&
          jsonData.body.items &&
          jsonData.body.items[0] &&
          jsonData.body.items[0].data &&
          jsonData.body.items[0].data.storyAtoms
        ) {
          const storyAtoms = jsonData.body.items[0].data.storyAtoms;
          const textAtoms = storyAtoms.filter(
            (atom: StoryAtom) => atom.type === "text"
          );
          content = textAtoms.map((atom: StoryAtom) => atom.content).join("\n\n");
          log(
            "debug",
            `Content extracted from JSON: ${content.substring(0, 100)}...`
          );
          if (content) break;
        }
      }
    } catch (e) {
      log(
        "debug",
        `Failed to parse JSON script tag ${i}: ${(e as Error).message}`
      );
    }
  }

  // Fallback: try the main article body selectors (for /news/ URLs)
  if (!content) {
    const bodySelectors = [
      "div.caas-body",
      'div[data-testid="article-body"]',
      "div.article-body",
      "div.content",
      "article",
    ];

    for (const selector of bodySelectors) {
      const element = $(selector);
      log(
        "debug",
        `Trying selector "${selector}": found ${element.length} elements`
      );
      if (element.length > 0) {
        // Get all paragraphs within the body
        const paragraphs = element
          .find("p")
          .map((i, el) => $(el).text().trim())
          .get();
        content = paragraphs.join("\n\n");
        log(
          "debug",
          `Content from selector "${selector}": ${content.substring(0, 100)}...`
        );
        if (content) break;
      }
    }
  }

  // Fallback: get all paragraphs if no specific body found
  if (!content) {
    const allParagraphs = $("p")
      .map((i, el) => $(el).text().trim())
      .get();
    content = allParagraphs.slice(0, 20).join("\n\n"); // Limit to first 20 paragraphs
  }

  return { title, content };
}
