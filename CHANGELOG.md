# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
