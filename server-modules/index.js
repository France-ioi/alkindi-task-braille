var {generate} = require("../bebras-modules/pemFioi/sentences_2");
var seedrandom = require("seedrandom");
var {shuffle} = require("shuffle");

/**
 * Default constants
 */

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const symbolAlphabet = [
  2166, // A
  773, // B
  3161, // C
  3058, // D
  86, // E
  1785, // F
  300, // G
  1603, // H
  3467, // I
  641, // J
  1544, // K
  3717, // L
  1182, // M
  1317, // N
  3481, // O
  1551, // P
  2622, // Q
  415, // R
  3642, // S
  1366, // T
  3203, // U
  2181, // V
  206, // W
  3390, // X
  1608, // Y
  718 // Z
];

const XOR_MASK = [
  3117,
  1621,
  3613
];


const colMasks = [
  1 << 2 | 1 << 5 | 1 << 8 | 1 << 11, // 2340
  1 << 1 | 1 << 4 | 1 << 7 | 1 << 10, // 1170
  1 << 0 | 1 << 3 | 1 << 6 | 1 << 9  // 585
];


const elements = [
  [0, 0],
  [0, 1],
  [0, 2],
  [1, 0],
  [1, 1],
  [1, 2],
  [2, 0],
  [2, 1],
  [2, 2],
];

/**
 * task module export...
 */

/* prefer JSON config file at project root?  depend on NODE_ENV? */
module.exports.config = {
  cache_task_data: false
};

module.exports.taskData = function (args, callback) {
  const {publicData} = generateTaskData(args.task);
  callback(null, publicData);
};

module.exports.requestHint = function (args, callback) {
  const request = args.request;
  const hints_requested = args.task.hints_requested
    ? JSON.parse(args.task.hints_requested)
    : [];
  for (var hintRequest of hints_requested) {
    if (hintRequest === null) {
      /* XXX Happens, should not. */
      /* eslint-disable-next-line no-console */
      console.log("XXX", args.task.hints_requested);
      continue;
    }
    if (typeof hintRequest === "string") {
      hintRequest = JSON.parse(hintRequest);
    }
    if (hintRequestEqual(hintRequest, request)) {
      return callback(new Error("hint already requested"));
    }
  }
  callback(null, args.request);
};

module.exports.gradeAnswer = function (args, task_data, callback) {
  const {
    privateData: {clearText}
  } = generateTaskData(args.task);

  const {
    answerText
  } = JSON.parse(args.answer.value);


  const evalLength = 200; /* Score on first 200 characters only */

  let evalClearText = '';
  let j = 0;
  for (let i = 0; i < evalLength; i++) {
    if (!alphabet.includes(clearText[j])) {
      j++;
    }
    evalClearText += clearText[j];
    j++;
  }

  let correctChars = 0;
  for (let i = 0; i < evalLength; i += 1) {
    if (answerText[i] === evalClearText[i]) {
      correctChars += 1;
    }
  }

  const hintsRequested = getHintsRequested(args.answer.hints_requested);

  let score = 0,
    message =
      "Il y a au moins une différence entre les 200 premiers caractères de votre texte déchiffré et ceux du texte d'origine.";

  const nHints2 = (hintsRequested.filter(h => h.type === 'type_2')).length || 0;

  if (nHints2 !== 0) {
    message = "Vous avez demandé tous les indices !";
  } else {
    if (correctChars == evalLength) {
      const nHints1 = (hintsRequested.filter(h => h.type === 'type_1')).length || 0;
      const nHints = hintsRequested.length;

      score = Math.max(0, 100 - (nHints1 * 5));
      message = `Bravo, vous avez bien déchiffré le texte. Vous avez utilisé ${nHints} indice${
        nHints > 1 ? "s" : ""
        }.`;
    }
  }

  callback(null, {score, message});
};

/**
 * task methods
 */

function textTo3Symbols (alphabet, symbolAlphabet, clearText) {
  const data = [];
  for (let i = 0; i + 3 < clearText.length; i = i + 3) {
    const item = [
      symbolAlphabet[alphabet.indexOf(clearText[i])],
      symbolAlphabet[alphabet.indexOf(clearText[i + 1])],
      symbolAlphabet[alphabet.indexOf(clearText[i + 2])]
    ];
    data.push(item);
  }
  return data;
}


function applyXORMask (masks, clearSymbols) {
  return clearSymbols.map(arr =>
    arr.map((sym, i) => {
      return masks[i] ^ sym;
    }));
}


function inversePermutation (alphabet, key) {
  const result = new Array(alphabet.length);
  for (let i = 0; i < alphabet.length; i += 1) {
    let pos = alphabet.indexOf(key[i]);
    if (pos !== -1) {
      result[pos] = alphabet[i];
    }
  }
  return result;
}

