// start = 開始, now = 現在, diff = 差分
// role = 役, label = 表示名, key = 内部ID（固定）

// 子役（6種類ぜんぶ可変）
let koyakuRoles = [
  { key: "role_0", label: "ベル" },
  { key: "role_1", label: "チェリー" },
  { key: "role_2", label: "スイカ" },
  { key: "role_3", label: "弱チェ" },
  { key: "role_4", label: "強チェ" },
  { key: "role_5", label: "チャンス目" },
];

const BONUS_ROLES = [
  { key: "bb", label: "BB（ビッグ）" },
  { key: "rb", label: "RB（レギュラー）" },
];

// ゲーム数（差分方式）
let startGames = 0; // 開始G
let nowGames = 0;   // 現在G

// カウント（子役 + BB/RB）
let curCounts = {};
let history = [];

// v4: 子役6可変 + 差分G + BB/RB
const STORAGE_KEY = "koyaku_counter_history_v4";

// DOM
const $startGamesInput = document.getElementById("startGamesInput");
const $nowGamesInput = document.getElementById("nowGamesInput");
const $diffGames = document.getElementById("diffGames");

const $bonusCounters = document.getElementById("bonusCounters");
const $koyakuCounters = document.getElementById("koyakuCounters");

const $bbCount = document.getElementById("bbCount");
const $rbCount = document.getElementById("rbCount");
const $bonusTotal = document.getElementById("bonusTotal");

const $bonusGassan = document.getElementById("bonusGassan");
const $bbRate = document.getElementById("bbRate");
const $rbRate = document.getElementById("rbRate");

const $totalKoyaku = document.getElementById("totalKoyaku");
const $koyakuRatesLine = document.getElementById("koyakuRatesLine");
const $history = document.getElementById("history");

function clampNonNegative(n) { return Math.max(0, n); }
function getDiffGames() { return clampNonNegative(nowGames - startGames); }

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function saveHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function initCountsIfNeeded() {
  for (const r of koyakuRoles) {
    if (typeof curCounts[r.key] !== "number") curCounts[r.key] = 0;
  }
  for (const b of BONUS_ROLES) {
    if (typeof curCounts[b.key] !== "number") curCounts[b.key] = 0;
  }
}

function renderCounterList(containerEl, roles) {
  initCountsIfNeeded();
  containerEl.innerHTML = "";

  for (const role of roles) {
    const wrap = document.createElement("div");
    wrap.className = "counter";

    const left = document.createElement("div");
    left.className = "counter-name";
    left.textContent = role.label;

    const right = document.createElement("div");
    right.className = "counter-controls";

    const minusBtn = document.createElement("button");
    minusBtn.textContent = "-1";
    minusBtn.addEventListener("click", () => {
      curCounts[role.key] = clampNonNegative(curCounts[role.key] - 1);
      updateView();
    });

    const countPill = document.createElement("div");
    countPill.className = "pill";
    countPill.textContent = curCounts[role.key];

    const plusBtn = document.createElement("button");
    plusBtn.textContent = "+1";
    plusBtn.addEventListener("click", () => {
      curCounts[role.key] = curCounts[role.key] + 1;
      updateView();
    });

    right.appendChild(minusBtn);
    right.appendChild(countPill);
    right.appendChild(plusBtn);

    wrap.appendChild(left);
    wrap.appendChild(right);
    containerEl.appendChild(wrap);
  }
}

function formatRate1OverX(count, games) {
  if (games <= 0 || count <= 0) return "-";
  return "1/" + (games / count).toFixed(1);
}

function updateCalculations() {
  initCountsIfNeeded();
  const diffGames = getDiffGames();
  $diffGames.textContent = String(diffGames);

  // ボーナス
  const bb = curCounts.bb;
  const rb = curCounts.rb;
  const bonusTotal = bb + rb;

  $bbCount.textContent = String(bb);
  $rbCount.textContent = String(rb);
  $bonusTotal.textContent = String(bonusTotal);

  $bonusGassan.textContent = formatRate1OverX(bonusTotal, diffGames);
  $bbRate.textContent = formatRate1OverX(bb, diffGames);
  $rbRate.textContent = formatRate1OverX(rb, diffGames);

  // 子役合計
  let koyakuTotal = 0;
  for (const r of koyakuRoles) koyakuTotal += curCounts[r.key];
  $totalKoyaku.textContent = String(koyakuTotal);

  // 子役の各役の出現率（1行）
  const lines = koyakuRoles.map(r => `${r.label}: ${formatRate1OverX(curCounts[r.key], diffGames)}（${curCounts[r.key]}回）`);
  $koyakuRatesLine.textContent = lines.join(" / ");
}

