/**
 * Swagger configuration tests
 * Tests for OpenAPI/Swagger configuration
 * @module tests/config/swagger.test
 */

import { swaggerOptions } from "../../src/config/swagger.js";

describe("Swagger Configuration", () => {
  describe("swaggerOptions object", () => {
    test("should have definition property", () => {
      expect(swaggerOptions).toHaveProperty("definition");
    });

    test("should have apis property", () => {
      expect(swaggerOptions).toHaveProperty("apis");
      expect(Array.isArray(swaggerOptions.apis)).toBe(true);
    });
  });

  describe("API definition", () => {
    const { definition } = swaggerOptions;

    test("should have OpenAPI 3.0.0 format", () => {
      expect(definition.openapi).toBe("3.0.0");
    });

    test("should have API info", () => {
      expect(definition.info).toBeDefined();
      expect(definition.info.title).toBe("Yahoo Finance API Server");
      expect(definition.info.version).toBe("1.3.1");
      expect(definition.info.description).toBeDefined();
    });

    test("should have contact information", () => {
      expect(definition.info.contact).toBeDefined();
      expect(definition.info.contact.name).toBe("API Support");
      expect(definition.info.contact.url).toBeDefined();
    });

    test("should have license information", () => {
      expect(definition.info.license).toBeDefined();
      expect(definition.info.license.name).toBe("Apache 2.0");
    });

    test("should have servers configuration", () => {
      expect(definition.servers).toBeDefined();
      expect(Array.isArray(definition.servers)).toBe(true);
      expect(definition.servers.length).toBeGreaterThan(0);
    });

    test("should have component schemas", () => {
      expect(definition.components).toBeDefined();
      expect(definition.components.schemas).toBeDefined();
    });

    test("should have Error schema", () => {
      const schemas = definition.components.schemas;
      expect(schemas.Error).toBeDefined();
      expect(schemas.Error.type).toBe("object");
      expect(schemas.Error.properties.error).toBeDefined();
    });

    test("should have HealthResponse schema", () => {
      const schemas = definition.components.schemas;
      expect(schemas.HealthResponse).toBeDefined();
      expect(schemas.HealthResponse.properties.status).toBeDefined();
    });

    test("should have QuoteData schema", () => {
      const schemas = definition.components.schemas;
      expect(schemas.QuoteData).toBeDefined();
    });

    test("should have HistoricalData schema", () => {
      const schemas = definition.components.schemas;
      expect(schemas.HistoricalData).toBeDefined();
      expect(schemas.HistoricalData.type).toBe("array");
    });

    test("should have all required endpoint schemas", () => {
      const schemas = definition.components.schemas;
      const requiredSchemas = [
        "Error",
        "HealthResponse",
        "QuoteData",
        "HistoricalData",
        "CompanyInfo",
        "SearchResult",
        "TrendingResult",
        "RecommendationsResult",
        "InsightsResult",
        "ScreenerResult",
      ];

      requiredSchemas.forEach((schema) => {
        expect(schemas[schema]).toBeDefined();
      });
    });
  });
});
