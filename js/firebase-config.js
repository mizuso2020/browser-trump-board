/**
 * Firebase 設定
 *
 * オンラインモードを使うには Firebase プロジェクトを作成し、
 * 下の値を書き換えてください（無料枠でOK）。
 *
 * 手順は README.md を参照。
 */

const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

function isFirebaseConfigured() {
  return Boolean(
    FIREBASE_CONFIG.apiKey &&
    FIREBASE_CONFIG.databaseURL &&
    FIREBASE_CONFIG.projectId
  );
}
