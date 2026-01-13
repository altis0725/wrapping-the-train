---
name: shotstack
description: |
  Shotstack APIを使ったルママスク合成。動画のレイヤー合成、マスク処理、
  レンダリング管理を行う。トリガー: 'Shotstack', '動画合成', 'ルママスク',
  'luma matte', '動画マージ', 'video merge', 'テンプレート合成'
---

# Shotstack ルママスク合成

## ルママスクの基本概念

ルママスク（Luma Matte）は白黒画像を使って動画に透明度を作る仕組み。

- **白** = 透明（穴が開く）
- **黒** = 不透明（残る）
- **グレー** = 半透明

### トラック構造

```
Track 0 (最上位): Wheel動画 + mask_wheel.png
Track 1 (中間):   Window動画 + mask_window.png
Track 2 (最下位): Background動画
```

Shotstackのtracks配列はindex 0が最上位レイヤー。

### クリップ配置

同一トラック内にluma（マスク）とvideo（コンテンツ）を配置:

```json
{
  "clips": [
    { "asset": { "type": "luma", "src": "mask.png" }, "start": 0, "length": 30 },
    { "asset": { "type": "video", "src": "content.mp4" }, "start": 0, "length": 30 }
  ]
}
```

## APIエンドポイント

| 環境 | URL |
|------|-----|
| Stage | `https://api.shotstack.io/stage` |
| Production | `https://api.shotstack.io/v1` |

### レンダリング開始

```
POST /render
Header: x-api-key: {API_KEY}
```

### ステータス確認

```
GET /render/{renderId}
Header: x-api-key: {API_KEY}
```

**ステータス一覧**: `queued` → `fetching` → `preprocessing` → `rendering` → `saving` → `done` / `failed`

## 実装時の注意点

1. **fps/尺の同期**: マスクと動画は同一解像度・同一尺・同一fpsで作成
2. **マスクホスティング**: マスク画像は公開URLで配置（`{APP_BASE_URL}/img/mask_*.png`）
3. **タイムアウト**: レンダリング開始は30秒、ステータス確認は15秒を目安
4. **ポーリング**: 5秒間隔、最大10分でタイムアウト
5. **白黒反転**: 期待と逆の結果になったらマスクを反転

## 詳細リファレンス

- [APIパターン詳細](references/api-patterns.md) - リクエスト/レスポンス例、エラーハンドリング

## 外部リソース

- [Shotstack Luma Matte Guide](https://shotstack.io/docs/guide/architecting-an-application/masks-luma-mattes/)
- [After Effectsでのマスク作成](https://shotstack.io/learn/create-luma-matte-after-effects/)
