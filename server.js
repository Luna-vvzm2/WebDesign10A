// 1. Expressモジュールを読み込む
const express = require('express');
// 2. Expressアプリケーションのインスタンスを作成
const app = express();
// 3. サーバーがリッスンするポート番号を定義
const port = 3000; // 例: 3000番ポート

// 4. ルートパス ('/') へのGETリクエストを処理するルーティングを設定
const path = require("path");

app.get('/', (req, res) => {
  // res.send() はクライアントに文字列を送信するメソッド
  const filePath = path.join(__dirname, "10-A.html");
  res.sendFile(filePath);
});

// 5. サーバーを起動し、指定したポートでリクエストを待ち受ける
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
  console.log('Ctrl+C でサーバーを停止できます。');
});