function renderHistory() {
  $history.innerHTML = "";
  if (history.length === 0) {
    $history.innerHTML = `<div class="small">履歴はまだありません</div>`;
    return;
  }

  const reversed = [...history].reverse();
  for (const item of reversed) {
    const div = document.createElement("div");
    div.className = "history-item";

    const title = document.createElement("div");
    title.innerHTML =
      `<strong>${item.savedAt}</strong>` +
      ` / start=${item.startGames}, now=${item.nowGames}, diff=${item.diffGames}` +
      ` / 合算(BB+RB)=${item.bonusGassan}` +
      ` / BB=${item.bbRate}` +
      ` / RB=${item.rbRate}`;

    const line1 = document.createElement("div");
    line1.className = "small";
    line1.textContent = `BB=${item.counts.bb}, RB=${item.counts.rb}, BB+RB=${item.bonusTotal}`;

    const line2 = document.createElement("div");
    line2.className = "small";
    line2.textContent = item.koyakuSummaries.join(" / ");

    const actions = document.createElement("div");
    actions.className = "history-actions";

    const loadBtn = document.createElement("button");
    loadBtn.textContent = "読み込み";
    loadBtn.addEventListener("click", () => {
      startGames = item.startGames;
      nowGames = item.nowGames;
      curCounts = { ...item.counts };
      koyakuRoles = item.koyakuRoles.map(r => ({ ...r }));

      // 入力欄に反映
      for (let i = 0; i < 6; i++) {
        document.getElementById(`koyakuName${i}`).value = koyakuRoles[i].label;
      }

      updateView();
    });

    const delBtn = document.createElement("button");
    delBtn.textContent = "この履歴を削除";
    delBtn.addEventListener("click", () => {
      const idx = history.findIndex(h => h.id === item.id);
      if (idx >= 0) history.splice(idx, 1);
      saveHistory();
      updateView();
    });

    actions.appendChild(loadBtn);
    actions.appendChild(delBtn);

    div.appendChild(title);
    div.appendChild(line1);
    div.appendChild(line2);
    div.appendChild(actions);
    $history.appendChild(div);
  }
}

function updateView() {
  $startGamesInput.value = String(startGames);
  $nowGamesInput.value = String(nowGames);

  renderCounterList($bonusCounters, BONUS_ROLES);
  renderCounterList($koyakuCounters, koyakuRoles);

  updateCalculations();
  renderHistory();
}

// --- イベント：現在Gボタン ---
document.querySelectorAll("[data-now-delta]").forEach(btn => {
  btn.addEventListener("click", () => {
    nowGames = clampNonNegative(nowGames + Number(btn.getAttribute("data-now-delta")));
    updateView();
  });
});

// --- イベント：Gの直接入力 ---
$startGamesInput.addEventListener("input", () => {
  const v = Number($startGamesInput.value);
  startGames = clampNonNegative(Number.isFinite(v) ? v : 0);
  updateView();
});
$nowGamesInput.addEventListener("input", () => {
  const v = Number($nowGamesInput.value);
  nowGames = clampNonNegative(Number.isFinite(v) ? v : 0);
  updateView();
});

// --- カウントだけリセット（Gは残す） ---
document.getElementById("resetCurrentBtn").addEventListener("click", () => {
  curCounts = {};
  initCountsIfNeeded();
  updateView();
});

// --- 子役名：直接編集（6個） ---
function bindKoyakuNameInput(idx) {
  const el = document.getElementById(`koyakuName${idx}`);
  el.addEventListener("input", () => {
    const v = el.value.trim();
    koyakuRoles[idx].label = v.length > 0 ? v : `役${idx + 1}`;
    updateView();
  });
}
for (let i = 0; i < 6; i++) bindKoyakuNameInput(i);

// --- 保存 / 履歴 ---
document.getElementById("saveBtn").addEventListener("click", () => {
  initCountsIfNeeded();

  const bb = curCounts.bb;
  const rb = curCounts.rb;
  const bonusTotal = bb + rb;
  const diffGames = getDiffGames();

  const koyakuSummaries = koyakuRoles.map(r => `${r.label}:${curCounts[r.key]}`);

  const item = {
    id: crypto.randomUUID(),
    savedAt: new Date().toLocaleString(),

    startGames,
    nowGames,
    diffGames,

    counts: { ...curCounts },
    koyakuRoles: koyakuRoles.map(r => ({ ...r })),

    bonusTotal,
    bonusGassan: formatRate1OverX(bonusTotal, diffGames),
    bbRate: formatRate1OverX(bb, diffGames),
    rbRate: formatRate1OverX(rb, diffGames),

    koyakuSummaries,
  };

  history.push(item);
  saveHistory();
  updateView();
});

document.getElementById("clearHistoryBtn").addEventListener("click", () => {
  history = [];
  saveHistory();
  updateView();
});

// 起動時：入力欄→配列に反映してから起動
function syncNamesFromInputs() {
  for (let i = 0; i < 6; i++) {
    const v = document.getElementById(`koyakuName${i}`).value.trim();
    koyakuRoles[i].label = v.length > 0 ? v : `役${i + 1}`;
  }
}

history = loadHistory();
syncNamesFromInputs();
initCountsIfNeeded();
updateView();