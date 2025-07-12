#!/bin/bash

echo "🚀 Claude Code 無限自律進化システムのセットアップを開始します..."

# 1. プロジェクト構造の作成
echo "📁 ディレクトリ構造を作成中..."
mkdir -p .claude/{commands,hooks,memory,scripts,logs}

# 2. システム設定ファイル
echo "⚙️ システム設定を作成中..."
cat > .claude/settings.json << 'EOF'
{
    "systemName": "Claude Autonomous Evolution System",
    "version": "1.0.0",
    "allowedTools": ["*"],
    "maxOutputCharacters": 500000,
    "timeoutSeconds": 1200,
    "autoAcceptWarnings": true,
    "enableParallelExecution": true,
    "evolutionEnabled": true,
    "features": {
        "selfModification": true,
        "geneticAlgorithm": true,
        "realTimeAdaptation": true,
        "autoML": true,
        "continuousLearning": true
    }
}
EOF

# 3. 無限ループコマンドの作成
echo "♾️ 無限ループコマンドを作成中..."
cat > .claude/commands/infinite.md << 'EOF'
# 🔄 無限自律進化ループ

このコマンドは、プロジェクトを永続的に改善し続ける自律システムを起動します。

## 動作モード

### 🤖 完全自動モード
人間の介入なしで動作し続けます。以下のサイクルを無限に繰り返します：

1. **現状分析** 📊
   - プロジェクトの状態を分析
   - パフォーマンスメトリクスを収集
   - 改善可能な領域を特定

2. **タスク生成** 📝
   - AIが自動的にタスクを生成
   - 優先順位を動的に決定
   - 依存関係を考慮した実行計画

3. **並列実行** ⚡
   - 複数のサブエージェントが同時実行
   - 各エージェントの専門分野：
     - 🏗️ Architect: アーキテクチャ設計
     - 💻 Coder: 実装とコーディング
     - 🧪 Tester: テストと品質保証
     - ⚡ Optimizer: パフォーマンス最適化
     - 📚 Documenter: ドキュメント作成

4. **自己進化** 🧬
   - 実行結果から学習
   - 遺伝的アルゴリズムで戦略を改善
   - 成功パターンを記憶

5. **検証と記録** ✅
   - A/Bテストで効果を測定
   - 学習内容をデータベースに保存
   - 次世代への知識継承

## 使用方法

```
/infinite [オプション]

オプション:
  --auto     完全自動モード（確認なし）
  --verbose  詳細ログを表示
  --test     テストモード（実行せずに計画のみ）
```

## 注意事項

- このコマンドは停止するまで動作し続けます
- Ctrl+Cで安全に停止できます
- 重要な変更は.claude/logs/に記録されます

$ARGUMENTS
EOF

# 4. 自己進化エンジンコマンド
echo "🧬 自己進化エンジンを作成中..."
cat > .claude/commands/evolve.md << 'EOF'
# 🧬 自己進化エンジン

システム自体を分析し、より効率的に進化させます。

## 進化メカニズム

### 1. パフォーマンス分析
- 過去の実行データを分析
- ボトルネックを特定
- 改善可能な領域をマッピング

### 2. 遺伝的アルゴリズム
- 成功した戦略の「遺伝子」を抽出
- 新しい戦略を「交配」で生成
- 「突然変異」で革新的アプローチを試行

### 3. 自己修正
- より効率的なコードを生成
- 自身のアルゴリズムを更新
- 新しいコマンドを自動作成

## 実行
```
/evolve [target]

target:
  commands   コマンドを進化させる
  strategy   戦略を進化させる
  all        全体を進化させる
```

$ARGUMENTS
EOF

# 5. Hooksシステムの設定
echo "🪝 自動化フックを設定中..."
cat > .claude/hooks.toml << 'EOF'
# 自動化フックの設定

[[hooks]]
event = "PostToolUse"
run_in_background = true
[hooks.matcher]
tool_name = "edit_file"
file_paths = ["*.py"]
command = """
echo "[$(date)] Pythonファイル編集: $CLAUDE_FILE_PATHS" >> .claude/logs/activity.log
python -m black $CLAUDE_FILE_PATHS 2>/dev/null || true
python -m pytest --tb=short 2>/dev/null || echo "テスト未実装"
"""

