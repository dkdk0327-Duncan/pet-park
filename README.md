# 🌟 小遊戲歡樂大廳

給家人一起玩的網頁小遊戲合集，打開網頁就能玩，不用安裝。

## 🎮 遊戲

| 遊戲 | 說明 |
| --- | --- |
| 🐾 寵物領養樂園 3D | 在 3D 樂園領養 20 種動物，陪牠們玩、長大、生寶寶。有天氣、日夜、小主人的家、小鳥和熱氣球，每個玩家的進度分開。 |
| ♻️ 環保小尖兵 | 學習垃圾分類 |
| 🎀 可愛化妝換裝 | 幫小女孩或小兔子打扮 |
| 🐉 合體英雄 | 合體英雄升等，挑戰 30 關 Boss |
| 🏃 極速跑酷 | 跳躍閃避障礙，挑戰 40 關 |

## 📁 檔案

- `index.html`：大廳（首頁）
- `pet.html` + `pet-*.js`、`pet3d-*.js`、`pet-style.css`：寵物領養樂園 3D
- `recycle.html`、`makeup.html`、`merge.html`、`runner.html`：其他小遊戲

全部都是靜態網頁（HTML / CSS / JavaScript），可以直接放在 GitHub Pages。
3D 引擎 Three.js r147 也放在網站裡 (`lib/three/`)，只要連得到這個網站就能玩，不會連到其他網站。

## 💾 存檔

進度存在每台裝置自己的瀏覽器（localStorage），不會上傳到網路。
清除瀏覽器資料或換裝置、換瀏覽器，進度就不會跟過去。

## 🧩 第三方程式

- `lib/three/`：[Three.js](https://github.com/mrdoob/three.js) r147（MIT 授權，授權條款在 `lib/three/LICENSE`）。
  直接放在網站裡，不用連外部 CDN，只要連得到這個 GitHub Pages 網站就能玩。
