const UPPER_CATEGORIES = [
  { key: "ones", label: "Ones", value: 1 },
  { key: "twos", label: "Twos", value: 2 },
  { key: "threes", label: "Threes", value: 3 },
  { key: "fours", label: "Fours", value: 4 },
  { key: "fives", label: "Fives", value: 5 },
  { key: "sixes", label: "Sixes", value: 6 },
];

const LOWER_CATEGORIES = [
  { key: "onePair", label: "One Pair" },
  { key: "twoPairs", label: "Two Pairs" },
  { key: "threeOfKind", label: "Three of a Kind" },
  { key: "fourOfKind", label: "Four of a Kind" },
  { key: "smallStraight", label: "Small Straight" },
  { key: "largeStraight", label: "Large Straight" },
  { key: "fullHouse", label: "Full House" },
  { key: "chance", label: "Chance" },
  { key: "yatzy", label: "Yatzy" },
];

const MAX_ROLLS = 3;
const NUM_DICE = 5;

let dice = Array(NUM_DICE).fill(1);
let held = Array(NUM_DICE).fill(false);
let rollsLeft = MAX_ROLLS;
let hasRolled = false;
let scores = {};

const diceRowEl = document.getElementById("dice-row");
const rollBtn = document.getElementById("roll-btn");
const rollsLeftEl = document.getElementById("rolls-left");
const upperSectionEl = document.getElementById("upper-section");
const lowerSectionEl = document.getElementById("lower-section");
const upperSumEl = document.getElementById("upper-sum");
const bonusEl = document.getElementById("bonus");
const grandTotalEl = document.getElementById("grand-total");
const gameOverEl = document.getElementById("game-over");
const finalScoreEl = document.getElementById("final-score");
const newGameBtn = document.getElementById("new-game-btn");

const PIP_LAYOUT = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function countValues(values) {
  const counts = Array(7).fill(0);
  values.forEach((v) => counts[v]++);
  return counts;
}

const SCORERS = {
  ones: (v) => countValues(v)[1] * 1,
  twos: (v) => countValues(v)[2] * 2,
  threes: (v) => countValues(v)[3] * 3,
  fours: (v) => countValues(v)[4] * 4,
  fives: (v) => countValues(v)[5] * 5,
  sixes: (v) => countValues(v)[6] * 6,
  onePair: (v) => {
    const counts = countValues(v);
    for (let face = 6; face >= 1; face--) {
      if (counts[face] >= 2) return face * 2;
    }
    return 0;
  },
  twoPairs: (v) => {
    const counts = countValues(v);
    const pairs = [];
    for (let face = 6; face >= 1; face--) {
      if (counts[face] >= 2) pairs.push(face);
    }
    if (pairs.length >= 2) {
      return pairs[0] * 2 + pairs[1] * 2;
    }
    return 0;
  },
  threeOfKind: (v) => {
    const counts = countValues(v);
    for (let face = 6; face >= 1; face--) {
      if (counts[face] >= 3) return face * 3;
    }
    return 0;
  },
  fourOfKind: (v) => {
    const counts = countValues(v);
    for (let face = 6; face >= 1; face--) {
      if (counts[face] >= 4) return face * 4;
    }
    return 0;
  },
  smallStraight: (v) => {
    const sorted = [...v].sort();
    return sorted.join("") === "12345" ? 15 : 0;
  },
  largeStraight: (v) => {
    const sorted = [...v].sort();
    return sorted.join("") === "23456" ? 20 : 0;
  },
  fullHouse: (v) => {
    const counts = countValues(v);
    let three = 0;
    let two = 0;
    for (let face = 1; face <= 6; face++) {
      if (counts[face] === 3) three = face;
      if (counts[face] === 2) two = face;
    }
    return three && two ? three * 3 + two * 2 : 0;
  },
  chance: (v) => v.reduce((sum, n) => sum + n, 0),
  yatzy: (v) => {
    const counts = countValues(v);
    return counts.some((c) => c === 5) ? 50 : 0;
  },
};

