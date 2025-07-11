module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新機能
        'fix',      // バグ修正
        'docs',     // ドキュメントのみの変更
        'style',    // コードの意味に影響を与えない変更
        'refactor', // バグ修正でも機能追加でもないコード変更
        'perf',     // パフォーマンス改善
        'test',     // テストの追加・修正
        'chore',    // ビルドプロセスやツールの変更
        'revert',   // 以前のコミットを取り消す
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 72],
  },
};