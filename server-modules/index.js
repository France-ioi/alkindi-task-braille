var {generate} = require("../bebras-modules/pemFioi/sentences_2");
var {range} = require("range");
var seedrandom = require("seedrandom");
var {shuffle} = require("shuffle");

/**
 * Default constants
 */
const symbolAlphabet = [
  [1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 0], // A
  [0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0], // D
  [0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 0],
  [0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1], // F
  [0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0],
  [0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 1],
  [1, 1, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1], // I
  [0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1],
  [0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  [1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1], // L
  [0, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 0],
  [0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1],
  [1, 1, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1], // O
  [0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1],
  [1, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 0],
  [0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1], // R
  [1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0],
  [1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1], // V
  [0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0],
  [1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0],
  [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0]
];

const XOR_MASK = [ // positions of 1's
  [0, 1, 6, 8, 9, 11],
  [1, 2, 5, 7, 9, 11],
  [0, 1, 2, 7, 8, 9, 11]
];

const gridColumns = [
  [0, 3, 6, 9],
  [1, 4, 7, 10],
  [2, 5, 8, 11]
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
  const version = parseInt(args.task.params.version);
  const {
    publicData: {alphabet, messages},
    privateData
  } = generateTaskData(args.task);

  let {substitutions: submittedKeys} = JSON.parse(args.answer.value);
  submittedKeys = submittedKeys.map(cells =>
    cells.map(i => (i === -1 ? " " : alphabet[i])).join("")
  );

  const hintsRequested = getHintsRequested(args.answer.hints_requested);

  function gradeByVersion (version) {
    const {numMessages = 1} = versions[version];

    switch (numMessages) {
      case 1:
        {
          const {cipherText} = messages[0];
          const {clearText} = privateData[0];
          return gradeSingleMessage(alphabet, cipherText, clearText, hintsRequested[0] || [], submittedKeys[0]);
        }
      case 50:
        {
          return grade50Messages(alphabet, messages, privateData, hintsRequested, submittedKeys);
        }
    }
  }

  callback(null, gradeByVersion(version));
};

/**
 * task methods
 */

function gradeSingleMessage (alphabet, cipherText, clearText, hintsRequested, submittedKey) {
  const evalLength = 200; /* Score on first 200 characters only */
  const evalText = cipherText.slice(0, evalLength);
  const decodedText = monoAlphabeticDecode(
    alphabet,
    submittedKey,
    evalText
  );

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
    if (evalClearText[i] === decodedText[i]) {
      correctChars += 1;
    }
  }

  let score = 0,
    message =
      "Il y a au moins une différence entre les 200 premiers caractères de votre texte déchiffré et ceux du texte d'origine.";

  const nHints3 = (hintsRequested.filter(h => h.type === 'type_3')).length || 0;

  if (nHints3 !== 0) {
    message = "Vous avez demandé tous les indices !";
  } else {
    if (correctChars == evalLength) {
      const nHints1 = (hintsRequested.filter(h => h.type === 'type_1')).length || 0;
      const nHints2 = (hintsRequested.filter(h => h.type === 'type_2')).length || 0;
      const nHints = hintsRequested.length;

      score = Math.max(0, 100 - ((nHints1 * 5) + (nHints2 * 10)));
      message = `Bravo, vous avez bien déchiffré le texte. Vous avez utilisé ${nHints} indice${
        nHints > 1 ? "s" : ""
        }.`;
    }
  }

  return {score, message};
}

