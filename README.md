# Yahoo Finance Server

[![Version](https://img.shields.io/npm/v/yahoo-finance-server.svg)](https://www.npmjs.com/package/yahoo-finance-server)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/acerbetti/yahoo-finance-server/blob/main/LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Docker Image](https://img.shields.io/badge/docker-ready-blue.svg)](https://hub.docker.com/r/acerbetti/yahoo-finance-server)
[![GitHub Issues](https://img.shields.io/github/issues/acerbetti/yahoo-finance-server.svg)](https://github.com/acerbetti/yahoo-finance-server/issues)
[![GitHub Stars](https://img.shields.io/github/stars/acerbetti/yahoo-finance-server.svg)](https://github.com/acerbetti/yahoo-finance-server/stargazers)

A comprehensive Node.js Express API server that serves Yahoo Finance data using the yahoo-finance2 v3.0.0 library. Features 11 REST endpoints for financial data, 11 MCP (Model Context Protocol) tools for LLM integration, and supports multiple tickers in a single request with arrays as results and partial failure handling.

## ⚠️ Disclaimer

This is an **unofficial implementation** and has **no affiliation with Yahoo Inc.** or any of its subsidiaries. This project is not endorsed by, sponsored by, or otherwise connected to Yahoo. All data is sourced from public Yahoo Finance APIs through the yahoo-finance2 library.

## 🙏 Credits

Special thanks to the authors and maintainers of the [yahoo-finance2](https://github.com/gadicc/yahoo-finance2) library for providing the Yahoo Finance API wrapper.

## Features

- **11 REST API Endpoints** for stock quotes, history, company info, search, trending, recommendations, insights, screeners, performance analysis, financial statements, and news
- **11 MCP Tools** (Model Context Protocol) for LLM integration via HTTP + SSE streaming - see [MCP.md](./MCP.md) for detailed documentation
- Multi-ticker support for all endpoints with partial failure handling
- Response caching with configurable TTL
- Rate limiting per IP address
- Comprehensive API logging with configurable levels (`error`, `warn`, `info`, `debug`)
- Docker multi-stage build with multi-architecture support (AMD64, ARM64, ARMv7)
- Health checks and proper error handling
- Jest tests with comprehensive coverage (115 tests across 7 test suites)
- **Interactive API Documentation** at `/api-docs` (Swagger UI)
- **OpenAPI JSON Specification** at `/api-docs.json`
- **Modular architecture** with separated concerns

## Project Structure

The codebase is organized into logical modules for better maintainability:

```
src/
├── server.js                 # Main Express application entry point
├── routes/
│   └── index.js             # All API endpoint handlers with Swagger docs
├── config/
│   ├── swagger.js           # OpenAPI/Swagger configuration
│   └── cache.js             # Cache configuration and instance
├── middleware/
│   └── index.js             # Express middleware (rate limiting, etc.)
├── utils/
│   └── logger.js            # Logging utility with configurable levels
└── yahoo.js                 # Yahoo Finance2 API wrapper

tests/
├── utils/
│   └── logger.test.js       # Logger utility tests
├── config/
│   ├── cache.test.js        # Cache configuration tests
│   └── swagger.test.js      # Swagger configuration tests
├── middleware/
│   └── index.test.js        # Middleware configuration tests
├── routes/
│   └── index.test.js        # API routes and endpoints tests
└── server.test.js           # Main server integration tests
```

## Module Descriptions

### `src/server.js`

The main application entry point. Sets up Express middleware, Swagger documentation, routes, and error handling. Includes startup logging and server initialization.

- **Responsibilities:**
  - Initialize Express app
  - Set up Swagger/OpenAPI documentation
  - Mount API routes
  - Configure error handling
  - Start the server

### `src/routes/index.js`

Contains all API endpoint handlers organized by feature. Each endpoint includes Swagger documentation and proper error handling.

- **Endpoints (9 total):**

  - `/health` - Server health check
  - `/quote/:symbols` - Stock quotes
  - `/history/:symbols` - Historical data
  - `/info/:symbols` - Company information
  - `/search/:query` - Search functionality
  - `/trending/:region` - Trending stocks
  - `/recommendations/:symbol` - Stock recommendations
  - `/insights/:symbol` - Stock insights
  - `/screener/:type` - Stock screeners

- **Features:**
  - Caching support with configurable TTL
  - Multi-ticker support with Promise.allSettled
  - Comprehensive logging at each step
  - Error handling and partial failure support

### `src/config/swagger.js`

OpenAPI 3.0 specification configuration defining API metadata, schemas, and documentation structure.

- **Includes:**
  - API information and contact details
  - Server configuration
  - Reusable schema definitions for all data types
  - License information

### `src/config/cache.js`

Cache configuration module that sets up and exports the NodeCache instance.

- **Configuration:**
  - `CACHE_ENABLED` - Enable/disable caching (default: true)
  - `CACHE_TTL` - Time-to-live in seconds (default: 300s)
  - `cache` - NodeCache instance for storing responses

### `src/middleware/index.js`

Express middleware configuration, primarily for rate limiting.

- **Configuration:**
  - `RATE_LIMIT_WINDOW_MS` - Rate limit window (default: 900000ms/15min)
  - `RATE_LIMIT_MAX` - Max requests per window (default: 100)
  - `limiter` - Express-rate-limit middleware
  - `logRateLimitConfig()` - Logs rate limit configuration

### `src/utils/logger.js`

Logging utility with configurable verbosity levels.

- **Log Levels:** error, warn, info, debug
- **Features:**
  - Configurable via `LOG_LEVEL` env variable
  - ISO timestamp for each log
  - Supports additional arguments
  - Only logs at or below configured level

## Requirements

- Node.js >= 22.0.0
- npm or yarn

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

This uses `nodemon` to automatically restart the server when files change.

### Running Tests

```bash
npm test
```

This runs the Jest test suite covering:

- **Logger utility tests** - Logging functionality and levels
- **Cache configuration tests** - Caching behavior and configuration
- **Swagger configuration tests** - OpenAPI specification validation
- **Middleware tests** - Rate limiting configuration
- **Route tests** - All API endpoints and handlers
- **Integration tests** - Full server functionality

Test coverage includes:

- 66 test cases across 6 test files
- Unit tests for each module
- Integration tests for API endpoints
- Configuration validation tests

### Environment Variables

Configure the server using environment variables:

| Variable               | Default               | Description                             |
| ---------------------- | --------------------- | --------------------------------------- |
| `PORT`                 | 3000                  | Server port                             |
| `LOG_LEVEL`            | info                  | Logging level: error, warn, info, debug |
| `CACHE_ENABLED`        | true                  | Enable response caching                 |
| `CACHE_TTL`            | 300                   | Cache TTL in seconds (5 minutes)        |
| `RATE_LIMIT_WINDOW_MS` | 900000                | Rate limit window in ms (15 minutes)    |
| `RATE_LIMIT_MAX`       | 100                   | Max requests per window per IP          |
| `SWAGGER_SERVER_URL`   | http://localhost:3000 | Base URL for Swagger API documentation  |

**Examples:**

```bash
# Run with debug logging
LOG_LEVEL=debug npm start

# Run with custom rate limiting
RATE_LIMIT_MAX=200 RATE_LIMIT_WINDOW_MS=600000 npm start

# Run with cache disabled
CACHE_ENABLED=false npm start

# Run on custom port with all custom settings
PORT=8080 LOG_LEVEL=debug RATE_LIMIT_MAX=50 npm start

# Run in Docker container (Docker Desktop)
SWAGGER_SERVER_URL=http://host.docker.internal:3000 npm start

# Run in Docker container (Linux)
SWAGGER_SERVER_URL=http://172.17.0.1:3000 npm start
```

## Endpoints

### GET /health

Health check endpoint.

**Response:**

```json
{
  "status": "ok"
}
```

**Example:**

```bash
curl http://localhost:3000/health
```

### GET /quote/:symbols

Get current stock prices. Supports multiple symbols separated by commas.

**Parameters:**

- `symbols`: Stock symbols (e.g., AAPL,GOOGL)

**Response:** Object with symbol keys containing quote data or error objects for invalid symbols.

```json
{
  "AAPL": {
    "summaryDetail": {
      "maxAge": 1,
      "priceHint": 2,
      "previousClose": 272.95,
      "open": 271.05,
      "dayLow": 269.6,
      "dayHigh": 275.9583,
      "regularMarketPreviousClose": 272.95,
      "regularMarketOpen": 271.05,
      "regularMarketDayLow": 269.6,
      "regularMarketDayHigh": 275.9583,
      "dividendRate": 1.04,
      "dividendYield": 0.0038,
      "exDividendDate": "2025-11-10T00:00:00.000Z",
      "payoutRatio": 0.1367,
      "fiveYearAvgDividendYield": 0.53,
      "beta": 1.109,
      "trailingPE": 36.614246,
      "forwardPE": 32.780987,
      "volume": 47348613,
      "regularMarketVolume": 47348613,
      "averageVolume": 50386496,
      "averageVolume10days": 47550470,
      "averageDailyVolume10Day": 47550470,
      "bid": 257.28,
      "ask": 272.59,
      "bidSize": 100,
      "askSize": 100,
      "marketCap": 4033205501952,
      "fiftyTwoWeekLow": 169.21,
      "fiftyTwoWeekHigh": 277.32,
      "allTimeHigh": 277.32,
      "allTimeLow": 0.049107,
      "priceToSalesTrailing12Months": 9.691455,
      "fiftyDayAverage": 255.9264,
      "twoHundredDayAverage": 225.3758,
      "trailingAnnualDividendRate": 1.02,
      "trailingAnnualDividendYield": 0.003736948,
      "currency": "USD"
    },
    "price": {
      "maxAge": 1,
      "preMarketSource": "FREE_REALTIME",
      "postMarketChangePercent": 0.0015326566,
      "postMarketChange": 0.417511,
      "postMarketTime": "2025-11-15T00:59:59.000Z",
      "postMarketPrice": 272.8275,
      "postMarketSource": "FREE_REALTIME",
      "regularMarketChangePercent": -0.00197842,
      "regularMarketChange": -0.540009,
      "regularMarketTime": "2025-11-14T21:00:00.000Z",
      "priceHint": 2,
      "regularMarketPrice": 272.41,
      "regularMarketDayHigh": 275.9583,
      "regularMarketDayLow": 269.6,
      "regularMarketVolume": 47348613,
      "averageDailyVolume10Day": 47550470,
      "averageDailyVolume3Month": 50386496,
      "regularMarketPreviousClose": 272.95,
      "regularMarketSource": "FREE_REALTIME",
      "regularMarketOpen": 271.05,
      "exchange": "NMS",
      "exchangeName": "NasdaqGS",
      "exchangeDataDelayedBy": 0,
      "marketState": "CLOSED",
      "quoteType": "EQUITY",
      "symbol": "AAPL",
      "shortName": "Apple Inc.",
      "longName": "Apple Inc.",
      "currency": "USD",
      "quoteSourceName": "Nasdaq Real Time Price",
      "currencySymbol": "$",
      "marketCap": 4033205501952
    }
  },
  "INVALID": {
    "error": "Quote not found for symbol: INVALID"
  }
}
```

**Example:**

```bash
curl http://localhost:3000/quote/AAPL
curl http://localhost:3000/quote/AAPL,GOOGL
```

### GET /history/:symbols

Get historical price data. Supports multiple symbols.

**Parameters:**

- `symbols`: Stock symbols
- `period` (optional): Time period (default: 1y)
- `interval` (optional): Data interval (default: 1d)

**Response:** Array of historical data arrays.

```json
[
  [
    {
      "date": "2025-11-10T14:30:00.000Z",
      "high": 273.7300109863281,
      "volume": 41312400,
      "open": 268.9599914550781,
      "low": 267.4599914550781,
      "close": 269.42999267578125,
      "adjclose": 269.42999267578125
    },
    {
      "date": "2025-11-11T14:30:00.000Z",
      "high": 275.9100036621094,
      "volume": 46208300,
      "open": 269.80999755859375,
      "low": 269.79998779296875,
      "close": 275.25,
      "adjclose": 275.25
    },
    {
      "date": "2025-11-12T14:30:00.000Z",
      "high": 275.7300109863281,
      "volume": 48398000,
      "open": 275,
      "low": 271.70001220703125,
      "close": 273.4700012207031,
      "adjclose": 273.4700012207031
    },
    {
      "date": "2025-11-13T14:30:00.000Z",
      "high": 276.70001220703125,
      "volume": 49602800,
      "open": 274.1099853515625,
      "low": 272.0899963378906,
      "close": 272.95001220703125,
      "adjclose": 272.95001220703125
    },
    {
      "date": "2025-11-14T14:30:00.000Z",
      "high": 275.9599914550781,
      "volume": 47399300,
      "open": 271.04998779296875,
      "low": 269.6000061035156,
      "close": 272.4100036621094,
      "adjclose": 272.4100036621094
    }
  ]
]
```

**Example:**

```bash
curl "http://localhost:3000/history/AAPL?period=1y&interval=1d"
curl "http://localhost:3000/history/AAPL,TSLA?period=6mo&interval=1wk"
```

### GET /info/:symbols

Get company information. Supports multiple symbols.

**Parameters:**

- `symbols`: Stock symbols

**Response:** Array of info objects.

```json
[
  {
    "assetProfile": {
      "address1": "One Apple Park Way",
      "city": "Cupertino",
      "state": "CA",
      "zip": "95014",
      "country": "United States",
      "phone": "(408) 996-1010",
      "website": "https://www.apple.com",
      "industry": "Consumer Electronics",
      "industryKey": "consumer-electronics",
      "industryDisp": "Consumer Electronics",
      "sector": "Technology",
      "sectorKey": "technology",
      "sectorDisp": "Technology",
      "longBusinessSummary": "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide. The company offers iPhone, a line of smartphones; Mac, a line of personal computers; iPad, a line of multi-purpose tablets; and wearables, home, and accessories comprising AirPods, Apple Vision Pro, Apple TV, Apple Watch, Beats products, and HomePod, as well as Apple branded and third-party accessories. It also provides AppleCare support and cloud services; and operates various platforms, including the App Store that allow customers to discover and download applications and digital content, such as books, music, video, games, and podcasts, as well as advertising services include third-party licensing arrangements and its own advertising platforms. In addition, the company offers various subscription-based services, such as Apple Arcade, a game subscription service; Apple Fitness+, a personalized fitness service; Apple Music, which offers users a curated listening experience with on-demand radio stations; Apple News+, a subscription news and magazine service; Apple TV, which offers exclusive original content and live sports; Apple Card, a co-branded credit card; and Apple Pay, a cashless payment service, as well as licenses its intellectual property. The company serves consumers, and small and mid-sized businesses; and the education, enterprise, and government markets. It distributes third-party applications for its products through the App Store. The company also sells its products through its retail and online stores, and direct sales force; and third-party cellular network carriers and resellers. The company was formerly known as Apple Computer, Inc. and changed its name to Apple Inc. in January 2007. Apple Inc. was founded in 1976 and is headquartered in Cupertino, California.",
      "fullTimeEmployees": 166000,
      "companyOfficers": [
        {
          "maxAge": 1,
          "name": "Mr. Timothy D. Cook",
          "age": 63,
          "title": "CEO & Director",
          "yearBorn": 1961,
          "fiscalYear": 2024,
          "totalPay": 16520856,
          "exercisedValue": 0,
          "unexercisedValue": 0
        }
      ],
      "auditRisk": 7,
      "boardRisk": 1,
      "compensationRisk": 3,
      "shareHolderRightsRisk": 1,
      "overallRisk": 1,
      "governanceEpochDate": "2025-11-01T00:00:00.000Z",
      "compensationAsOfEpochDate": "2024-12-31T00:00:00.000Z",
      "irWebsite": "http://investor.apple.com/"
    },
    "summaryProfile": {
      "address1": "One Apple Park Way",
      "city": "Cupertino",
      "state": "CA",
      "zip": "95014",
      "country": "United States",
      "phone": "(408) 996-1010",
      "website": "https://www.apple.com",
      "industry": "Consumer Electronics",
      "industryKey": "consumer-electronics",
      "industryDisp": "Consumer Electronics",
      "sector": "Technology",
      "sectorKey": "technology",
      "sectorDisp": "Technology",
      "longBusinessSummary": "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide...",
      "fullTimeEmployees": 166000,
      "irWebsite": "http://investor.apple.com/"
    }
  }
]
```

**Example:**

```bash
curl http://localhost:3000/info/MSFT
curl http://localhost:3000/info/AAPL,GOOGL
```

### GET /search/:query

Search for symbols, news, and financial data.

**Parameters:**

- `query`: Search term (company name, symbol, etc.)

**Response:** Search results with quotes, news, and other data.

```json
{
  "quotes": [
    {
      "exchange": "NMS",
      "shortname": "Apple Inc.",
      "quoteType": "EQUITY",
      "symbol": "AAPL",
      "index": "quotes",
      "score": 1111111.0,
      "typeDisp": "Equity",
      "longname": "Apple Inc.",
      "isYahooFinance": true
    }
  ],
  "news": [
    {
      "uuid": "12345678-1234-1234-1234-123456789012",
      "title": "Apple Inc. (AAPL) Stock Price, News, Quote & History",
      "publisher": "Yahoo Finance",
      "link": "https://finance.yahoo.com/quote/AAPL/",
      "providerPublishTime": 1731600000,
      "type": "STORY"
    }
  ],
  "count": 1
}
```

**Example:**

```bash
curl "http://localhost:3000/search/apple"
```

### GET /trending/:region

Get trending symbols for a specific region.

**Parameters:**

- `region`: Region code (US, CA, UK, etc.)

**Response:** Trending symbols data.

```json
{
  "count": 5,
  "quotes": [
    {
      "symbol": "AAPL"
    },
    {
      "symbol": "TSLA"
    }
  ],
  "jobTimestamp": 1731600000000,
  "startInterval": 1731596400000
}
```

**Example:**

```bash
curl http://localhost:3000/trending/US
curl http://localhost:3000/trending/CA
```

### GET /recommendations/:symbol

Get recommended similar stocks for a given symbol.

**Parameters:**

- `symbol`: Stock symbol

**Response:** Recommendation data with similar symbols.

```json
{
  "symbol": "AAPL",
  "recommendedSymbols": [
    {
      "symbol": "MSFT",
      "score": 0.9999
    },
    {
      "symbol": "GOOGL",
      "score": 0.9998
    }
  ]
}
```

**Example:**

```bash
curl http://localhost:3000/recommendations/AAPL
```

### GET /insights/:symbol

Get comprehensive insights and analysis for a symbol.

**Parameters:**

- `symbol`: Stock symbol

**Response:** Detailed insights including company snapshot, recommendations, events, and reports.

```json
{
  "symbol": "AAPL",
  "companySnapshot": {
    "sectorInfo": "Technology",
    "company": {
      "innovativeness": 9.5,
      "hiring": 8.2,
      "sustainability": 9.1,
      "insiderSentiments": 7.8,
      "earningsReports": 8.9,
      "dividends": 6.5
    }
  },
  "recommendation": {
    "targetPrice": 250.0,
    "provider": "Yahoo",
    "rating": "BUY"
  }
}
```

**Example:**

```bash
curl http://localhost:3000/insights/AAPL
```

### GET /screener/:type

Get stock screener results for different categories.

**Parameters:**

- `type`: Screener type (`day_gainers`, `day_losers`, `most_actives`, `most_shorted`)
- `count` (optional): Number of results (default: 25)

**Response:** Screener results with stock quotes.

```json
{
  "id": "day_gainers",
  "title": "Day Gainers",
  "description": "Stocks ordered in descending order by price percent change greater than 3% with respect to the previous close",
  "canonicalName": "DAY_GAINERS",
  "count": 25,
  "total": 100,
  "quotes": [
    {
      "symbol": "EXAMPLE",
      "regularMarketPrice": 100.0,
      "regularMarketChangePercent": 15.5
    }
  ]
}
```

**Example:**

```bash
curl "http://localhost:3000/screener/day_gainers"
curl "http://localhost:3000/screener/most_actives?count=50"
```

### GET /financial/:symbol/:type

Get financial statements for a stock.

**Parameters:**

- `symbol`: Stock ticker symbol (e.g., AAPL)
- `type`: Statement type (`income`, `balance`, `cashflow`)
- `period` (optional): Statement period (`annual`, `quarterly`) - default: annual

**Response:** Financial statement data with historical periods.

```json
{
  "symbol": "AAPL",
  "type": "income",
  "period": "annual",
  "count": 4,
  "statements": [
    {
      "endDate": "2025-09-30T00:00:00.000Z",
      "totalRevenue": 416161000000,
      "costOfRevenue": 0,
      "grossProfit": 0,
      "operatingIncome": null,
      "netIncome": 112010000000
    }
  ]
}
```

**Supported Statement Types:**

- `income` - Income statement with revenue, costs, net income
- `balance` - Balance sheet with assets, liabilities, equity
- `cashflow` - Cash flow statement with operating, investing, financing flows

**Example:**

```bash
# Annual income statement
curl "http://localhost:3000/financial/AAPL/income"

# Quarterly balance sheet
curl "http://localhost:3000/financial/MSFT/balance?period=quarterly"

# Annual cash flow
curl "http://localhost:3000/financial/GOOGL/cashflow"
```

### GET /news/:symbol

Get company news and market context information.

**Parameters:**

- `symbol`: Stock ticker symbol (e.g., AAPL)
- `count` (optional): Number of articles to retrieve (default: 10, max: 50)

**Response:** Company information and market context.

```json
{
  "symbol": "AAPL",
  "count": 0,
  "news": [],
  "companyInfo": {
    "sector": "Technology",
    "industry": "Consumer Electronics",
    "website": "https://www.apple.com",
    "description": "Apple Inc. designs, manufactures, and markets..."
  },
  "message": "Live news streaming is available through Yahoo Finance web interface...",
  "dataAvailable": {
    "hasAssetProfile": true,
    "hasSummaryProfile": true
  }
}
```

**Example:**

```bash
# Get company context for AAPL
curl "http://localhost:3000/news/AAPL"

# Get company context for MSFT with count
curl "http://localhost:3000/news/MSFT?count=5"
```

## MCP (Model Context Protocol) Integration

The server includes a comprehensive MCP implementation with **11 financial data tools** accessible via HTTP endpoints and Server-Sent Events (SSE) streaming. This enables seamless integration with LLM systems like Claude for intelligent financial analysis and data retrieval.

**Quick Start:**

- **MCP Health**: `GET /mcp/health`
- **List Tools**: `GET /mcp/tools`
- **Execute Tool**: `POST /mcp/call`
- **Stream Results**: `POST /mcp/call-stream`

For comprehensive MCP documentation, tool descriptions, usage examples, and integration guides, see [MCP.md](./MCP.md).

## Setup

### Local Development

1. Install dependencies:

```bash
npm install
```

2. Run in development mode:

```bash
npm run dev
```

3. Run tests:

```bash
npm test
```

### Docker

1. Build and run with Docker Compose:

```bash
docker-compose up --build
```

The server will be available at http://localhost:3000.

### GitHub Packages

Pre-built Docker images are available on GitHub Packages for multiple architectures (AMD64, ARM64, ARMv7):

```bash
# Pull the latest image (automatically selects your architecture)
docker pull ghcr.io/acerbetti/yahoo-finance-server:latest

# Or pull a specific version
docker pull ghcr.io/acerbetti/yahoo-finance-server:v1.0.0

# Run the container
docker run -p 3000:3000 ghcr.io/acerbetti/yahoo-finance-server:latest
```

**Supported Platforms:**

- `linux/amd64` (Intel/AMD 64-bit)
- `linux/arm64` (ARM 64-bit, e.g., Apple Silicon, Raspberry Pi 4+)
- `linux/arm/v7` (ARM 32-bit v7, e.g., Raspberry Pi 3 and older)

## Environment Variables

- `PORT`: Server port (default: 3000)
- `LOG_LEVEL`: Logging verbosity level - `error`, `warn`, `info`, `debug` (default: `info`)
- `RATE_LIMIT_WINDOW_MS`: Rate limit window in milliseconds (default: 900000, i.e., 15 minutes)
- `RATE_LIMIT_MAX`: Maximum requests per window per IP (default: 100)
- `CACHE_ENABLED`: Enable caching (default: true, set to 'false' to disable)
- `CACHE_TTL`: Cache TTL in seconds (default: 300, i.e., 5 minutes)

## Rate Limiting

Requests are limited to prevent abuse. Defaults to 100 requests per 15 minutes per IP address. Configurable via `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX` environment variables.

## Caching

Responses are cached to improve performance. Cache is enabled by default with a 5-minute TTL. Configure via `CACHE_ENABLED` and `CACHE_TTL` environment variables.

## Setup

### Local Development

1. Install dependencies:

```bash
npm install
```

2. Run in development mode:

```bash
npm run dev
```

3. Run tests:

```bash
npm test
```

### Docker

1. Build and run with Docker Compose:

```bash
docker-compose up --build
```

The server will be available at http://localhost:3000.

### GitHub Packages

Pre-built Docker images are available on GitHub Packages for multiple architectures (AMD64, ARM64, ARMv7):

```bash
# Pull the latest image (automatically selects your architecture)
docker pull ghcr.io/acerbetti/yahoo-finance-server:latest

# Or pull a specific version
docker pull ghcr.io/acerbetti/yahoo-finance-server:v1.0.0

# Run the container
docker run -p 3000:3000 ghcr.io/acerbetti/yahoo-finance-server:latest
```

**Supported Platforms:**

- `linux/amd64` (Intel/AMD 64-bit)
- `linux/arm64` (ARM 64-bit, e.g., Apple Silicon, Raspberry Pi 4+)
- `linux/arm/v7` (ARM 32-bit v7, e.g., Raspberry Pi 3 and older)

## Environment Variables

- `PORT`: Server port (default: 3000)
- `LOG_LEVEL`: Logging verbosity level - `error`, `warn`, `info`, `debug` (default: `info`)
- `RATE_LIMIT_WINDOW_MS`: Rate limit window in milliseconds (default: 900000, i.e., 15 minutes)
- `RATE_LIMIT_MAX`: Maximum requests per window per IP (default: 100)
- `CACHE_ENABLED`: Enable caching (default: true, set to 'false' to disable)
- `CACHE_TTL`: Cache TTL in seconds (default: 300, i.e., 5 minutes)

## Rate Limiting

Requests are limited to prevent abuse. Defaults to 100 requests per 15 minutes per IP address. Configurable via `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX` environment variables.

## Caching

API responses are cached in memory to reduce external API calls. Defaults to 5 minutes TTL. Configurable via `CACHE_ENABLED` and `CACHE_TTL` environment variables.

## Error Handling

- Invalid symbols return null in arrays for multi-ticker requests.
- API errors return 500 with error message.
- Unknown routes return 404.

## Releases

This project follows [Semantic Versioning](https://semver.org/). Releases are automatically created when version tags (e.g., `v1.0.0`) are pushed to the repository.

### Creating a Release

1. Update the version in `package.json`
2. Update `CHANGELOG.md` with the new changes
3. Commit the changes
4. Create and push a version tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The CI/CD pipeline will automatically:

- Run tests
- Build and push Docker images to Docker Hub
- Create a GitHub release

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed list of changes in each version.

## License

Apache-2.0
