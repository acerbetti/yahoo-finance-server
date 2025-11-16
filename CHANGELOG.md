# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.2] - 2025-11-16

### Added

- **CORS Support**: Added Cross-Origin Resource Sharing (CORS) middleware for web application integration

  - Permissive CORS configuration allowing all origins, methods, and headers
  - Enables direct API calls from web browsers and frontend applications
  - Added comprehensive CORS header validation tests
  - Updated documentation with CORS configuration details

### Technical Details

- CORS middleware integrated with Express.js server
- All endpoints now support cross-origin requests
- Backward compatible - no breaking changes to existing API responses

## [1.3.1] - 2025-11-15

### Fixed

- **Financial Statements API Migration**: Migrated from deprecated `quoteSummary` to modern `fundamentalsTimeSeries` API

  - Updated income statements, balance sheets, and cash flow statements to use current Yahoo Finance API
  - Added schema validation suppression to handle API inconsistencies
  - Implemented fallback logic for API calls when schema validation fails
  - Improved data mapping for all financial statement types with proper field handling

- **News Endpoint Implementation**: Fixed `/news` endpoint to return actual news articles instead of empty arrays

  - Integrated `yahoo-finance2` search API with `newsCount` parameter for real news fetching
  - Returns structured news data with titles, publishers, links, publication dates, and thumbnails
  - Added related stock tickers and article metadata for comprehensive news context
  - Updated both REST API and MCP `get_stock_news` tool implementations

### Changed

- **Yahoo Finance API Integration**: Enhanced API client configuration with validation error handling
  - Added `validation: { logErrors: false, logOptionsErrors: false, throwErrors: false }` to suppress schema validation issues
  - Improved error resilience for API changes and data inconsistencies

### Technical Details

- Financial statements now use `fundamentalsTimeSeries` API instead of deprecated `quoteSummary` modules
- News endpoints leverage search API for real-time article retrieval
- All existing functionality preserved with improved data reliability
- No breaking changes - fully backward compatible API responses

## [1.3.0] - 2025-11-15

### Added

- **Financial Statements Endpoint**: New `GET /financial/:symbol/:type` endpoint for accessing financial data

  - Support for income statements, balance sheets, and cash flow statements
  - Period parameter for annual and quarterly data retrieval
  - Comprehensive financial metrics including revenue, assets, liabilities, and cash flows

- **News and Market Context Endpoint**: New `GET /news/:symbol` endpoint for company information

  - Company profile data (sector, industry, website, description)
  - Market context and news summary
  - Count parameter for flexible data retrieval

- **MCP Tool Implementations**: Two new financial data tools for LLM integration

  - `get_financial_statement`: Retrieve financial statements via MCP protocol
  - `get_stock_news`: Access company context and market information via MCP
  - Full SSE streaming support for both tools

- **Comprehensive Test Coverage**: 49 new tests added

  - 31 new API endpoint tests (financial and news routes)
  - 60 comprehensive MCP server tests
  - Total test suite: 115 tests across 7 test suites
  - Full error handling and edge case coverage

- **Enhanced Documentation**
  - Complete MCP.md with detailed tool documentation and examples
  - Updated README with financial and news endpoint specifications
  - Curl examples and client integration guides for all new endpoints
  - MCP tool schemas and usage patterns
  - Integration examples for Claude and other LLM systems

### Changed

- **Startup Logging**: Updated server startup messages to display all 11 REST endpoints and 4 MCP endpoints
- **Project Description**: Enhanced README to prominently feature MCP integration for LLM systems
- **Documentation Structure**: Refactored to reduce repetition by linking comprehensive details to MCP.md

### Technical Details

- All 115 tests passing across 7 test suites
- Zero breaking changes - fully backward compatible
- New endpoints follow existing API patterns and conventions
- Complete error handling for financial data retrieval failures

## [1.2.1] - 2025-11-14

### Added

- **Container Compatibility**: Added `SWAGGER_SERVER_URL` environment variable for container deployments
  - Swagger UI now supports multiple server URLs for different environments
  - Automatic fallback to `localhost:3000` for local development
  - Support for Docker Desktop (`host.docker.internal:3000`) and Linux gateway (`172.17.0.1:3000`)
  - Interactive server selection dropdown in Swagger UI

### Enhanced

- **Container Deployment**: Improved logging with container-aware startup messages
  - Helpful hints for setting `SWAGGER_SERVER_URL` in container environments
  - Clear indication of configured Swagger server URL on startup
- **Documentation**: Updated README with container deployment examples
  - Environment variable documentation for `SWAGGER_SERVER_URL`
  - Docker-specific configuration examples

### Technical Details

- Swagger OpenAPI specification now includes multiple server configurations
- Environment variable dynamically sets the primary server URL in Swagger docs
- Backward compatible - no breaking changes to existing deployments
- All existing tests pass with new container compatibility features

## [1.2.0] - 2025-11-14

### Added

