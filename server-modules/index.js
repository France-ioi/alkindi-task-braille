var {generate} = require("../bebras-modules/pemFioi/sentences_2");
var {range} = require("range");
var seedrandom = require("seedrandom");
var {shuffle} = require("shuffle");
// var Benchmark = require('benchmark');

/**
 * Default constants
 */

const symbolAlphabet = [
  2166,
  773,
  3161,
  3058,
  86,
  1785,
  300,
  1603,
  3467,
  641,
  1544,
  3717,
  1182,
  1317,
  3481,
  1551,
  2622,
  415,
  3642,
  1366,
  3203,
  2181,
  206,
  3390,
  1608,
  718
];

const XOR_MASK = [
  3117,
  1621,
  3613
];

// const gridColumns = [ // symbol's num values in 4x3 grid,
//   [11, 8, 5, 2],      // indexes by columns,
//   [10, 7, 4, 1],      // in bit positions ex: index=11, (11 - index) = 0 (bit position)
//   [9, 6, 3, 0]
// ];


const colMasks = [
  1 << 2 | 1 << 5 | 1 << 8 | 1 << 11, // 2340
  1 << 1 | 1 << 4 | 1 << 7 | 1 << 10, // 1170
  1 << 0 | 1 << 3 | 1 << 6 | 1 << 9  // 585
];


const _elements = [
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
      return XOR_MASK[i] ^ sym;
    }));
}

// function applyPermutationold (data, permutation) {
//   return data.map(item => {
//     const flipped = [];
//     for (let i = 0; i < elements.length; i++) {
//       const el_str = elements[i].toString();
//       const pr_str = permutation[i].toString();
//       if (el_str === pr_str || flipped.includes(pr_str)) {
//         continue;
//       }
//       flipped.push(el_str);

//       const arr1 = item[elements[i][0]];
//       const arr2 = item[permutation[i][0]];
//       const colIndex1 = gridColumns[elements[i][1]];
//       const colIndex2 = gridColumns[permutation[i][1]];
//       for (let k = 0; k < colIndex1.length; k++) {
//         [arr1[colIndex1[k]], arr2[colIndex2[k]]] = [arr2[colIndex2[k]], arr1[colIndex1[k]]];
//       }
//     }
//     return item;
//   });
// }

// function applyPermutation (data, permutation) {
//   function bitSetOrNot (maskObj, bitVal, clearBit) {
//     const type = (clearBit === 0) ? '-' : '+';
//     maskObj[type].push(bitVal);
//   }

//   return data.map(item => {
//     const flipped = [];
//     const maskObjArr = item.map(_a => ({'+': [], '-': []}));
//     const columnsBitValues = gridColumns.map(ar => ar.map(v => 1 << v));

//     for (let i = 0; i < elements.length; i++) {
//       const el_str = elements[i].toString();
//       const pr_str = permutation[i].toString();
//       if (el_str === pr_str || flipped.includes(pr_str)) {
//         continue;
//       }
//       flipped.push(el_str);

//       const ele_index = elements[i][0];
//       const value1 = item[ele_index];
//       const maskObj1 = maskObjArr[ele_index];

//       const perm_index = permutation[i][0];
//       const value2 = item[perm_index];
//       const maskObj2 = maskObjArr[perm_index];

//       const colIndex1 = columnsBitValues[elements[i][1]];
//       const colIndex2 = columnsBitValues[permutation[i][1]];

//       for (let k = 0; k < colIndex1.length; k++) {
//         const v1ColIndexBit = colIndex1[k];
//         const v2ColIndexBit = colIndex2[k];
//         const bitVal2 = value2 & v2ColIndexBit;
//         const bitVal1 = value1 & v1ColIndexBit;
//         if (!(bitVal1 & bitVal2)) { // performance optmization, [1,1] = [1,1], no need to do that
//           bitSetOrNot(maskObj1, v1ColIndexBit, bitVal2);
//           bitSetOrNot(maskObj2, v2ColIndexBit, bitVal1);
//         }
//       }
//     }

