# Yahoo Finance Server

A Node.js Express API server that serves Yahoo Finance data using the yahoo-finance2 v3.0.0 library. Supports multiple tickers in a single request with arrays as results, including partial failure handling.

## ⚠️ Disclaimer

This is an **unofficial implementation** and has **no affiliation with Yahoo Inc.** or any of its subsidiaries. This project is not endorsed by, sponsored by, or otherwise connected to Yahoo. All data is sourced from public Yahoo Finance APIs through the yahoo-finance2 library.

## 🙏 Credits

Special thanks to the authors and maintainers of the [yahoo-finance2](https://github.com/gadicc/yahoo-finance2) library for providing the Yahoo Finance API wrapper.

## Features

- Express API with configurable rate limiting and caching
- Multi-ticker support for all endpoints
- Docker multi-stage build
- Health checks
- Proper error handling
- Jest tests

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

## Environment Variables

- `PORT`: Server port (default: 3000)
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

## License

Apache-2.0