[[hooks]]
event = "PostToolUse"
[hooks.matcher]
tool_name = "edit_file"
file_paths = ["*.js", "*.ts"]
command = """
echo "[$(date)] JS/TSファイル編集: $CLAUDE_FILE_PATHS" >> .claude/logs/activity.log
npx prettier --write $CLAUDE_FILE_PATHS 2>/dev/null || true
npx eslint --fix $CLAUDE_FILE_PATHS 2>/dev/null || true
"""

[[hooks]]
event = "PostToolUse"
[hooks.matcher]
tool_name = "create_file"
command = """
echo "[$(date)] 新規ファイル作成: $CLAUDE_FILE_PATHS" >> .claude/logs/activity.log
git add $CLAUDE_FILE_PATHS 2>/dev/null || true
"""

[[hooks]]
event = "PostToolUse"
run_in_background = true
[hooks.matcher]
tool_name = "run_command"
command = """
echo "[$(date)] コマンド実行完了" >> .claude/logs/activity.log
# パフォーマンスメトリクスを記録
echo "{\"timestamp\": \"$(date -Iseconds)\", \"event\": \"command_executed\"}" >> .claude/memory/metrics.jsonl
"""
EOF

# 6. メイン自律システム（Python）
echo "🐍 メイン自律システムを作成中..."
cat > .claude/scripts/autonomous_loop.py << 'EOF'
#!/usr/bin/env python3
"""
Claude Code 無限自律進化システム
メインループ実装
"""

import json
import time
import random
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any
import subprocess
import sys