//     return item.map((value, i) => {
//       const maskObj = maskObjArr[i];
//       const maskAdd = maskObj['+'].reduce((m, bit) => m | bit, 0);
//       const maskRemove = maskObj['-'].reduce((m, bit) => m | bit, 0);
//       return (value | maskAdd) & ~maskRemove;
//     });
//   });
// }


function applyPermutation (data, elements, permutation) {

  return data.map(item => {
    const flipped = [];

    for (let i = 0; i < elements.length; i++) {
      const el_str = elements[i].toString();
      const pr_str = permutation[i].toString();
      if (el_str === pr_str || flipped.includes(pr_str)) {
        continue;
      }
      flipped.push(el_str);

      let from, to;
      if (elements[i][1] < permutation[i][1]) { // to get the shift >> | << sign correcly
        from = elements[i], to = permutation[i];
      } else {
        to = elements[i], from = permutation[i];
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



// module.exports.generateTaskData =
function generateTaskData (task) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  // const version = parseInt(task.params.version) || 1;

  const rng0 = seedrandom(task.random_seed + 6);
  const minLength = 2000;
  const clearText = generate(rng0, minLength, minLength + 50, false);

  const clearSymbols = textTo3Symbols(alphabet, clearText);

  const xorSymbols = applyXORMask(clearSymbols);

  const permutation = generatePermutation(_elements, rng0);
  const cipherSymbols = applyPermutation(xorSymbols, _elements, permutation);

  //debugging...
  // const permutation = [...elements];
  // permutation.reverse();
  // const cipherSymbols = applyPermutation2([[
  //   2925, 2457, 3294
  // ]], permutation);

  //  var suite = new Benchmark.Suite;
  //  // add tests
  //   suite.add('applyPermutation2: num:new', function () {
  //     applyPermutation2([[
  //       2925, 2457, 3294
  //     ]], permutation);

  //   })
  //     .add('applyPermutation1: num', function () {
  //       applyPermutation([[
  //         2925, 2457, 3294
  //       ]], permutation);
  //     })
  //     // add listeners
  //     .on('cycle', function (event) {
  //       console.log(String(event.target));
  //     })
  //     .on('complete', function () {
  //       console.log('Fastest is ' + this.filter('fastest').map('name'));
  //     })
  //     // run async
  //     .run({'async': true});
  //
  //
  // const equals = [
  //   [1971, 756, 2925]
  // ].map((arr) => arr.reduce((r, n, i) => r && n === cipherSymbols[0][i], true));
  // console.log('cipherSymbols equal:', equals);

  // console.log('cipherSymbols :', cipherSymbols);

  // // hints per message
  // const hintsRequested = getHintsRequested(task.hints_requested);


  const publicData = {
    cipherSymbols
  };

  const privateData = {
    permutation
  };

  return {publicData, privateData};
}

function generatePermutation (deck, rngKeys) {
  let key = shuffle({random: rngKeys, deck}).cards;
  //key = "DLMEFVAQRSTNUCWXGOPYZBHIJK"; //for dev mode testing
  return key;
}

module.exports.generateTaskData = function () {
  // const mix = [2, 9, 3, 4, 5, 6, 7, 8, 1];
  // const perm = mix.map(v => _elements[v - 1]);

  // const cipherSymbols = applyPermutation([[
  //   2925, 2457, 3294
  // ]], _elements, perm);



  const editedPairs = {
    '0': {
      rank: 1
    },
    '1': {
      rank: 8
    },
    '8': {
      rank: 0
    }
  };

  const [ele, perm] = Object.keys(editedPairs)
  .map((k) =>
    [_elements[parseInt(k)], _elements[editedPairs[k].rank]]
  ).reduce((ar, dup) => {
    ar[0].push(dup[0]);
    ar[1].push(dup[1]);
    return ar;
  },[[],[]]);


  const cipherSymbols = applyPermutation([[
    2925, 2457, 3294
  ]], ele, perm);

  console.log('cipherSymbols :', cipherSymbols);


}