function grade50Messages (alphabet, messages, privateData, hintsRequested, submittedKeys) {
  const evalLength = 200; /* Score on first 200 characters only */
  const nHints = range(0, 50)
    .map(index =>
      Array.isArray(hintsRequested[index])
        ? ((((hintsRequested[index]).filter(h => h.type === 'type_3')).length === 0) ? hintsRequested[index].length : 26)
        : 0)
    .reduce(function (total, current) {return current + total;}, 0);

  function grade (alphabet, clearText, cipherText, submittedKey) {
    if (submittedKey.indexOf(' ') !== -1) {
      return false; // decode key is not completed
    }

    const evalText = cipherText.slice(0, evalLength);

    let evalClearText = '';
    let j = 0;

    for (let i = 0; i < evalLength; i++) {
      if (!alphabet.includes(clearText[j])) {
        j++;
      }
      evalClearText += clearText[j];
      j++;
    }

    const decodedText = monoAlphabeticDecode(
      alphabet,
      submittedKey,
      evalText
    );

    let correctChars = 0;

    for (let i = 0; i < evalLength; i += 1) {
      if (evalClearText[i] === decodedText[i]) {
        correctChars += 1;
      }
    }

    return (correctChars == evalLength);
  }

  const decryptedMessages = [];

  for (let index = 0; index < submittedKeys.length; index++) {
    let decryptedOk = false;
    const nHints3 = hintsRequested[index] ? ((hintsRequested[index]).filter(h => h.type === 'type_3')).length : 0;
    if (nHints3 !== 0) {
      decryptedOk = true;
    } else {
      const submittedKey = submittedKeys[index];
      const {cipherText} = messages[index];
      const {clearText} = privateData[index];
      decryptedOk = grade(alphabet, clearText, cipherText, submittedKey);
    }
    if (decryptedOk) {
      decryptedMessages.push(index + 1);
      if (decryptedMessages.length === 4) {
        break;
      }
    }
  }

  let score = 0, message = `. Vous avez utilisé ${nHints} indice${
    nHints > 1 ? "s" : ""
    }.`;

  function listOfNumToStr (numArr) {
    if (numArr.length === 1) {
      return " " + numArr[0];
    }
    const last = numArr[numArr.length - 1].toString();
    return numArr.join(', ').replace(', ' + last, ' and ' + last);
  }

  if (decryptedMessages.length > 0) {
    score = Math.max(0, (25 * decryptedMessages.length) - nHints);
    message = `Vous avez correctement déchiffré le(s) message(s) ${listOfNumToStr(decryptedMessages)}` + message;
  } else {
    message = 'Vous n\'avez déchiffré aucun message.' + message;
  }

  if (score < 0) {
    score = 0;
  }

  return {score, message};
}

function generateMessageData (alphabet, rng0, clearText, hintsRequested) {
  const rngKeys = seedrandom(rng0());
  const alphabetSize = alphabet.length;
  // const clearText = alphabet.repeat(10);
  const encodingKey = generateKey(alphabet, rngKeys); // encoding keys in decoding order
  const decodingKey = inversePermutation(alphabet, encodingKey);
  const cipherText = monoAlphabeticEncode(alphabet, encodingKey, clearText);
  const frequencies = range(0, alphabetSize).map(start =>
    frequencyAnalysis(cipherText, alphabet, start, alphabetSize)
  );
  const hints = grantHints(alphabet, encodingKey, decodingKey, hintsRequested);

  return {cipherText, hints, frequencies, clearText, encodingKey, decodingKey};
}

function getHintsRequested (hints_requested) {
  return (hints_requested
    ? JSON.parse(hints_requested)
    : []
  )
    .filter(hr => hr !== null)
    .reduce(function (obj, hint) {
      if (typeof hint === "string") {
        hint = JSON.parse(hint);
      }
      const {messageIndex} = hint;
      if (obj[messageIndex]) {
        obj[messageIndex].push(hint);
      } else {
        obj[messageIndex] = [hint];
      }
      return obj;
    }, {});
}

function textTo3Symbols (alphabet, clearText) {
  const data = [];
  for (let i = 0; i + 2 < clearText.length;) {
    const item = [
      symbolAlphabet[alphabet.indexOf(clearText[i++])],
      symbolAlphabet[alphabet.indexOf(clearText[i++])],
      symbolAlphabet[alphabet.indexOf(clearText[i++])]
    ];
    data.push(item);
  }
  return data;
}

function applyXORMask (clearSymbols) {
  return clearSymbols.map(arr =>
    arr.map((sym, i) => {
      const data = [...sym];
      XOR_MASK[i].forEach(ii => data[ii] ^= 1);
      return data;
    }));
}


// return data.map(item => {
//   //  const item = [new Array(12).fill(0), new Array(12).fill(0), new Array(12).fill(0)];
//   for (let i = 0; i < elements.length; i++) {
//     const arr1 = [...item[elements[i][0]]];
//     const arr2 = [...item[permutation[i][0]]];
//     const colIndex1 = gridColumns[elements[i][1]];
//     const colIndex2 = gridColumns[permutation[i][1]];
//     for (let k = 0; k < colIndex1.length; k++) {
//       [arr1[colIndex1[k]], arr2[colIndex2[k]]] = [arr2[colIndex2[k]], arr1[colIndex1[k]]];
//     }
//     item[elements[i][0]] = arr1;
//     item[permutation[i][0]] = arr2;
//   }
//   return item;
// });