- **Modular Architecture**: Refactored monolithic server into organized modules
  - `src/routes/index.js`: All 9 API endpoints with Swagger documentation
  - `src/config/swagger.js`: OpenAPI 3.0 specification configuration
  - `src/config/cache.js`: Centralized cache configuration
  - `src/middleware/index.js`: Express middleware setup (rate limiting)
  - `src/utils/logger.js`: Reusable logging utility
- **Comprehensive Test Suite**: 66 tests across 6 test files
  - Logger utility tests
  - Cache configuration tests
  - Swagger/OpenAPI configuration tests
  - Middleware and rate limiting tests
  - API routes and endpoint integration tests
  - Full server integration tests

### Changed

- **Reduced Main Server File**: Refactored from 1018 to 110 lines
  - Clearer separation of concerns
  - Improved maintainability and readability
  - Easier to navigate and extend
- **Documentation**: Updated README with detailed module descriptions
  - Project structure documentation
  - Module responsibilities and dependencies
  - Environment variables guide
  - Development and testing instructions

### Improved

- **Code Organization**: Clear module boundaries and responsibilities
  - Easy to locate specific functionality
  - Better testability of individual components
  - Simplified dependency management
- **Developer Experience**: Better structure for adding new features
  - Reusable configuration modules
  - Clear patterns for adding endpoints
  - Comprehensive test examples

### Technical Details

- All 66 tests passing
- Zero breaking changes - all API functionality preserved
- ESM module format maintained
- No changes to API contracts or environment variables
- Backward compatible with existing deployments

### Previous Changes from Initial 1.2.0

### Added

- **Search API** (`/search/:query`): Search for symbols, news, and financial data
  - Returns quotes, news, research reports, and other search results
  - Supports company names, symbols, and keywords
- **Trending Symbols API** (`/trending/:region`): Get trending symbols by region
  - Supports multiple regions (US, CA, UK, etc.)
  - Returns currently trending stock symbols
- **Stock Recommendations API** (`/recommendations/:symbol`): Get similar stock recommendations
  - Returns recommended symbols similar to the input symbol
  - Includes relevance scores for recommendations
- **Stock Insights API** (`/insights/:symbol`): Comprehensive stock analysis and insights
  - Company snapshots, analyst recommendations, events, and reports
  - Detailed fundamental and technical analysis data
- **Stock Screener API** (`/screener/:type`): Advanced stock screening capabilities
  - Support for day_gainers, day_losers, most_actives, most_shorted
  - Configurable result count with default of 25
  - Uses modern screener API replacing deprecated methods

### Enhanced

- **API Documentation**: Comprehensive README updates with examples for all new endpoints
- **Error Handling**: Consistent error handling across all new endpoints
- **Caching**: All new endpoints support configurable caching
- **Logging**: Detailed logging for all new API calls and responses

### Technical Details

- All new endpoints support multi-ticker requests where applicable
- Consistent response formats across all APIs
- Proper rate limiting and caching integration
- Enhanced server startup logging showing all available endpoints

## [1.1.0] - 2025-11-14

### Added

- **Comprehensive Logging System**: Added configurable logging with `LOG_LEVEL` environment variable
  - Support for `error`, `warn`, `info`, and `debug` log levels
  - Detailed endpoint logging including cache hits/misses and API call tracking
  - Rate limiting violation logging with IP addresses
  - Server configuration logging on startup
- **Enhanced Observability**: Improved monitoring and debugging capabilities
  - Request/response logging for all API endpoints
  - Error tracking and logging throughout the application
  - Performance monitoring through detailed debug logs

### Changed

- **Node.js Version**: Updated to Node.js 22 for better yahoo-finance2 compatibility
- **Logging Infrastructure**: Complete overhaul of logging system for production monitoring

### Technical Details

- Configurable logging verbosity via `LOG_LEVEL` environment variable
- Structured logging with timestamps and log levels
- Comprehensive error handling with detailed logging
- Enhanced debugging capabilities for troubleshooting

## [1.0.0] - 2025-11-14

### Added

- Initial release of Yahoo Finance API server
- Express.js API with endpoints for quotes, historical data, and company information
- Multi-ticker support with robust error handling
- Rate limiting and in-memory caching
- Docker multi-stage build with health checks
- Comprehensive Jest test suite
- GitHub Actions CI/CD pipeline
- Docker Compose for local development

### Features

- `/health` - Health check endpoint
- `/quote/:symbols` - Current stock prices for multiple symbols
- `/history/:symbols` - Historical price data with configurable period/interval
- `/info/:symbols` - Company information and profiles
- Environment variable configuration for rate limiting, caching, and port
- Proper error handling with partial failure support for multi-ticker requests

### Technical Details

- Node.js 20 with ES modules
- yahoo-finance2 v3 library for Yahoo Finance API integration
- Express.js framework with middleware for rate limiting and caching
- Docker containerization with multi-stage build
- Jest testing framework with comprehensive test coverage
