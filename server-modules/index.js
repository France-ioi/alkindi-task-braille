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
    substitutions,
    decipheredLetters
  } = JSON.parse(args.answer.value);

  const correctLetters = [];
  for (let i = 0; i < substitutions.length; i++) {
    const [numValue, alphabetIndex] = substitutions[i];
    if (symbolAlphabet[alphabetIndex] === numValue) {
      correctLetters.push(alphabet[alphabetIndex]);
    }
  }

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
    if (correctLetters.includes(evalClearText[i])) {
      correctChars += 1;
    } else {
      if (decipheredLetters[i] !== undefined &&
        decipheredLetters[i].charAt === evalClearText[i]) {
        correctChars += 1;
      }
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

      score = Math.max(0, 100 - (nHints1 * 10));
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

function textTo3Symbols (alphabet, clearText) {
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


function applyXORMask (clearSymbols) {
  return clearSymbols.map(arr =>
    arr.map((sym, i) => {
      return XOR_MASK[i] ^ sym;
    }));
}

function applyPermutation (data, _elements, permutation) {
  const filteredPerm = [];
  const flipped = [];

  for (let i = 0; i < permutation.length; i++) {
    const el_str = _elements[i].toString();
    const pr_str = permutation[i].toString();
    if (el_str === pr_str || flipped.includes(el_str+':'+pr_str)) {
      continue;
    }
    filteredPerm.push([_elements[i], permutation[i]]);
    flipped.push(pr_str+':'+el_str);
  }

  return data.map(item => {

    item = item.slice();

    for (let i = 0; i < filteredPerm.length; i++) {

      const [_elements, permutation] = filteredPerm[i];

      let from, to;
      if (_elements[1] < permutation[1]) {
        // to get the shift >> | << sign correcly
        from = _elements;
        to = permutation;
      } else {
        to = _elements;
        from = permutation;
      }

      const value1 = item[from[0]];
      const mask1Index = from[1];
      const colMask1 = colMasks[mask1Index];

      const value2 = item[to[0]];
      const mask2Index = to[1];
      const colMask2 = colMasks[mask2Index];

      const shift = Math.abs(mask1Index - mask2Index);

      if (from[0] === to[0]) {
        item[to[0]] = ((value1 & colMask1) >> shift) + ((value2 & colMask2) << shift) + (value2 & ~(colMask1 | colMask2));
      } else {
        item[to[0]] = ((value1 & colMask1) >> shift) + (value2 & ~colMask2);
        item[from[0]] = ((value2 & colMask2) << shift) + (value1 & ~colMask1);
      }
    }
    return item;
  });
}

const versions = [
  [],
  {version: 1, addPerm: false, addXor: false, addAnd: false},
  {version: 2, addPerm: true, addXor: false, addAnd: true},
  {version: 3, addPerm: true, addXor: true, addAnd: true}
];

// module.exports.generateTaskData =
function generateTaskData (task) {
  const version = parseInt(task.params.version) || 1;
  const {addPerm, addXor} = versions[version];

  console.log('seedrandom :', task.random_seed + 6);
  const rng0 = seedrandom(task.random_seed + 6);
  const minLength = 2000;
  const clearText = generate(rng0, minLength, minLength + 50, false);

  const clearSymbols = textTo3Symbols(alphabet, clearText);

  const xorSymbols = addXor ? applyXORMask(clearSymbols) : clearSymbols;

  const permutation = generatePermutation(elements, rng0);

  console.log('permutation :', permutation);

  const cipherSymbols = addPerm ? applyPermutation(xorSymbols, elements, permutation) : xorSymbols;

  //debugging...
  // const permutation = [...elements];
  // permutation.reverse();
  // const cipherSymbols = applyPermutation2([[
  //   2925, 2457, 3294
  // ]], permutation);

  // hints per message
  const hintsRequested = getHintsRequested(task.hints_requested);

  const hints = grantHints(hintsRequested, clearText);

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
    h1.cellRank === h2.cellRank &&
    h1.type == h2.type
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
