# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
