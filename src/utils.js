import React from 'react';
import update from 'immutability-helper';
import {range} from 'range';
import {RADIUS, BETWEEN_DOTS, BETWEEN_SYM_HZ, BETWEEN_SYM_VT} from './symbols_bundle';


const size = 4096;

const colMasks = [
  1 << 2 | 1 << 5 | 1 << 8 | 1 << 11, // 2340
  1 << 1 | 1 << 4 | 1 << 7 | 1 << 10, // 1170
  1 << 0 | 1 << 3 | 1 << 6 | 1 << 9  // 585
];


export function applyPermutation (data, elements, permutation) {
  return data.map(item => {
    item = [...item];
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

export function applyXOR (data, xorMask) {
  const posNum = [];
  for (let i = 0; i < xorMask.length; i++) {
    if (xorMask[i] !== null) {
      posNum.push(i);
    }
  }

  const out = [];

  for (let i = 0; i < data.length; i++) {
    const item = [...data[i]];
    for (let i = 0; i < posNum.length; i++) {
      const pos = posNum[i];
      item[pos] ^= xorMask[pos];
    }
    out.push(item);
  }

  return out;
}


export function applyAND (newData, andMask, oldData) {
  const [one, two, three] = andMask;
  if (one === 0 && two === 0 && three === 0) {
    const out = [];
    for (let i = 0; i < newData.length; i++) {
      out.push([0, 0, 0]);
    }
    return out;
  }

  const out = [];
  for (let i = 0; i < newData.length; i++) {
    const item = [];
    for (let pos = 0; pos < andMask.length; pos++) {
      if (andMask[pos]) {
        item.push(newData[i][pos] & andMask[pos]);
      } else {
        item.push(oldData ? oldData[i][pos] : 0);
      }
    }
    out.push(item);
  }
  return out;
}


// create the visual positioning of 9X4 symbols cell.
export function createSymbolStructure () {
  const cells = [];
  let cx = BETWEEN_SYM_HZ / 2;
  const y = BETWEEN_SYM_VT / 2;
  let cy = y;
  for (let s = 0; s < 3; s++) {
    for (let xi = 0; xi < 3; xi++) {
      cy = y;
      for (let yi = 0; yi < 4; yi++) {
        const key = `d${s}_${(yi * 3) + xi}`;
        cells.push(
          <circle
            key={key}
            className={`${key}`}
            cx={cx}
            cy={cy}
            r={RADIUS}
            fill='inherit'
          />);
        cy += BETWEEN_DOTS;
      }
      cx += BETWEEN_DOTS;
    }
    cx -= BETWEEN_DOTS;
    cx += BETWEEN_SYM_HZ;
  }
  return {cells, width: cx - BETWEEN_SYM_HZ + BETWEEN_SYM_HZ / 2, height: cy - BETWEEN_DOTS + (BETWEEN_SYM_VT / 2)};
}

export function createSingleSymbol () {
  const cells = [];
  let cx = RADIUS + 1;
  const y = RADIUS + 1;
  let cy = y;
  for (let xi = 0; xi < 3; xi++) {
    cy = y;
    for (let yi = 0; yi < 4; yi++) {
      const key = `d${0}_${(yi * 3) + xi}`;
      cells.push(
        <circle
          key={key}
          className={`${key}`}
          cx={cx}
          cy={cy}
          r={RADIUS}
          fill='inherit'
        />);
      cy += BETWEEN_DOTS;
    }
    cx += BETWEEN_DOTS;
  }
  cy -= BETWEEN_DOTS;
  cx -= BETWEEN_DOTS;

  return {cells, width: cx + RADIUS + 1, height: cy + RADIUS + 1};
}


function bisect (a, x) {
  let lo = 0, hi = a.length, mid;
  while (lo < hi) {
    mid = (lo + hi) / 2 | 0;
    if (x < a[mid]) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  return lo;
}


export function changeSelection (values, value, selected) {
  const index = bisect(values, value);
  if (selected) {
    return values[index - 1] === value ? {} : {$splice: [[index, 0, value]]};
  } else {
    return values[index - 1] !== value ? {} : {$splice: [[index - 1, 1]]};
  }
}

export function sortedArrayHasElement (a, x) {
  const i = bisect(a, x) - 1;
  return a[i] === x;
}

export function updateGridGeometry (grid) {
  const {width, cellWidth, cellHeight, scrollTop, nbCells} = grid;
  const scrollBarWidth = 20;
  const pageColumns = Math.max(5, Math.floor((width - scrollBarWidth) / cellWidth));
  const newWidth = pageColumns * (cellWidth + 1) + scrollBarWidth;
  const pageRows = 5;
  const height = (pageRows * cellHeight);
  const bottom = Math.ceil(nbCells / pageColumns) * cellHeight - 1;
  const maxTop = Math.max(0, bottom + 1 - pageRows * cellHeight);
  return {...grid, width: newWidth, height, pageColumns, pageRows, scrollTop: Math.min(maxTop - BETWEEN_SYM_VT / 2 - 5, Math.max(BETWEEN_SYM_VT / 2 - 5, scrollTop)), bottom, maxTop};
}

export function updateGridVisibleRows (grid, options) {
  options = options || {};
  const {nbCells, cellHeight, pageColumns, pageRows, cells, scrollTop} = grid;
  if (typeof scrollTop !== 'number') {
    return grid;
  }
  const firstRow = Math.floor(scrollTop / cellHeight);
  const lastRow = Math.min(firstRow + pageRows, Math.ceil(nbCells / pageColumns) - 1);
  const rows = [];
  const getCell = options.getCell || (cells ? (index => ({cell: cells[index]})) : (_index => null));
  for (let rowIndex = firstRow; rowIndex <= lastRow; rowIndex += 1) {
    const rowStartPos = rowIndex * pageColumns;
    const rowCells = [];
    for (let colIndex = 0; colIndex < pageColumns; colIndex += 1) {
      const data = getCell(rowStartPos + colIndex);
      rowCells.push({index: colIndex, ...data});
    }
    rows.push({index: rowIndex, columns: rowCells});
  }
  return {...grid, visible: {rows}};
}

export function updateGridGeometry2 (grid) {
  const {width, height, cellWidth, cellHeight, scrollTop, nbCells} = grid;
  const scrollBarWidth = 20;
  const pageColumns = Math.max(30, Math.floor((width - scrollBarWidth) / cellWidth));
  const pageRows = Math.max(5, Math.ceil(height / cellHeight));
  const bottom = Math.ceil(nbCells / pageColumns) * cellHeight - 1;
  const maxTop = Math.max(0, bottom + 1 - pageRows * cellHeight);
  return {...grid, pageColumns, pageRows, scrollTop: Math.min(maxTop, scrollTop), bottom, maxTop};
}

export function updateGridVisibleRows2 (grid, options) {
  options = options || {};
  const {nbCells, cellHeight, pageColumns, pageRows, cells, scrollTop} = grid;
  if (typeof scrollTop !== 'number') {
    return grid;
  }
  const firstRow = Math.floor(scrollTop / cellHeight);
  const lastRow = Math.min(firstRow + pageRows - 1, Math.ceil(nbCells / pageColumns) - 1);
  const rows = [];
  const getCell = options.getCell || (cells ? (index => ({cell: cells[index]})) : (_index => null));
  for (let rowIndex = firstRow; rowIndex <= lastRow; rowIndex += 1) {
    const rowStartPos = rowIndex * pageColumns;
    const rowCells = [];
    for (let colIndex = 0; colIndex < pageColumns; colIndex += 1) {
      rowCells.push({index: colIndex, ...getCell(rowStartPos + colIndex)});
    }
    rows.push({index: rowIndex, columns: rowCells});
  }
  return {...grid, visible: {rows}};
}

export function updateGridVisibleColumns (grid, options) {
  options = options || {};
  const {cellHeight, pageColumns, pageRows, cells, scrollTop, selectedColumns} = grid;
  if (typeof scrollTop !== 'number') {
    return grid;
  }
  const firstRow = Math.floor(scrollTop / cellHeight);
  const lastRow = firstRow + pageRows - 1;
  const columns = [];
  const getCell = options.getCell || (cells ? (index => ({cell: cells[index]})) : (_index => null));
  for (let colIndex = 0; colIndex < pageColumns; colIndex += 1) {
    const colCells = [];
    for (let rowIndex = firstRow; rowIndex <= lastRow; rowIndex += 1) {
      colCells.push({index: rowIndex, ...getCell(rowIndex * pageColumns + colIndex)});
    }
    const selected = selectedColumns && sortedArrayHasElement(selectedColumns, colIndex);
    columns.push({index: colIndex, selected, rows: colCells});
  }
  return {...grid, visible: {columns}};
}

export function updateGridVisibleArea (grid, options) {
  /* TODO: build a cache key, store it in the grid, use it to skip computation when unchanged */
  if (grid.mode === 'rows') {
    return updateGridVisibleRows(grid, options);
  }
  if (grid.mode === 'columns') {
    return updateGridVisibleColumns(grid, options);
  }
  return grid;
}

export function getClassNames (colorClass, borderClass) {
  let classNames = null;
  if (colorClass) {classNames = colorClass;}
  if (borderClass) {classNames = classNames ? (classNames + " " + borderClass) : borderClass;}
  return classNames;
}

/* SUBSTITUTION functions */


export function makeSubstitution (alphabet) {
  const cells = range(0, size).map(function (c, rank) {
    return {rank, rotating: c, editable: null, locked: false, conflict: false};
  });
  const nullPerm = new Array(size).fill(-1);

  return {alphabet, size, selectedAlphabet: null, cells, forward: nullPerm, backward: nullPerm};
}

export function dumpSubstitutions (alphabet, substitution) {
  return substitution.cells.reduce((arr, {editable, locked}, index) => {
    const rank = alphabet.indexOf(editable);
    if (rank !== -1) {
      arr.push([index, [rank, locked ? 1 : 0]]);
    }
    return arr;
  }, []);
}

export function loadSubstitutions (alphabet, hints, substitutionDump) {
  const allHints = hints.filter(hint => hint.type === 'type_2');
  const cells = new Array(size).fill(-1);
  for (let i = 0; i < substitutionDump.length; i++) {
    const [index, cell] = substitutionDump[i];
    cells[index] = cell;
  }
  const $cells = [];
  cells.forEach((cell, cellIndex) => {
    /* Locking information is not included in the answer. */
    if (typeof cell === 'number') cell = [cell, 0];
    const [rank, locked] = cell;
    $cells[cellIndex] = {
      editable: {$set: rank === -1 ? null : alphabet[rank]},
      locked: {$set: locked !== 0},
    };
  });
  hints.forEach(({cellRank: j, symbol, type}) => {
    if (type !== 'type_2') {
      $cells[j] = {
        editable: {$set: symbol},
        hint: {$set: true},
      };
    }
  });
  allHints.forEach(({key}) => {
    key.forEach((j, rank) => {
      $cells[j] = {
        editable: {$set: alphabet[rank]},
        hint: {$set: true},
      };
    });
  });
  let substitution = makeSubstitution(alphabet);
  substitution = update(substitution, {cells: $cells});
  substitution = markSubstitutionConflicts(updatePerms(substitution));
  return substitution;
}

export function editSubstitutionCell (substitution, rank, symbol) {
  substitution = update(substitution, {cells: {[rank]: {editable: {$set: symbol}}}});
  return updatePerms(markSubstitutionConflicts(substitution));
}

export function lockSubstitutionCell (substitution, rank, locked) {
  return update(substitution, {cells: {[rank]: {locked: {$set: locked}}}});
}

function markSubstitutionConflicts (substitution) {
  const counts = new Map();
  const changes = {};
  for (let {rank, editable, conflict} of substitution.cells) {
    if (conflict) {
      changes[rank] = {conflict: {$set: false}};
    }
    if (editable !== null) {
      if (!counts.has(editable)) {
        counts.set(editable, [rank]);
      } else {
        counts.get(editable).push(rank);
      }
    }
  }
  for (let ranks of counts.values()) {
    if (ranks.length > 1) {
      for (let rank of ranks) {
        changes[rank] = {conflict: {$set: true}};
      }
    }
  }
  return update(substitution, {cells: changes});
}

export function updatePerms (substitution) {
  const {size, alphabet, cells} = substitution;
  const backward = new Array(size).fill(-1);
  for (let cell of cells) {
    if (cell.editable !== null && !cell.conflict) {
      const source = alphabet.indexOf(cell.editable);
      backward[cell.rank] = source;
    }
  }
  return {...substitution, backward};
}

export function applySubstitutions (substitution, rank) {
  const result = {rank, locks: 0, trace: []};
  applySubstitution(substitution, result);
  return result;
}

export function wrapAround (value, mod) {
  return ((value % mod) + mod) % mod;
}

export function applySubstitution (substitution, result) {
  let rank = result.rank, cell;
  cell = substitution.cells[rank];
  rank = substitution.backward[rank];
  result.rank = rank;
  if (cell) {
    result.trace.push(cell);
    if (cell.locked) {
      result.locked = true;
    }
    if (cell.hint) {
      result.isHint = true;
    }
    if (cell.isConflict) {
      result.isConflict = true;
    }
  }
}