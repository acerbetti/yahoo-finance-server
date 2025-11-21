/**
 * OpenAPI/Swagger configuration module
 * Defines the OpenAPI 3.0 specification for the API
 * @module config/swagger
 */

import { readFileSync } from "fs";
import { join } from "path";

// Read version from package.json
const packageJson = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf8")
);

/**
 * Swagger/OpenAPI configuration object
 * Defines API metadata, schemas, and documentation
 * @type {Object}
 */
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Yahoo Finance API Server",
      version: packageJson.version,
      description:
        "A comprehensive REST API for Yahoo Finance data with multi-ticker support, caching, and rate limiting",
      contact: {
        name: "API Support",
        url: "https://github.com/acerbetti/yahoo-finance-server",
      },
      license: {
        name: "Apache 2.0",
        url: "https://www.apache.org/licenses/LICENSE-2.0.html",
      },
    },
    servers: [
      {
        url: process.env.SWAGGER_SERVER_URL || "http://localhost:3000",
        description: "Current server",
      },
      {
        url: "http://host.docker.internal:3000",
        description: "Docker Desktop (Windows/Mac)",
      },
      {
        url: "http://172.17.0.1:3000",
        description: "Docker Linux default gateway",
      },
    ],
    components: {
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Error message",
            },
          },
        },
        HealthResponse: {
          type: "object",
          properties: {
            status: {
              type: "string",
              example: "ok",
            },
          },
        },
        QuoteData: {
          type: "object",
          description: "Stock quote data from Yahoo Finance",
        },
        HistoricalData: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string", format: "date-time" },
              open: { type: "number" },
              high: { type: "number" },
              low: { type: "number" },
              close: { type: "number" },
              volume: { type: "number" },
            },
          },
        },
        CompanyInfo: {
          type: "object",
          description: "Company information and profile data",
        },
        SearchResult: {
          type: "object",
          properties: {
            quotes: {
              type: "array",
              items: { type: "object" },
            },
            news: {
              type: "array",
              items: { type: "object" },
            },
            count: { type: "number" },
          },
        },
        TrendingResult: {
          type: "object",
          properties: {
            count: { type: "number" },
            quotes: {
              type: "array",
              items: { type: "object" },
            },
          },
        },
        RecommendationsResult: {
          type: "object",
          properties: {
            symbol: { type: "string" },
            recommendedSymbols: {
              type: "array",
              items: { type: "object" },
            },
          },
        },
        InsightsResult: {
          type: "object",
          description: "Comprehensive stock insights and analysis",
        },
        ScreenerResult: {
          type: "object",
          properties: {
            quotes: {
              type: "array",
              items: { type: "object" },
            },
            total: { type: "number" },
          },
        },
        ETFHoldings: {
          type: "object",
          description: "Detailed ETF holdings data",
          properties: {
            holdings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  symbol: { type: "string" },
                  holdingPercent: { type: "number" },
                },
              },
            },
            sectorWeightings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  sector: { type: "string" },
                  percentage: { type: "number" },
                },
              },
            },
            equityHoldings: {
              type: "object",
              description: "Equity holdings metrics",
            },
          },
        },
        ETFFallback: {
          type: "object",
          description:
            "Basic ETF information when detailed holdings are unavailable",
          properties: {
            fallback: { type: "boolean", example: true },
            symbol: { type: "string", example: "SPY" },
            shortName: { type: "string", example: "SPDR S&P 500 ETF Trust" },
            longName: { type: "string" },
            regularMarketPrice: { type: "number", example: 450.25 },
            marketCap: { type: "number", example: 450000000000 },
            volume: { type: "number" },
            averageVolume: { type: "number" },
            fiftyTwoWeekHigh: { type: "number" },
            fiftyTwoWeekLow: { type: "number" },
            message: {
              type: "string",
              example:
                "Detailed holdings data not available. Showing basic ETF information.",
            },
          },
        },
        FundHoldings: {
          type: "object",
          description: "Mutual fund holdings data",
          properties: {
            fundHoldings: {
              type: "object",
              properties: {
                holdings: { type: "array", items: { type: "object" } },
              },
            },
            fundProfile: {
              type: "object",
              properties: {
                categoryName: { type: "string", example: "Large Blend" },
              },
            },
          },
        },
        FinancialData: {
          type: "object",
          description: "Financial statement data",
          properties: {
            symbol: { type: "string", example: "AAPL" },
            type: {
              type: "string",
              enum: ["income", "balance", "cashflow"],
              example: "income",
            },
            period: {
              type: "string",
              enum: ["annual", "quarterly"],
              example: "annual",
            },
            data: { type: "object", description: "Financial statement data" },
          },
        },
        FinancialRatios: {
          type: "object",
          description: "Financial ratios and key statistics",
          properties: {
            summaryDetail: {
              type: "object",
              description: "Summary financial details",
            },
            defaultKeyStatistics: {
              type: "object",
              description: "Key financial statistics",
            },
            financialData: {
              type: "object",
              description: "Additional financial data",
            },
          },
        },
        NewsResult: {
          type: "object",
          description: "News articles and related information",
          properties: {
            symbol: { type: "string", example: "AAPL" },
            count: { type: "number", example: 10 },
            news: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  publisher: { type: "string" },
                  link: { type: "string" },
                  publishedAt: { type: "number" },
                  type: { type: "string" },
                  thumbnail: { type: "object" },
                  relatedTickers: { type: "array", items: { type: "string" } },
                },
              },
            },
            companyInfo: { type: "object", description: "Company information" },
            summaryInfo: {
              type: "object",
              description: "Summary financial information",
            },
            message: { type: "string" },
            dataAvailable: {
              type: "object",
              description: "Data availability flags",
            },
          },
        },
      },
    },
  },
  apis: ["./src/routes/index", "./src/mcp/server"], // Path to the API route docs
};

export { swaggerOptions };
