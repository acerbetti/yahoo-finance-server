/**
 * OpenAPI/Swagger configuration module
 * Defines the OpenAPI 3.0 specification for the API
 * @module config/swagger
 */

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
      version: "1.2.0",
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
        url: "http://localhost:3000",
        description: "Development server",
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
      },
    },
  },
  apis: ["./src/routes/index.js"], // Path to the API route docs
};

export { swaggerOptions };