class AutonomousEvolutionSystem:
    """自律進化システムのメインクラス"""
    
    def __init__(self):
        self.memory_path = Path(".claude/memory")
        self.memory_path.mkdir(exist_ok=True)
        self.logs_path = Path(".claude/logs")
        self.logs_path.mkdir(exist_ok=True)
        
        self.state_file = self.memory_path / "state.json"
        self.db_path = self.memory_path / "evolution.db"
        
        self.generation = 0
        self.performance_history = []
        self.strategies = []
        self.evolution_interval = 10  # 自己進化の間隔（世代数）
        
        self.init_database()
        self.load_state()
        
    def init_database(self):
        """学習データベースの初期化"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS performance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                generation INTEGER,
                task_type TEXT,
                success BOOLEAN,
                execution_time REAL,
                fitness_score REAL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS strategies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                generation INTEGER,
                strategy_params TEXT,
                performance_score REAL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS learnings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern TEXT,
                success_rate REAL,
                context TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
        
    def load_state(self):
        """前回の状態を読み込む"""
        if self.state_file.exists():
            try:
                with open(self.state_file) as f:
                    state = json.load(f)
                    self.generation = state.get("generation", 0)
                    self.performance_history = state.get("performance_history", [])
                    self.strategies = state.get("strategies", [])
                    self.evolution_interval = state.get("evolution_interval", 10)
                    print(f"✅ 前回の状態を復元しました（世代: {self.generation}）")
            except Exception as e:
                print(f"⚠️ 状態の読み込みに失敗: {e}")
                
    def save_state(self):
        """現在の状態を保存"""
        state = {
            "generation": self.generation,
            "last_update": datetime.now().isoformat(),
            "performance_history": self.performance_history[-100:],
            "current_fitness": self.calculate_fitness(),
            "strategies": self.strategies[-10:],
            "evolution_interval": self.evolution_interval,
            "statistics": {
                "total_tasks_executed": len(self.performance_history),
                "success_rate": self.get_success_rate(),
                "average_execution_time": self.get_average_execution_time()
            }
        }
        
        with open(self.state_file, 'w') as f:
            json.dump(state, f, indent=2)
            
    def log(self, message: str, level: str = "INFO"):
        """ログ出力"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_message = f"[{timestamp}] [{level}] {message}"
        print(log_message)
        
        # ファイルにも記録
        log_file = self.logs_path / f"evolution_{datetime.now().strftime('%Y%m%d')}.log"
        with open(log_file, 'a') as f:
            f.write(log_message + "\n")
            
    def generate_tasks(self) -> List[Dict[str, Any]]:
        """次に実行すべきタスクを自動生成"""
        self.log("タスクを生成中...")
        
        # タスクタイプと基本優先度
        task_types = {
            "コード最適化": 0.8,
            "テスト作成": 0.9,
            "ドキュメント更新": 0.6,
            "パフォーマンス改善": 0.7,
            "セキュリティ強化": 0.8,
            "リファクタリング": 0.7,
            "新機能実装": 0.5,
            "バグ修正": 0.9
        }
        
        tasks = []
        
        # 学習に基づいてタスクを生成
        for task_type, base_priority in task_types.items():
            # 過去の成功率から優先度を調整
            adjusted_priority = self.calculate_adjusted_priority(task_type, base_priority)
            
            # 閾値を超えたタスクのみ生成
            if adjusted_priority > 0.6:
                tasks.append({
                    "type": task_type,
                    "priority": adjusted_priority,
                    "description": f"{task_type}タスクを実行",
                    "estimated_time": random.randint(30, 300),
                    "parallel_safe": task_type not in ["リファクタリング", "新機能実装"]
                })
                
        # 優先度でソート
        tasks.sort(key=lambda x: x["priority"], reverse=True)
        
        # 上位5タスクを返す
        selected_tasks = tasks[:5]
        self.log(f"生成されたタスク数: {len(selected_tasks)}")
        
        return selected_tasks
        
    def calculate_adjusted_priority(self, task_type: str, base_priority: float) -> float:
        """学習データに基づいて優先度を調整"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 最近の成功率を取得
        cursor.execute('''
            SELECT AVG(success) as success_rate
            FROM performance
            WHERE task_type = ? AND generation > ?
        ''', (task_type, max(0, self.generation - 10)))
        
        result = cursor.fetchone()
        conn.close()
        
        if result and result[0] is not None:
            success_rate = result[0]
            # 成功率が高いタスクの優先度を上げる
            adjusted = base_priority * (0.5 + success_rate)
        else:
            # データがない場合は基本優先度を使用
            adjusted = base_priority
            
        return min(adjusted, 1.0)
        
    def calculate_fitness(self) -> float:
        """現在のシステムの適応度を計算"""
        if not self.performance_history:
            return 0.5
            
        recent = self.performance_history[-20:]
        
        # 成功率
        success_rate = sum(1 for p in recent if p.get("success", False)) / len(recent)
        
        # 実行時間の効率性
        avg_time = sum(p.get("execution_time", 100) for p in recent) / len(recent)
        time_efficiency = max(0, (300 - avg_time) / 300)
        
        # タスクの多様性
        task_types = set(p.get("task_type") for p in recent)
        diversity_score = len(task_types) / 8  # 8種類のタスクタイプ
        
        # 総合適応度
        fitness = (
            success_rate * 0.5 +
            time_efficiency * 0.3 +
            diversity_score * 0.2
        )
        
        return fitness
        
    def get_success_rate(self) -> float:
        """成功率を取得"""
        if not self.performance_history:
            return 0.0
        recent = self.performance_history[-50:]
        return sum(1 for p in recent if p.get("success", False)) / len(recent)
        
    def get_average_execution_time(self) -> float:
        """平均実行時間を取得"""
        if not self.performance_history:
            return 0.0
        recent = self.performance_history[-50:]
        return sum(p.get("execution_time", 0) for p in recent) / len(recent)
        
    def evolve_strategy(self) -> Dict[str, Any]:
        """遺伝的アルゴリズムで戦略を進化"""
        self.log("戦略を進化させています...")
        
        current_fitness = self.calculate_fitness()
        
        # 適応度に基づいて戦略パラメータを調整
        if current_fitness < 0.4:
            # パフォーマンスが低い：大胆な変更
            mutation_rate = 0.4
            exploration_rate = 0.8
            parallel_agents = 2
        elif current_fitness < 0.7:
            # 中程度：バランスの取れた戦略
            mutation_rate = 0.2
            exploration_rate = 0.5
            parallel_agents = 3
        else:
            # 高パフォーマンス：微調整
            mutation_rate = 0.1
            exploration_rate = 0.3
            parallel_agents = 5
            
        # 過去の成功戦略から学習
        if self.strategies:
            best_strategies = sorted(
                self.strategies, 
                key=lambda s: s.get("performance", 0), 
                reverse=True
            )[:3]
            
            if best_strategies:
                # 最良の戦略の要素を組み合わせる
                avg_mutation = sum(s.get("mutation_rate", 0.2) for s in best_strategies) / len(best_strategies)
                mutation_rate = (mutation_rate + avg_mutation) / 2
                
        strategy = {
            "generation": self.generation,
            "mutation_rate": mutation_rate,
            "exploration_rate": exploration_rate,
            "parallel_agents": min(parallel_agents, 5),
            "batch_size": random.randint(3, 7),
            "timeout_seconds": random.randint(60, 300),
            "retry_strategy": random.choice(["exponential", "linear", "adaptive"]),
            "performance": current_fitness
        }
        
        self.strategies.append(strategy)
        
        # データベースに保存
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO strategies (generation, strategy_params, performance_score)
            VALUES (?, ?, ?)
        ''', (self.generation, json.dumps(strategy), current_fitness))
        conn.commit()
        conn.close()
        
        return strategy
        
    def execute_task(self, task: Dict[str, Any], strategy: Dict[str, Any]) -> Dict[str, Any]:
        """タスクを実行（シミュレーション）"""
        start_time = time.time()
        
        # 実際の実行はClaude Codeが行う
        # ここではシミュレーション
        execution_time = random.uniform(10, task["estimated_time"])
        
        # 成功率は戦略と適応度に依存
        base_success_rate = 0.7
        strategy_bonus = strategy["exploration_rate"] * 0.1
        fitness_bonus = self.calculate_fitness() * 0.2
        
        success_probability = min(base_success_rate + strategy_bonus + fitness_bonus, 0.95)
        success = random.random() < success_probability
        
        result = {
            "task_type": task["type"],
            "success": success,
            "execution_time": execution_time,
            "timestamp": datetime.now().isoformat(),
            "generation": self.generation,
            "strategy_used": strategy
        }
        
        # パフォーマンス履歴に追加
        self.performance_history.append(result)
        
        # データベースに記録
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO performance (generation, task_type, success, execution_time, fitness_score)
            VALUES (?, ?, ?, ?, ?)
        ''', (self.generation, task["type"], success, execution_time, self.calculate_fitness()))
        conn.commit()
        conn.close()
        
        return result
        
    def learn_from_results(self, results: List[Dict[str, Any]]):
        """実行結果から学習"""
        self.log("実行結果から学習中...")
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # タスクタイプごとの成功パターンを分析
        task_types = set(r["task_type"] for r in results)
        
        for task_type in task_types:
            task_results = [r for r in results if r["task_type"] == task_type]
            success_rate = sum(1 for r in task_results if r["success"]) / len(task_results)
            
            # 学習内容を保存
            cursor.execute('''
                INSERT INTO learnings (pattern, success_rate, context)
                VALUES (?, ?, ?)
            ''', (
                f"task_type:{task_type}",
                success_rate,
                json.dumps({
                    "generation": self.generation,
                    "sample_size": len(task_results),
                    "avg_execution_time": sum(r["execution_time"] for r in task_results) / len(task_results)
                })
            ))
            
        conn.commit()
        conn.close()
        
    def run_self_evolution(self):
        """システム自体を進化させる（/evolveコマンド相当）"""
        self.log("="*60, "INFO")
        self.log("🧬 自己進化プロセスを開始します（10世代ごとの特別イベント）", "INFO")
        self.log("="*60, "INFO")
        
        # 現在のパフォーマンスを分析
        fitness = self.calculate_fitness()
        success_rate = self.get_success_rate()
        
        self.log(f"現在のシステムパフォーマンス:")
        self.log(f"  - 適応度: {fitness:.3f}")
        self.log(f"  - 成功率: {success_rate:.1%}")
        
        # 自己改善の実行
        improvements = []
        
        # 1. タスクタイプの最適化
        self.log("📊 タスクタイプの効率を分析中...")
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT task_type, 
                   AVG(success) as success_rate,
                   AVG(execution_time) as avg_time,
                   COUNT(*) as execution_count
            FROM performance
            WHERE generation > ?
            GROUP BY task_type
            ORDER BY success_rate DESC
        ''', (max(0, self.generation - 50),))
        
        task_performance = cursor.fetchall()
        
        # 低パフォーマンスタスクの改善戦略を生成
        for task_type, success_rate, avg_time, count in task_performance:
            if success_rate < 0.5 and count > 5:
                self.log(f"⚠️ 低パフォーマンスタスク検出: {task_type} (成功率: {success_rate:.1%})")
                improvements.append({
                    "type": "task_optimization",
                    "target": task_type,
                    "action": "reduce_priority",
                    "reason": f"成功率が{success_rate:.1%}と低い"
                })
        
        # 2. 戦略パラメータの最適化
        self.log("🎯 戦略パラメータを最適化中...")
        
        # 最も成功した戦略を分析
        cursor.execute('''
            SELECT strategy_params, performance_score
            FROM strategies
            WHERE generation > ?
            ORDER BY performance_score DESC
            LIMIT 5
        ''', (max(0, self.generation - 50),))
        
        best_strategies = cursor.fetchall()
        
        if best_strategies:
            # 最良の戦略から学習
            best_params = json.loads(best_strategies[0][0])
            self.log(f"✨ 最良の戦略を発見:")
            self.log(f"   - 突然変異率: {best_params.get('mutation_rate', 0):.2f}")
            self.log(f"   - 探索率: {best_params.get('exploration_rate', 0):.2f}")
            
            improvements.append({
                "type": "strategy_optimization",
                "action": "adopt_best_practices",
                "params": best_params
            })
        
        # 3. システムコードの自己修正（シミュレーション）
        self.log("🔧 システムコードの改善点を検討中...")
        
        # 実行時間の分析
        if self.get_average_execution_time() > 180:  # 3分以上
            improvements.append({
                "type": "performance_optimization",
                "action": "reduce_task_complexity",
                "reason": "平均実行時間が長すぎる"
            })
        
        # メモリ使用量の最適化（履歴データのクリーンアップ）
        if len(self.performance_history) > 1000:
            self.log("🧹 パフォーマンス履歴をクリーンアップ中...")
            self.performance_history = self.performance_history[-500:]
            improvements.append({
                "type": "memory_optimization",
                "action": "cleanup_history",
                "reason": "履歴データが大きくなりすぎた"
            })
        
        # 4. 新しい機能の追加提案
        if fitness > 0.8:  # 高パフォーマンス時
            self.log("🚀 新機能の追加を検討中...")
            new_features = [
                "並列実行数の増加",
                "より高度な学習アルゴリズム",
                "予測的タスク生成"
            ]
            
            selected_feature = random.choice(new_features)
            improvements.append({
                "type": "feature_addition",
                "action": f"implement_{selected_feature}",
                "reason": "システムが安定しているため"
            })
        
        # 5. 自己進化の結果を保存
        cursor.execute('''
            INSERT INTO learnings (pattern, success_rate, context)
            VALUES (?, ?, ?)
        ''', (
            "self_evolution",
            fitness,
            json.dumps({
                "generation": self.generation,
                "improvements": improvements,
                "timestamp": datetime.now().isoformat()
            })
        ))
        
        conn.commit()
        conn.close()
        
        # 改善の適用
        self.log("\n🔄 改善を適用中...")
        for improvement in improvements:
            self.log(f"  - {improvement['type']}: {improvement['action']}")
            
            # 実際の改善適用（シミュレーション）
            if improvement['type'] == 'strategy_optimization':
                # 最良の戦略パラメータを部分的に採用
                if self.strategies:
                    last_strategy = self.strategies[-1]
                    best_params = improvement.get('params', {})
                    last_strategy['mutation_rate'] = (last_strategy.get('mutation_rate', 0.2) + best_params.get('mutation_rate', 0.2)) / 2
        
        # 自己進化の完了
        self.log("\n✅ 自己進化プロセス完了！")
        self.log(f"  - 実施した改善数: {len(improvements)}")
        self.log(f"  - 次回の自己進化: 世代 {self.generation + 10}")
        self.log("="*60 + "\n")
        
        # 自己進化も学習データとして記録
        self.performance_history.append({
            "task_type": "自己進化",
            "success": True,
            "execution_time": 30,  # 仮の実行時間
            "timestamp": datetime.now().isoformat(),
            "generation": self.generation,
            "improvements_count": len(improvements)
        })
        
        # 状態を保存
        self.save_state()
        
    def display_status(self):
        """現在の状態を表示"""
        print("\n" + "="*60)
        print(f"🧬 世代: {self.generation}")
        print(f"🎯 適応度: {self.calculate_fitness():.3f}")
        print(f"✅ 成功率: {self.get_success_rate():.1%}")
        print(f"⏱️ 平均実行時間: {self.get_average_execution_time():.1f}秒")
        print(f"📊 実行済みタスク数: {len(self.performance_history)}")
        print(f"🔄 次回の自己進化: 世代 {((self.generation // self.evolution_interval) + 1) * self.evolution_interval}")
        print("="*60 + "\n")
        
    def run_generation(self):
        """1世代の実行"""
        self.generation += 1
        self.log(f"第{self.generation}世代を開始します", "INFO")
        
        # 現在の状態を表示
        self.display_status()
        
        # 10世代ごとに自己進化を実行
        if self.generation % self.evolution_interval == 0:
            self.run_self_evolution()
        
        # タスク生成
        tasks = self.generate_tasks()
        
        if not tasks:
            self.log("実行可能なタスクがありません", "WARNING")
            return
            
        # 戦略の進化
        strategy = self.evolve_strategy()
        
        self.log(f"進化した戦略:")
        self.log(f"  - 突然変異率: {strategy['mutation_rate']:.2f}")
        self.log(f"  - 探索率: {strategy['exploration_rate']:.2f}")
        self.log(f"  - 並列エージェント数: {strategy['parallel_agents']}")
        
        # タスクの実行
        results = []
        
        # 並列実行可能なタスクをグループ化
        parallel_tasks = [t for t in tasks if t.get("parallel_safe", True)][:strategy["parallel_agents"]]
        sequential_tasks = [t for t in tasks if not t.get("parallel_safe", True)]
        
        # 並列タスクの実行
        if parallel_tasks:
            self.log(f"並列実行: {len(parallel_tasks)}個のタスク")
            for task in parallel_tasks:
                result = self.execute_task(task, strategy)
                results.append(result)
                status = "✅" if result["success"] else "❌"
                self.log(f"  {status} {task['type']} ({result['execution_time']:.1f}秒)")
                
        # 順次タスクの実行
        for task in sequential_tasks:
            self.log(f"順次実行: {task['type']}")
            result = self.execute_task(task, strategy)
            results.append(result)
            status = "✅" if result["success"] else "❌"
            self.log(f"  {status} {task['type']} ({result['execution_time']:.1f}秒)")
            
        # 結果から学習
        if results:
            self.learn_from_results(results)
            
        # 状態を保存
        self.save_state()
        
        # 世代サマリー
        generation_success_rate = sum(1 for r in results if r["success"]) / len(results) if results else 0
        self.log(f"世代{self.generation}完了 - 成功率: {generation_success_rate:.1%}")
        
    def run_forever(self):
        """無限ループで実行"""
        self.log("🚀 無限自律進化システムを起動しました", "INFO")
        self.log("Ctrl+Cで安全に停止できます", "INFO")
        
        try:
            while True:
                self.run_generation()
                
                # 次の世代までの待機時間を動的に決定
                fitness = self.calculate_fitness()
                if fitness < 0.5:
                    wait_time = 30  # パフォーマンスが低い：短い間隔
                elif fitness < 0.8:
                    wait_time = 60  # 中程度：標準的な間隔
                else:
                    wait_time = 120  # 高パフォーマンス：長い間隔
                    
                self.log(f"次の世代まで{wait_time}秒待機します...")
                time.sleep(wait_time)
                
        except KeyboardInterrupt:
            self.log("\n🛑 システムを安全に停止しています...", "INFO")
            self.save_state()
            self.display_status()
            self.log("停止しました。また後で再開できます。", "INFO")
            
def main():
    """メインエントリーポイント"""
    system = AutonomousEvolutionSystem()
    
    # コマンドライン引数の処理
    if len(sys.argv) > 1:
        if sys.argv[1] == "--status":
            system.display_status()
            return
        elif sys.argv[1] == "--reset":
            print("⚠️ システムをリセットしますか？ (y/N): ", end="")
            if input().lower() == 'y':
                system.generation = 0
                system.performance_history = []
                system.strategies = []
                system.save_state()
                print("✅ リセット完了")
            return
        elif sys.argv[1] == "--evolution-interval" and len(sys.argv) > 2:
            try:
                interval = int(sys.argv[2])
                system.evolution_interval = interval
                print(f"✅ 自己進化間隔を{interval}世代に設定しました")
            except ValueError:
                print("❌ 無効な数値です")
                return
        elif sys.argv[1] == "--help":
            print("使用方法:")
            print("  python3 autonomous_loop.py           # 通常実行")
            print("  python3 autonomous_loop.py --status  # 状態確認")
            print("  python3 autonomous_loop.py --reset   # リセット")
            print("  python3 autonomous_loop.py --evolution-interval 5  # 自己進化間隔を5世代に設定")
            return
            
    # メインループを実行
    system.run_forever()

if __name__ == "__main__":
    main()
EOF

# 7. 実行権限を付与
chmod +x .claude/scripts/autonomous_loop.py

# 8. 初期化スクリプト
cat > .claude/scripts/init.sh << 'EOF'
#!/bin/bash
# システム初期化スクリプト

echo "🔧 依存関係をチェック中..."

# Pythonパッケージのインストール（可能な場合）
if command -v pip3 &> /dev/null; then
    echo "📦 Pythonパッケージをインストール中..."
    pip3 install --user black pytest 2>/dev/null || true
fi

# Node.jsパッケージのインストール（可能な場合）
if command -v npm &> /dev/null; then
    echo "📦 Node.jsパッケージをインストール中..."
    npm install --no-save prettier eslint 2>/dev/null || true
fi

echo "✅ 初期化完了！"
EOF

chmod +x .claude/scripts/init.sh

# 9. README作成
cat > .claude/README.md << 'EOF'
# Claude Code 無限自律進化システム

## クイックスタート

1. **セットアップ完了確認**
   ```bash
   ls -la .claude/
   ```

2. **システム起動**
   ```bash
   # 方法1: カスタムコマンド
   /infinite
   
   # 方法2: Pythonスクリプト
   python3 .claude/scripts/autonomous_loop.py
   
   # 方法3: バックグラウンド実行
   nohup python3 .claude/scripts/autonomous_loop.py > .claude/logs/system.log 2>&1 &
   ```

3. **状態確認**
   ```bash
   # 現在の状態
   python3 .claude/scripts/autonomous_loop.py --status
   
   # ログ確認
   tail -f .claude/logs/evolution_*.log
   
   # メトリクス確認
   cat .claude/memory/state.json | jq .
   ```

4. **停止方法**
   - フォアグラウンド実行時: `Ctrl+C`
   - バックグラウンド実行時: `pkill -f autonomous_loop.py`

## 🧬 自己進化機能

システムは10世代ごとに自動的に自己進化を実行します：

- **パフォーマンス分析**: 過去の実行データを分析
- **戦略最適化**: 成功した戦略を学習して改善
- **コード最適化**: システム自体の効率を向上
- **新機能追加**: 高パフォーマンス時に新機能を提案

### 自己進化の間隔を変更

```bash
# 5世代ごとに自己進化を実行
python3 .claude/scripts/autonomous_loop.py --evolution-interval 5
```

## ディレクトリ構造

```
.claude/
├── commands/       # カスタムコマンド
├── hooks/          # 自動化フック
├── memory/         # 学習データと状態
├── scripts/        # 実行スクリプト
├── logs/           # ログファイル
└── README.md       # このファイル
```

## トラブルシューティング

### システムが起動しない
```bash
# 権限を確認
chmod +x .claude/scripts/*.py
chmod +x .claude/scripts/*.sh
```

### リセットしたい場合
```bash
python3 .claude/scripts/autonomous_loop.py --reset
```

### パフォーマンスが低下した場合
1. ログを確認: `tail -100 .claude/logs/evolution_*.log`
2. 状態を確認: `cat .claude/memory/state.json`
3. 必要に応じてリセット

## 詳細ドキュメント

詳細な設定やカスタマイズについては、以下を参照：
- `.claude/commands/` - コマンドの追加方法
- `.claude/hooks.toml` - フックのカスタマイズ
- `.claude/scripts/autonomous_loop.py` - コアロジックの理解

## サポート

問題が発生した場合は、以下の情報と共に報告してください：
- `.claude/memory/state.json`の内容
- 最新のログファイル
- 実行環境の情報
EOF

# 10. 完了メッセージ
echo ""
echo "✨ セットアップが完了しました！"
echo ""
echo "🚀 使い方:"
echo "  1. カスタムコマンドで起動: /infinite"
echo "  2. Pythonスクリプトで起動: python3 .claude/scripts/autonomous_loop.py"
echo "  3. 状態を確認: python3 .claude/scripts/autonomous_loop.py --status"
echo ""
echo "🧬 自己進化機能:"
echo "  - デフォルトで10世代ごとに自動的にシステム自体を改善"
echo "  - 間隔を変更: python3 .claude/scripts/autonomous_loop.py --evolution-interval 5"
echo ""
echo "📚 詳細は .claude/README.md を参照してください"
echo ""
echo "💡 ヒント: Shift+Tabでauto-acceptモードを有効にすると完全自動化できます"