# 🔍 DNSweeper CLI

[![Test](https://github.com/Kazu-dnsweeper/dnsweeper-cli/workflows/Test/badge.svg)](https://github.com/Kazu-dnsweeper/dnsweeper-cli/actions?query=workflow%3ATest)
[![CI](https://github.com/Kazu-dnsweeper/dnsweeper-cli/workflows/CI/badge.svg)](https://github.com/Kazu-dnsweeper/dnsweeper-cli/actions?query=workflow%3ACI)
[![npm version](https://img.shields.io/npm/v/dnsweeper-cli.svg)](https://www.npmjs.com/package/dnsweeper-cli)
[![npm downloads](https://img.shields.io/npm/dm/dnsweeper-cli.svg)](https://www.npmjs.com/package/dnsweeper-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/dnsweeper-cli.svg)](https://nodejs.org/)
[![Security Policy](https://img.shields.io/badge/Security-Policy-blue.svg)](SECURITY.md)

A command-line tool for detecting and analyzing unused DNS records

🎉 **v0.1.0 is now available on npm!** Install: `npm install -g dnsweeper-cli`

[日本語版 README](README.md)

## 🎯 Overview

DNSweeper CLI is a tool that analyzes CSV files exported from DNS services like Cloudflare and detects potentially unused DNS records.

### Key Features

- 📊 **Pattern Matching Analysis**: Detects dangerous prefixes, suffixes, and keywords
- 🎨 **Colored Output**: Clear, color-coded display by risk level
- 📋 **Multiple Output Formats**: Support for table, JSON, and CSV formats
- 🌐 **Multi-language Support**: Available in both Japanese and English
- ⚡ **High Performance**: Efficiently processes large CSV files
- 🔒 **Read-only**: Safe analysis (no record deletion or modification)

## 🚀 Installation

### Install via npm

```bash
# Using npm
npm install -g dnsweeper-cli

# Using pnpm (recommended)
pnpm add -g dnsweeper-cli
```

### Direct Execution (npx)

```bash
npx dnsweeper-cli analyze your-dns-records.csv
```

## 📊 Risk Levels

DNSweeper CLI evaluates risk in 5 levels:

| Level | Score Range | Description | Display Color |
|-------|-------------|-------------|---------------|
| 🔴 Critical | 90-100 | Records that should be considered for immediate deletion | Red |
| 🟠 High | 70-89 | Records recommended for deletion | Orange |
| 🟡 Medium | 50-69 | Records that need attention | Yellow |
| 🟢 Low | 30-49 | Records with minor concerns | Green |
| ⚪ Safe | 0-29 | Records with no issues | Gray |

## 📖 Usage

### Basic Usage

```bash
# Analyze CSV file
dnsweeper analyze dns-records.csv

# Verbose output
dnsweeper analyze dns-records.csv --verbose

# Run in English mode
dnsweeper analyze dns-records.csv --english
```

### Output Format Specification

```bash
# Table format (default)
dnsweeper analyze dns-records.csv --output table

# JSON format
dnsweeper analyze dns-records.csv --output json

# CSV format
dnsweeper analyze dns-records.csv --output csv
```

### Risk Level Filtering

```bash
# Show only high risk and above
dnsweeper analyze dns-records.csv --risk-level high

# Show only critical records
dnsweeper analyze dns-records.csv --risk-level critical
```

### Save Results to File

```bash
# Save analysis results to a CSV file
dnsweeper analyze dns-records.csv --output-file results.csv
```

## 🛠️ Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--output` | `-o` | Output format (table/json/csv) | `table` |
| `--verbose` | `-v` | Show detailed output | `false` |
| `--english` | `-e` | Run in English mode | `false` |
| `--risk-level` | `-r` | Show only records at or above specified risk level | none |
| `--output-file` | `-f` | Save results to file | none |
| `--help` | `-h` | Show help message | - |
| `--version` | `-V` | Show version | - |

## 🎨 Output Example

### Table Format (Default)

```
🔍 DNSweeper CLI - DNS Record Analysis Tool

📊 Analysis Summary
Total records: 150
Processing time: 0.05 seconds

🎯 Risk Distribution:
🔴 Critical: 2 (1.3%)
🟠 High: 8 (5.3%)
🟡 Medium: 15 (10.0%)
🟢 Low: 25 (16.7%)
⚪ Safe: 100 (66.7%)

📋 Detailed Analysis Results
┌─────────────────────────────────────┬─────────┬─────────┬────────────┬─────────────────────────────────────┐
│ Name                                │ Type    │ Risk    │ Score      │ Reason                              │
├─────────────────────────────────────┼─────────┼─────────┼────────────┼─────────────────────────────────────┤
│ old-api.example.com                 │ A       │ 🔴 Critical │ 95        │ Dangerous prefix 'old-' detected    │
│ test-server.example.com             │ A       │ 🟠 High     │ 80        │ Dangerous prefix 'test-' detected   │
└─────────────────────────────────────┴─────────┴─────────┴────────────┴─────────────────────────────────────┘

✅ Execution complete: 0.05 seconds
```

## 🔧 Supported CSV Formats

DNSweeper CLI supports CSV files in the following formats:

### Cloudflare Format (Recommended)

```csv
Name,Type,Content,TTL,Proxied,Created,Modified
example.com,A,192.168.1.1,300,false,2024-01-01,2024-01-01
www.example.com,CNAME,example.com,300,true,2024-01-01,2024-01-01
```

### Required Fields

- `Name`: DNS record name
- `Type`: Record type (A, AAAA, CNAME, MX, TXT, SRV, PTR, NS)
- `Content`: Record value
- `TTL`: Time To Live

## 🧪 Development & Testing

### Development Environment Setup

```bash
# Clone repository
git clone https://github.com/Kazu-dnsweeper/dnsweeper-cli.git
cd dnsweeper-cli

# Install dependencies
pnpm install  # or npm install

# Run in development mode
pnpm run dev -- analyze test-data/normal-records-50.csv  # or npm run dev
```

### Running Tests

```bash
# Run all tests
pnpm test  # or npm test

# Check test coverage
pnpm run test:coverage  # or npm run test:coverage

# Type checking
pnpm run type-check  # or npm run type-check

# Code formatting
pnpm run format  # or npm run format

# Lint
pnpm run lint  # or npm run lint
```

## 🤝 Contributing

Pull requests and issue reports are welcome!

### Development Guidelines

1. All comments should be written in Japanese
2. Use TypeScript strict mode
3. Maintain test coverage above 80%
4. Implement read-only operations only (no deletion or modification features)

## 📄 License

[MIT License](LICENSE)

## 🚨 Security

This tool is **read-only**. It does not delete or modify any DNS records.

- No API keys or authentication information is transmitted
- Only local file analysis is performed
- Analysis results are not sent externally

## 🆘 Support

If you find any issues or bugs, please report them on [GitHub Issues](https://github.com/Kazu-dnsweeper/dnsweeper-cli/issues).

## 📝 Changelog

### v0.1.0 (2025-07-10)
- Initial release
- Basic DNS record analysis functionality
- Pattern matching features
- Multi-language support (Japanese & English)
- Multiple output format support

---

💡 **Tip**: Perfect for monthly DNS audits! Run regularly to keep your DNS records clean.