function applyPermutation (data, permutation) {
  return data.map(item => {
   const flipped = [];
   for (let i = 0; i < elements.length; i++) {
     const el_str = elements[i].toString();
     const pr_str = permutation[i].toString();
     if (el_str === pr_str || flipped.includes(pr_str)) {
       continue;
     }
     flipped.push(el_str);

     const arr1 = item[elements[i][0]];
     const arr2 = item[permutation[i][0]];
     const colIndex1 = gridColumns[elements[i][1]];
     const colIndex2 = gridColumns[permutation[i][1]];
     for (let k = 0; k < colIndex1.length; k++) {
       [arr1[colIndex1[k]], arr2[colIndex2[k]]] = [arr2[colIndex2[k]], arr1[colIndex1[k]]];
     }
   }
   return item;
 });
 }


module.exports.generateTaskData = function generateTaskData (task) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  // const version = parseInt(task.params.version) || 1;

  const rng0 = seedrandom(task.random_seed + 6);
  const minLength = 2000;
  const clearText = generate(rng0, minLength, minLength + 50, false);

  const clearSymbols = textTo3Symbols(alphabet, clearText);
  const xorSymbols = applyXORMask(clearSymbols);

  // debugging...
  // const permutation = [...elements];
  // permutation.reverse();
  // const cipherSymbols = applyPermutation([[
  //   [1, 0, 1,
  //    1, 0, 1,
  //    1, 0, 1,
  //    1, 0, 1
  //   ],
  //   [1, 0, 0,
  //    1, 1, 0,
  //    0, 1, 1,
  //    0, 0, 1
  //   ],
  //   [1, 1, 0,
  //    0, 1, 1,
  //    0, 1, 1,
  //    1, 1, 0
  //   ]
  // ]], permutation);

  const permutation = generatePermutation(elements, rng0);
  const cipherSymbols = applyPermutation(xorSymbols, permutation);

  console.log('cipherSymbols :', cipherSymbols);



  // // hints per message
  // const hintsRequested = getHintsRequested(task.hints_requested);


  // const publicData = {
  //   alphabet,
  //   config,
  //   referenceFrequencies,
  //   messages,
  //   passwords
  // };

  // return {publicData, privateData};
}

function generatePermutation (deck, rngKeys) {
  let key = shuffle({random: rngKeys, deck}).cards;
  //key = "DLMEFVAQRSTNUCWXGOPYZBHIJK"; //for dev mode testing
  return key;
}

function monoAlphabeticEncode (alphabet, encodingKey, clearText) {
  let i,
    j,
    cipherText = "";
  for (i = 0; i < clearText.length; i++) {
    for (j = 0; j < alphabet.length; j++) {
      if (clearText[i] == alphabet[j]) {
        cipherText += encodingKey[j];
        break;
      }
    }
  }
  return cipherText;
}

function monoAlphabeticDecode (alphabet, encodingKey, cipherText) {
  let i,
    j,
    clearText = "";
  for (i = 0; i < cipherText.length; i++) {
    for (j = 0; j < alphabet.length; j++) {
      if (cipherText[i] == alphabet[j]) {
        clearText += encodingKey[j];
        break;
      }
    }
  }
  return clearText;
}

function inversePermutation (alphabet, key) {
  const result = new Array(alphabet.length).fill(" ");
  for (let i = 0; i < alphabet.length; i += 1) {
    let pos = alphabet.indexOf(key[i]);
    if (pos !== -1) {
      result[pos] = alphabet[i];
    }
  }
  return result.join("");
}

function frequencyAnalysis (text, alphabet, start, skip) {
  const freqs = new Array(alphabet.length).fill(0);
  let total = 0;
  for (let i = start; i < text.length; i += skip) {
    let c = text[i];
    let j = alphabet.indexOf(c);
    if (j !== -1) {
      freqs[j] += 1;
      total += 1;
    }
  }
  for (let i = 0; i < alphabet.length; i += 1) {
    freqs[i] = round(freqs[i] / total, 4);
  }
  return freqs;
}

function round (value, decimals) {
  return Number(Math.round(value + "e" + decimals) + "e-" + decimals);
}

function hintRequestEqual (h1, h2) {
  return (
    h1.messageIndex === h2.messageIndex &&
    h1.cellRank === h2.cellRank &&
    h1.type == h2.type
  );
}

function grantHints (alphabet, encodingKey, decodingKey, hintRequests) {
  return hintRequests.map(function (hintRequest) {
    let symbol;
    let {messageIndex, cellRank, type} = hintRequest;
    if (type === "type_1") {
      symbol = decodingKey[cellRank];
    } else if (type === "type_2") {
      symbol = alphabet[cellRank];
      cellRank = alphabet.indexOf(encodingKey[cellRank]);
    } else {
      return {messageIndex, cellRank, symbol: '', key: decodingKey, type};
    }
    return {messageIndex, cellRank, symbol, type};
  });
}
