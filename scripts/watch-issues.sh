#!/bin/bash

# DNSweeper Issue監視スクリプト
# 新しいissueを検出してClaude Codeへの指示を表示

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 最後にチェックしたissue番号を保存するファイル
LAST_ISSUE_FILE=".last-issue-check"

# 初回実行時の処理
if [ ! -f "$LAST_ISSUE_FILE" ]; then
    echo -e "${BLUE}📝 初回実行です。現在のissue番号を記録します...${NC}"
    gh issue list --state open --limit 1 --json number -q '.[0].number' > "$LAST_ISSUE_FILE" 2>/dev/null || echo "0" > "$LAST_ISSUE_FILE"
fi

# 最後にチェックしたissue番号を読み込み
LAST_ISSUE=$(cat "$LAST_ISSUE_FILE")
if [ -z "$LAST_ISSUE" ]; then
    LAST_ISSUE="0"
fi

echo -e "${BLUE}🔍 DNSweeper Issue監視中...${NC}"
echo -e "最後のチェック: Issue #$LAST_ISSUE"
echo "----------------------------------------"

# 新しいissueをチェック
NEW_ISSUES=$(gh issue list --state open --json number,title,body,author,createdAt,labels --jq ".[] | select(.number > $LAST_ISSUE)")

if [ -z "$NEW_ISSUES" ]; then
    echo -e "${GREEN}✅ 新しいissueはありません${NC}"
else
    echo -e "${YELLOW}🆕 新しいissueが見つかりました！${NC}"
    echo ""
    
    # 新しいissueを処理
    echo "$NEW_ISSUES" | jq -r '. | @json' | while IFS= read -r issue_json; do
        issue=$(echo "$issue_json" | jq -r '.')
        number=$(echo "$issue" | jq -r '.number')
        title=$(echo "$issue" | jq -r '.title')
        body=$(echo "$issue" | jq -r '.body // "（本文なし）"')
        author=$(echo "$issue" | jq -r '.author.login')
        created=$(echo "$issue" | jq -r '.createdAt')
        labels=$(echo "$issue" | jq -r '.labels[].name' | tr '\n' ', ' | sed 's/,$//')
        
        echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${YELLOW}📌 Issue #$number: $title${NC}"
        echo -e "👤 作成者: $author"
        echo -e "📅 作成日時: $created"
        if [ -n "$labels" ]; then
            echo -e "🏷️  ラベル: $labels"
        fi
        echo ""
        echo -e "${BLUE}📄 本文:${NC}"
        echo "$body" | head -20
        if [ $(echo "$body" | wc -l) -gt 20 ]; then
            echo "... (以下省略)"
        fi
        echo ""
        
        # Claude Codeへの指示を生成
        echo -e "${GREEN}🤖 Claude Codeへの指示（コピペ用）:${NC}"
        echo "----------------------------------------"
        cat << EOF
GitHub Issue #$number を確認して対応してください。

## Issue情報
- タイトル: $title
- 作成者: @$author
- URL: https://github.com/Kazu-dnssweeper/dnssweeper-cli/issues/$number

## 対応手順
1. issueの詳細を確認：
   \`\`\`bash
   gh issue view $number
   \`\`\`

2. 必要に応じてブランチを作成：
   \`\`\`bash
   git checkout -b issue-$number
   \`\`\`

3. 修正実施後、コミット：
   \`\`\`bash
   git add -A
   git commit -m "fix: Issue #$number - $title"
   \`\`\`

4. issueにコメント：
   \`\`\`bash
   gh issue comment $number --body "修正を実装しました。PRを作成します。"
   \`\`\`

5. PR作成（必要に応じて）：
   \`\`\`bash
   gh pr create --title "Fix: Issue #$number - $title" --body "Fixes #$number"
   \`\`\`
EOF
        echo "----------------------------------------"
        echo ""
        
        # 最新のissue番号を更新
        echo "$number" > "$LAST_ISSUE_FILE"
    done
fi

echo ""
echo -e "${BLUE}次回チェックは5分後です。手動実行: npm run watch:issues${NC}"