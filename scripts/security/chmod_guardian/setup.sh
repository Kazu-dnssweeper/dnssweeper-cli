#!/bin/bash
# DNSweeper chmod権限管理システム セットアップスクリプト

echo "🚀 DNSweeper chmod権限管理システムをセットアップします..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# プロジェクトルートの確認
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    echo -e "${RED}❌ DNSweeperプロジェクトのルートディレクトリで実行してください${NC}"
    exit 1
fi

echo -e "${GREEN}✅ DNSweeperプロジェクトを検出${NC}"

# 必要なディレクトリ作成
echo "📁 ディレクトリ構造を作成中..."
mkdir -p ~/.claude/hooks
mkdir -p ~/.dza/{security,temp,status}
mkdir -p scripts/security/chmod_guardian/{hooks,policies,logs}

# 初期ファイル作成
echo "📝 初期設定ファイルを作成中..."
echo '[]' > ~/.dza/security/chmod_history.json
echo '{}' > ~/.dza/security/permission_backup.json
echo '[]' > ~/.dza/security/restore_history.json

# DNSweeper専用ポリシーの作成
cat > scripts/security/chmod_guardian/policies/dnsweeper_policy.json << 'EOF'
{
  "project_name": "DNSweeper",
  "directories": {
    "default": "755",
    "private": "700",
    "src": "755",
    "dist": "755",
    "scripts": "755",
    "logs": "700",
    "config": "700",
    ".dza": "700",
    ".claude": "700",
    "node_modules": "755"
  },
  "files": {
    "default": "644",
    "scripts": "755",
    "configs": "600",
    "sensitive": "400",
    "typescript": "644",
    "javascript": "644",
    "json": "644",
    "env": "400",
    "key": "400",
    "test": "644",
    "executable": "755"
  },
  "patterns": {
    "\\.sh$": "755",
    "\\.py$": "755",
    "\\.ts$": "644",
    "\\.js$": "644",
    "\\.mjs$": "644",
    "\\.json$": "644",
    "\\.yaml$": "644",
    "\\.yml$": "644",
    "\\.env.*": "400",
    "\\.key$": "400",
    "\\.pem$": "400",
    "\\.crt$": "444",
    "jest\\.config": "644",
    "vitest\\.config": "644",
    "tsconfig": "644",
    "package\\.json": "644",
    "package-lock\\.json": "644"
  },
  "dnsweeper_specific": {
    "/patterns/": "644",
    "/test-data/": "644",
    "/dist/": "444",
    "/.env": "400",
    "/.env.local": "400",
    "/credentials/": "400"
  }
}
EOF

# hookスクリプトをコピー（または作成）
echo "🔧 hookスクリプトを設定中..."

# 権限を付与
chmod +x scripts/security/chmod_guardian/setup.sh

# 設定ファイルの確認と更新
if [ -f ~/.claude/settings.local.json ]; then
    echo -e "${YELLOW}⚠️  既存の settings.local.json を検出${NC}"
    echo "バックアップを作成します..."
    cp ~/.claude/settings.local.json ~/.claude/settings.local.json.backup.$(date +%Y%m%d_%H%M%S)
fi

# シンボリックリンクの作成（開発効率化）
ln -sf $(pwd)/scripts/security/chmod_guardian ~/.dza/dnsweeper_chmod_guardian

echo ""
echo -e "${GREEN}✅ セットアップ完了！${NC}"
echo ""
echo "📌 次の手順:"
echo "1. chmod監視スクリプトを実装します"
echo "2. ~/.claude/settings.local.json を更新します"
echo "3. Claude Codeを再起動します"
echo ""
echo "🔐 DNSweeper専用のセキュリティポリシーが適用されます:"
echo "   • TypeScript/JavaScript: 644 (読み取り専用)"
echo "   • シェルスクリプト: 755 (実行可能)"
echo "   • 環境変数ファイル: 400 (機密保護)"
echo "   • ビルド成果物: 444 (変更防止)"