#!/bin/bash
# setup_dza_hooks.sh - /dza完全自動化システムの初期セットアップ

echo "🚀 /dza完全自動化システムのセットアップを開始します..."

# ディレクトリ作成
echo "📁 ディレクトリ構造を作成中..."
mkdir -p ~/.claude/hooks
mkdir -p ~/.dza/{config,logs,status}

# 初期設定ファイルの作成
echo "📝 初期設定ファイルを作成中..."
echo '{}' > ~/.dza/logs/approval_queue.json
echo '{}' > ~/.dza/status/current_state.json
echo '{}' > ~/.dza/status/live_status.json

# デフォルト設定ファイルの作成
cat > ~/.dza/config/auto-settings.yml << 'EOF'
# /dza 自動化設定
security_mode: balanced  # strict, balanced, relaxed
approval_avoidance: true
freeze_detection: true
status_display: true

# 時間帯別設定
time_based_modes:
  morning:
    hours: [6, 7, 8, 9]
    risk_level: low
    focus: [testing, documentation]
  daytime:
    hours: [10, 11, 12, 13, 14, 15, 16]
    risk_level: medium
    focus: [implementation, refactoring]
  evening:
    hours: [17, 18]
    risk_level: low
    focus: [review, planning]
  night:
    hours: [19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5]
    risk_level: low
    focus: [analysis, experiment, cleanup]
EOF

echo "✅ ディレクトリ構造の作成が完了しました"
echo ""
echo "📋 次のステップ:"
echo "1. hookスクリプトをインストール: ./scripts/install_dza_hooks.sh"
echo "2. Claude Codeを再起動"
echo "3. /dzaコマンドを実行"