# プロジェクト構造

```
dnsweeper-cli/
├── .claude/                # Claude Code設定
│   ├── commands/          # カスタムコマンド
│   └── workflows/         # ワークフロー
├── .github/               # GitHub設定
│   ├── workflows/         # GitHub Actions
│   │   ├── CI.yml        # CI/CDパイプライン
│   │   ├── publish.yml   # npm公開
│   │   ├── test.yml      # テスト
│   │   ├── pdca-daily.yml    # 日次PDCA
│   │   ├── pdca-weekly.yml   # 週次PDCA
│   │   └── pdca-slack-notify.yml # Slack通知
│   ├── ISSUE_TEMPLATE/    # Issueテンプレート
│   └── PULL_REQUEST_TEMPLATE.md
├── .husky/                # Gitフック
│   ├── commit-msg        # コミットメッセージ検証
│   ├── pre-commit        # コミット前チェック
│   └── pre-push          # プッシュ前チェック
├── .vscode/               # VSCode設定
│   ├── settings.json     # エディタ設定
│   ├── launch.json       # デバッグ設定
│   └── extensions.json   # 推奨拡張
├── dist/                  # ビルド成果物
│   ├── index.js          # CLIエントリーポイント
│   ├── types/            # 型定義ファイル
│   └── ...              # その他ビルド出力
├── docs/                  # ドキュメント
│   ├── AUTOMATION.md     # 自動化ガイド
│   ├── PERMISSIONS.md    # 権限管理ガイド
│   ├── PDCA_SETUP.md     # PDCA設定ガイド
│   ├── ROADMAP.md        # ロードマップ
│   ├── improvement-proposals.md # 改善提案
│   ├── release-retrospective-v0.1.0.md # リリース振り返り
│   └── issues/           # Issue関連ドキュメント
├── scripts/               # ユーティリティスクリプト
│   ├── release.js        # リリーススクリプト
│   ├── status.js         # ステータス確認
│   ├── fix-ci.js         # CI修正
│   ├── collect-metrics.js # メトリクス収集
│   ├── setup-permissions.js # 権限設定
│   ├── fix-permissions.sh # 権限修正
│   ├── benchmark-streaming.js # ベンチマーク
│   ├── generate-large-test-data.js # テストデータ生成
│   └── github-utils/     # GitHub関連ユーティリティ
├── src/                   # ソースコード
│   ├── analyzers/         # 分析ロジック
│   │   ├── RiskAnalyzer.ts
│   │   └── UsageAnalyzer.ts
│   ├── commands/          # CLIコマンド
│   │   ├── analyze.ts
│   │   ├── analyzeStream.ts
│   │   └── analyzeStreamOptimized.ts
│   ├── parsers/           # パーサー
│   │   ├── csvParser.ts
│   │   └── csvStreamParser.ts
│   ├── patterns/          # パターンマッチング
│   │   ├── patternLoader.ts
│   │   └── patternMatcher.ts
│   ├── providers/         # DNSプロバイダー
│   │   ├── BaseProvider.ts
│   │   ├── CloudflareProvider.ts
│   │   ├── Route53Provider.ts
│   │   └── ...
│   ├── types/             # TypeScript型定義
│   │   ├── dns.ts
│   │   └── index.ts
│   ├── utils/             # ユーティリティ
│   │   ├── formatter.ts
│   │   ├── messages.ts
│   │   └── logger.ts
│   └── index.ts           # エントリーポイント
├── test/                  # テストファイル
│   ├── setup.ts          # テスト設定
│   └── ...              # 各種テストファイル
├── test-data/             # テスト用データ
│   ├── normal-records-50.csv
│   └── multi-provider/   # プロバイダー別テストデータ
├── .editorconfig          # エディタ設定
├── .env.example           # 環境変数例
├── .eslintrc.js           # ESLint設定
├── .gitignore             # Git除外設定
├── .npmignore             # npm公開除外設定
├── .nvmrc                 # Node.jsバージョン
├── .prettierrc            # Prettier設定
├── CHANGELOG.md           # 変更履歴
├── CLAUDE.md              # Claude必須ルール
├── DNSweeper 開発ルール.md # 開発ルール
├── LICENSE                # ライセンス
├── package.json           # パッケージ設定
├── patterns.json          # DNSパターン定義
├── pdca-config.yml        # PDCA設定
├── pnpm-lock.yaml         # 依存関係ロック
├── README.md              # プロジェクト説明（日本語）
├── README.en.md           # プロジェクト説明（英語）
├── tsconfig.json          # TypeScript設定
├── tsconfig.build.json    # ビルド用TS設定
├── tsconfig.dev.json      # 開発用TS設定
├── tsconfig.test.json     # テスト用TS設定
├── jest.config.js         # Jest設定
└── dnssweeper-context.md  # プロジェクトコンテキスト
```

## ディレクトリの役割

### `/src`
アプリケーションのソースコード。モジュールごとに整理されています。

### `/dist`
TypeScriptをコンパイルしたJavaScriptファイル。npm公開時はこのディレクトリの内容が配布されます。

### `/scripts`
開発・運用で使用するユーティリティスクリプト。自動化タスクが含まれます。

### `/test`
ユニットテストとE2Eテスト。Jestを使用。

### `/docs`
プロジェクトのドキュメント。開発ガイドや設計書が含まれます。

### `/.github`
GitHub固有の設定。ActionsワークフローやIssueテンプレート。

### `/.claude`
Claude Code用のカスタムコマンドとワークフロー。開発効率化のための設定。

## ファイル命名規則

- TypeScriptファイル: `camelCase.ts`
- テストファイル: `*.test.ts` または `*.spec.ts`
- 設定ファイル: `kebab-case.json` または `.dotfile`
- ドキュメント: `UPPERCASE.md` または `kebab-case.md`