function init() {
  scores = {};
  [...UPPER_CATEGORIES, ...LOWER_CATEGORIES].forEach((cat) => {
    scores[cat.key] = null;
  });
  dice = Array(NUM_DICE).fill(1);
  held = Array(NUM_DICE).fill(false);
  rollsLeft = MAX_ROLLS;
  hasRolled = false;

  gameOverEl.classList.add("hidden");
  buildScorecard();
  renderDice();
  updateControls();
  updateTotals();
}

function buildScorecard() {
  upperSectionEl.innerHTML = "";
  UPPER_CATEGORIES.forEach((cat) => {
    upperSectionEl.appendChild(buildCategoryRow(cat));
  });

  lowerSectionEl.innerHTML = "";
  LOWER_CATEGORIES.forEach((cat) => {
    lowerSectionEl.appendChild(buildCategoryRow(cat));
  });
}

function buildCategoryRow(cat) {
  const tr = document.createElement("tr");
  tr.className = "category-row";

  const labelTd = document.createElement("td");
  labelTd.textContent = cat.label;

  const scoreTd = document.createElement("td");
  const btn = document.createElement("button");
  btn.className = "score-btn";
  btn.dataset.key = cat.key;
  btn.textContent = "-";
  btn.addEventListener("click", () => chooseCategory(cat.key));
  scoreTd.appendChild(btn);

  tr.appendChild(labelTd);
  tr.appendChild(scoreTd);
  return tr;
}

function renderDice() {
  diceRowEl.innerHTML = "";
  dice.forEach((value, index) => {
    const die = document.createElement("div");
    die.className = "die" + (held[index] ? " held" : "");
    die.addEventListener("click", () => toggleHold(index));

    for (let i = 0; i < 9; i++) {
      const pip = document.createElement("div");
      pip.className = "pip" + (PIP_LAYOUT[value].includes(i) ? " on" : "");
      die.appendChild(pip);
    }
    diceRowEl.appendChild(die);
  });
}

function toggleHold(index) {
  if (!hasRolled || rollsLeft === 0) return;
  held[index] = !held[index];
  renderDice();
}

function rollDice() {
  if (rollsLeft === 0) return;
  dice = dice.map((value, index) => (held[index] ? value : Math.ceil(Math.random() * 6)));
  rollsLeft--;
  hasRolled = true;
  renderDice();
  updateControls();
  updateAvailableScores();
}

function updateControls() {
  rollBtn.disabled = rollsLeft === 0;
  rollsLeftEl.textContent = `${rollsLeft} roll${rollsLeft === 1 ? "" : "s"} left`;
}

function updateAvailableScores() {
  document.querySelectorAll(".score-btn").forEach((btn) => {
    const key = btn.dataset.key;
    if (scores[key] !== null) {
      btn.textContent = scores[key];
      btn.classList.add("filled");
      btn.disabled = true;
    } else if (hasRolled) {
      btn.textContent = SCORERS[key](dice);
      btn.classList.remove("filled");
      btn.disabled = false;
    } else {
      btn.textContent = "-";
      btn.classList.remove("filled");
      btn.disabled = true;
    }
  });
}

function chooseCategory(key) {
  if (scores[key] !== null || !hasRolled) return;
  scores[key] = SCORERS[key](dice);

  held = Array(NUM_DICE).fill(false);
  rollsLeft = MAX_ROLLS;
  hasRolled = false;

  renderDice();
  updateControls();
  updateAvailableScores();
  updateTotals();

  if (Object.values(scores).every((v) => v !== null)) {
    endGame();
  }
}

function updateTotals() {
  const upperSum = UPPER_CATEGORIES.reduce((sum, cat) => sum + (scores[cat.key] || 0), 0);
  const bonus = upperSum >= 63 ? 50 : 0;
  const lowerSum = LOWER_CATEGORIES.reduce((sum, cat) => sum + (scores[cat.key] || 0), 0);
  const total = upperSum + bonus + lowerSum;

  upperSumEl.textContent = upperSum;
  bonusEl.textContent = bonus;
  grandTotalEl.textContent = total;
}

function endGame() {
  gameOverEl.classList.remove("hidden");
  finalScoreEl.textContent = grandTotalEl.textContent;
  rollBtn.disabled = true;
}

rollBtn.addEventListener("click", rollDice);
newGameBtn.addEventListener("click", init);

init();
