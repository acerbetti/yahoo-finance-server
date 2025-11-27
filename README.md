# Yahoo Finance Server

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://github.com/acerbetti/yahoo-finance-server/blob/main/LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)
[![CI](https://img.shields.io/github/actions/workflow/status/acerbetti/yahoo-finance-server/ci.yml)](https://github.com/acerbetti/yahoo-finance-server/actions)
[![Docker Image](https://img.shields.io/badge/docker-ready-blue.svg)](https://hub.docker.com/r/acerbetti/yahoo-finance-server)
[![GitHub Issues](https://img.shields.io/github/issues/acerbetti/yahoo-finance-server.svg)](https://github.com/acerbetti/yahoo-finance-server/issues)
[![GitHub Stars](https://img.shields.io/github/stars/acerbetti/yahoo-finance-server.svg)](https://github.com/acerbetti/yahoo-finance-server/stargazers)

A comprehensive Node.js Express API server that serves Yahoo Finance data using the yahoo-finance2 v3.10.2 library. Features 24 REST endpoints for financial data, 5 MCP (Model Context Protocol) tools for LLM integration, and supports multiple tickers in a single request with arrays as results and partial failure handling.

## ⚠️ Disclaimer

This is an **unofficial implementation** and has **no affiliation with Yahoo Inc.** or any of its subsidiaries. This project is not endorsed by, sponsored by, or otherwise connected to Yahoo. All data is sourced from public Yahoo Finance APIs through the yahoo-finance2 library.

## 🙏 Credits

Special thanks to the authors and maintainers of the [yahoo-finance2](https://github.com/gadicc/yahoo-finance2) library for providing the Yahoo Finance API wrapper.

## Features

- **24 REST API Endpoints** for stock quotes, history, company info, search, market data, recommendations, insights, screeners, performance analysis, financial statements, news, holdings, events, statistics, and article content extraction
- **5 MCP Tools** (Model Context Protocol) for LLM integration using official `@modelcontextprotocol/sdk` - see [MCP.md](./MCP.md) for detailed documentation
- **OpenAPI Client Compatibility** - Full support for OpenAI function calling format via `?format=openai`
- **CORS Support** - Cross-origin resource sharing enabled for web applications
- Multi-ticker support for quotes and historical data endpoints with partial failure handling
- Response caching with configurable TTL
- Rate limiting per IP address
- Comprehensive API logging with configurable levels (`error`, `warn`, `info`, `debug`)
- Docker multi-stage build with multi-architecture support (AMD64, ARM64, ARMv7)
- Health checks and proper error handling
- Jest tests with comprehensive coverage (168 tests across 19 test suites)
- **Interactive API Documentation** at `/api-docs` (Swagger UI)
- **OpenAPI JSON Specification** at `/api-docs.json`
- **Modular architecture** with separated concerns
- **TypeScript** - Fully typed codebase with strict TypeScript configuration

## Quick Start

```bash
# Clone the repository
git clone https://github.com/acerbetti/yahoo-finance-server.git
cd yahoo-finance-server

# Install dependencies
npm install

# Start the server
npm start
```

The server will be available at `http://localhost:3000` with API docs at `http://localhost:3000/api-docs`.

## API Endpoints

### Core Endpoints

- `GET /health` - Health check
- `GET /quote/:symbols` - Current stock quotes (multi-ticker support)
- `GET /history/:symbols` - Historical price data (multi-ticker support)
- `GET /search/:query` - Symbol and news search
- `GET /news-reader/*` - Article content extraction

### Ticket Endpoints

- `GET /ticket/:ticket` - Company information
- `GET /ticket/:ticket/insights` - Comprehensive stock insights
- `GET /ticket/:ticket/news` - Company-specific news
- `GET /ticket/:ticket/holdings` - ETF/mutual fund holdings
- `GET /ticket/:ticket/events` - Calendar events, earnings, and earnings history
- `GET /ticket/:ticket/statistics` - Key statistics and financial data
- `GET /ticket/:ticket/recommendations` - Similar stock recommendations
- `GET /ticket/:ticket/:type` - Financial statements (income, balance, cashflow)

### Market Data Endpoints

- `GET /market/indices` - Major market indices (S&P 500, Dow Jones, NASDAQ, Russell 2000, VIX)
- `GET /market/summary` - Comprehensive market overview (indices, trending, gainers/losers, news)
- `GET /market/sectors` - Sector performance via sector ETFs
- `GET /market/currencies` - Major currency exchange rates
- `GET /market/commodities` - Commodity prices (gold, oil, copper, etc.)
- `GET /market/breadth` - Market breadth indicators (advancers/decliners ratio)
- `GET /market/sentiment` - Market sentiment indicators (VIX, fear & greed index)
- `GET /market/trending/:region` - Regional trending symbols
- `GET /market/screener/:type` - Stock screeners (day_gainers, day_losers, most_actives)
- `GET /market/news` - General market news

### MCP Endpoints

- `POST /mcp` - MCP protocol endpoint (official SDK transport)

For detailed API documentation, see the [interactive Swagger UI](http://localhost:3000/api-docs) or [MCP.md](./MCP.md) for MCP integration details.

## Installation

1. Clone the repository:

```bash
git clone https://github.com/acerbetti/yahoo-finance-server.git
cd yahoo-finance-server
```

2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm start
```

The server will be available at `http://localhost:3000` with API docs at `http://localhost:3000/api-docs`.

## Development

### Running in Development Mode

```bash
npm run dev
```

This uses `tsx` to automatically restart the server when files change and provides TypeScript support without pre-compilation.

### Building the Project

```bash
npm run build
```

This compiles TypeScript source files to JavaScript in the `dist/` directory using the TypeScript compiler.

### Running Tests

```bash
npm test
```

This runs the Jest test suite covering 164 test cases across 19 test files.

### Environment Variables

Configure the server using environment variables:

| Variable               | Default               | Description                               |
| ---------------------- | --------------------- | ----------------------------------------- |
| `PORT`                 | 3000                  | Server port                               |
| `LOG_LEVEL`            | info                  | Logging level: error, warn, info, debug   |
| `CACHE_MODE`           | nodecache             | Cache backend: nodecache, memcached, none |
| `CACHE_HOST`           | localhost:11211       | Memcached host:port (for memcached mode)  |
| `CACHE_TTL`            | 300                   | Cache TTL in seconds (5 minutes)          |
| `RATE_LIMIT_WINDOW_MS` | 900000                | Rate limit window in ms (15 minutes)      |
| `RATE_LIMIT_MAX`       | 100                   | Max requests per window per IP            |
| `SWAGGER_SERVER_URL`   | http://localhost:3000 | Base URL for Swagger API documentation    |

**Examples:**

```bash
# Run with debug logging
LOG_LEVEL=debug npm start

# Run with custom rate limiting
RATE_LIMIT_MAX=200 RATE_LIMIT_WINDOW_MS=600000 npm start

# Run with cache disabled
CACHE_MODE=none npm start

# Run with memcached (default host)
CACHE_MODE=memcached npm start

# Run with custom memcached host
CACHE_MODE=memcached CACHE_HOST=memcached-server:11211 npm start

# Run on custom port with all custom settings
PORT=8080 LOG_LEVEL=debug CACHE_MODE=nodecache CACHE_TTL=600 npm start

# Run in Docker container (Docker Desktop)
SWAGGER_SERVER_URL=http://host.docker.internal:3000 npm start

# Run in Docker container (Linux)
SWAGGER_SERVER_URL=http://172.17.0.1:3000 npm start
```

## CORS (Cross-Origin Resource Sharing)

The API server includes CORS support to allow cross-origin requests from web applications. CORS is configured to allow requests from **any origin**, enabling integration with web applications hosted on different domains.

**CORS Configuration:**

- **Allowed Origins**: `*` (all origins)
- **Allowed Methods**: `GET, POST, PUT, DELETE, OPTIONS`
- **Allowed Headers**: `Content-Type, Authorization, X-Requested-With`
- **Credentials**: Supported

**Example CORS Headers in Response:**

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Allow-Credentials: true
```

This allows web applications (like finance.caplaz.com) to make direct API calls to the Yahoo Finance Server without proxy requirements.

## API Documentation

For detailed API documentation, see the [interactive Swagger UI](http://localhost:3000/api-docs) or [OpenAPI JSON specification](http://localhost:3000/api-docs.json).

## Releases

This project follows [Semantic Versioning](https://semver.org/). Releases are automatically created when version tags (e.g., `v2.0.0`) are pushed to the repository.

### Creating a Release

1. Update the version in `package.json`
2. Update `CHANGELOG.md` with the new changes
3. Commit the changes
4. Create and push a version tag:

```bash
git tag v2.0.0
git push origin v2.0.0
```

The CI/CD pipeline will automatically:

- Run tests
- Build and push Docker images to GitHub Packages
- Create a GitHub release

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed list of changes in each version.

## License

Apache-2.0