function applyPermutation (data, permutation) {
  const same = 'SAME_INDEX';
  const diff = 'DIFF_INDEX';
  const actions = [[], [], []];

  for (let col = 0; col < 3; col++) {
    for (let i = 0; i < 3; i++) {
      const index = (col * 3 + i);
      const perm = permutation[index];
      if (index === perm) {
        actions[col].push([same, col, colMasks[i], 0]);
        continue;
      }
      const [fromCol, fromIndex] = elements[perm];
      actions[col].push([diff, fromCol, colMasks[fromIndex], (i - fromIndex)]);
    }

    if (
      actions[col][0][0] === same &&
      actions[col][1][0] === same &&
      actions[col][2][0] === same
    ) {
      actions[col] = [];
    }
  }

  return data.map(item => {

    const newItem = [...item];

    for (let i = 0; i < 3; i++) {
      const action = actions[i];
      if (action.length === 0) {
        continue;
      }
      let value = 0;

      for (let k = 0; k < action.length; k++) {
        const [, col, mask, shift] = action[k];
        if (shift === 0) {
          value += (item[col] & mask);
        } else if (shift > 0) { // >>
          value += (item[col] & mask) >> Math.abs(shift);
        } else { // <<
          value += (item[col] & mask) << Math.abs(shift);
        }
      }

      newItem[i] = value;
    }
    return newItem;
  });
}

const versions = {
  "0.5": {version: 0.5, freeHints: true, addPerm: false, addXor: false, addAnd: false},
  "1": {version: 1, freeHints: false, addPerm: false, addXor: false, addAnd: false},
  "1.5": {version: 1.5, freeHints: true, addPerm: true, addXor: false, addAnd: true},
  "2": {version: 2, freeHints: false, addPerm: true, addXor: false, addAnd: true},
  "3": {version: 3, freeHints: false, addPerm: true, addXor: true, addAnd: true},
  "10.5": {version: 10.5, freeHints: true, addPerm: false, addXor: false, addAnd: false},
  "11": {version: 11, freeHints: false, addPerm: false, addXor: false, addAnd: false},
  "11.5": {version: 11.5, freeHints: true, addPerm: true, addXor: false, addAnd: true},
  "12": {version: 12, freeHints: false, addPerm: true, addXor: false, addAnd: true},
  "13": {version: 13, freeHints: false, addPerm: true, addXor: true, addAnd: true}
};

const nbFreeHints = 50;

function getFreeHints (clearText) {
  const hints = [];
  for (let i = 0; i < nbFreeHints; i++) {
    hints.push({cellRank: i, symbol: clearText[i], type: 'type_3'});
  }
  return hints;
}

function getRandomInt (rng, min, max) {
  min = Math.ceil(min);
  max = Math.floor(max - 1);
  return Math.floor(rng() * (max - min + 1)) + min;
}

// module.exports.generateTaskData =
function generateTaskData (task) {
  const version = task.params.version || 1;
  const {freeHints, addPerm, addXor} = versions[version];

  console.log('seedrandom :', task.random_seed + 6);
  const rng0 = seedrandom(task.random_seed + 6);
  const minLength = 2000;
  const clearText = generate(rng0, minLength, minLength + 50, false);

  let substitution = symbolAlphabet;
  let masks = XOR_MASK;

  if (version > 10) {
    const rng = seedrandom(task.random_seed + 6);
    masks = [];
    for (let i=0; i<3; i++) {
      masks.push(getRandomInt(rng, 0, 4096));
    }
    substitution = [];
    for (let i=0; i<alphabet.length; i++) {
      substitution.push(getRandomInt(rng, 1, 4096));
    }
  }

  const clearSymbols = textTo3Symbols(alphabet, substitution, clearText);

  const xorSymbols = addXor ? applyXORMask(masks, clearSymbols) : clearSymbols;

  const perm_input = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  const permutation = generatePermutation(perm_input, rng0);

  const inversePermu = inversePermutation(perm_input, permutation);
  console.log('inverse permutation :', inversePermu.map(n => n + 1));

  const cipherSymbols = addPerm ? applyPermutation(xorSymbols, permutation) : xorSymbols;


  //debugging...
  // const permutation = [...elements];
  // permutation.reverse();
  // const cipherSymbols = applyPermutation2([[
  //   2925, 2457, 3294
  // ]], permutation);

  // hints per message
  const hintsRequested = getHintsRequested(task.hints_requested);

  let hints = grantHints(hintsRequested, clearText);

  if (freeHints) {
    hints = hints.concat(getFreeHints(clearText));
  }

  const publicData = {
    alphabet,
    cipherSymbols,
    hints,
    version: versions[version]
  };

  const privateData = {
    permutation,
    clearText
  };

  return {publicData, privateData};
}

function generatePermutation (deck, rngKeys) {
  let key = shuffle({random: rngKeys, deck}).cards;
  //key = "DLMEFVAQRSTNUCWXGOPYZBHIJK"; //for dev mode testing
  return key;
}

// module.exports.generateTaskData = function () {
//   // const mix = [2, 9, 3, 4, 5, 6, 7, 8, 1];
//   // const perm = mix.map(v => _elements[v - 1]);

//   // const cipherSymbols = applyPermutation([[
//   //   2925, 2457, 3294
//   // ]], _elements, perm);

function hintRequestEqual (h1, h2) {
  return (
    h1.cellRank === h2.cellRank
  );
}


function getHintsRequested (hints_requested) {
  return (hints_requested
    ? JSON.parse(hints_requested)
    : []
  )
    .filter(hr => hr !== null)
    .map(hint => (typeof hint === "string") ? JSON.parse(hint) : hint);
}


function grantHints (hintRequests, clearText) {
  return hintRequests.map(function (hintRequest) {
    let symbol;
    let {cellRank, type} = hintRequest;

    if (type === "type_1") {
      symbol = clearText[cellRank];
    } else if (type === "type_2") {
      return {cellRank, symbol: '', clearText: clearText, type};
    }
    return {cellRank, symbol, type};
  });
}
