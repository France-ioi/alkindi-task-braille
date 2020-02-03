
import React from 'react';
import {connect} from 'react-redux';
import {range} from 'range';

const referenceFrequencies = [
  {symbol: "E", proba: 0.1715},
  {symbol: "A", proba: 0.0812},
  {symbol: "S", proba: 0.0795},
  {symbol: "I", proba: 0.0758},
  {symbol: "T", proba: 0.0724},
  {symbol: "N", proba: 0.0709},
  {symbol: "R", proba: 0.0655},
  {symbol: "U", proba: 0.0637},
  {symbol: "L", proba: 0.0545},
  {symbol: "O", proba: 0.054},
  {symbol: "D", proba: 0.0367},
  {symbol: "C", proba: 0.0334},
  {symbol: "P", proba: 0.0302},
  {symbol: "M", proba: 0.0297},
  {symbol: "V", proba: 0.0163},
  {symbol: "Q", proba: 0.0136},
  {symbol: "F", proba: 0.0107},
  {symbol: "B", proba: 0.009},
  {symbol: "G", proba: 0.0087},
  {symbol: "H", proba: 0.0074},
  {symbol: "J", proba: 0.0054},
  {symbol: "X", proba: 0.0039},
  {symbol: "Y", proba: 0.0031},
  {symbol: "Z", proba: 0.0013},
  {symbol: "W", proba: 0.0011},
  {symbol: "K", proba: 0.0005}
];

const frequencyAlphabet = 'EASITNRULODCPMVQFBGHJXYZWK';

function appInitReducer (state, _action) {
  const visibleLetters = new Array(frequencyAlphabet.length).fill(null);
  return {...state, frequencyAnalysis: {andTextCells: null, substitutionCells: null, visibleLetters}};
}

function taskInitReducer (state) {
  return frequencyAnalysisLateReducer(state);
}

function taskRefreshReducer (state) {
  return frequencyAnalysisLateReducer(state);
}


function frequencyAnalysisLateReducer (state) {

  let {frequencyAnalysis} = state;
  let frequencyChanged = false;

  if (frequencyAnalysis && state.andText && state.andText.cells) {
    let {andTextCells} = frequencyAnalysis;
    if (andTextCells !== state.andText.cells) {

      andTextCells = state.andText.cells;
      const cells = [];
      for (let i = 0; i < andTextCells.length; i++) {
        const symbols = andTextCells[i];
        cells.push(...symbols);
      }
      const alphabet = [];
      for (let i = 0; i < 4096; i++) {
        alphabet.push([i, 0]);
      }

      let textFrequencies = [];
      const freqMap = new Map(alphabet);
      countSymbols(freqMap, cells, 0, cells.length - 1);
      textFrequencies = normalizeAndSortFrequencies(freqMap.entries());
      const totalChars = Array.from(freqMap.values()).reduce((a, count) => count ? a + 1 : a, 0);
      const frequencyCount = textFrequencies.slice(0, referenceFrequencies.length).reduce((a, x) => x.proba ? a + 1 : a, 0);
      frequencyChanged = true;
      frequencyAnalysis = {...frequencyAnalysis, cells, andTextCells, textFrequencies, totalChars, frequencyCount};
    }
  }

  const {substitutions} = state;

  if (frequencyAnalysis && substitutions && substitutions.cells) {
    let {cells: subsCells} = substitutions;
    let {substitutionCells, textFrequencies} = frequencyAnalysis;

    if (substitutionCells !== subsCells || frequencyChanged) {
      const {taskData: {alphabet}} = state;
      const visibleLetters = new Array(frequencyAlphabet.length).fill(null);

      for (let i = 0; i < alphabet.length; i++) {
        const {editable, hint} = subsCells[textFrequencies[i].symbol];
        if (editable) {
          visibleLetters[frequencyAlphabet.indexOf(editable)] = hint ? {isHint: true} : {isEdited: true};
        }
      }
      frequencyAnalysis = {...frequencyAnalysis, visibleLetters, substitutionCells: subsCells};
    }
  }

  state = {...state, frequencyAnalysis};
  return state;
}

function countSymbols (map, text, startPos, endPos) {
  for (let pos = startPos; pos <= endPos; pos += 1) {
    countSymbol(map, text[pos]);
  }
}

function countSymbol (map, char) {
  const count = map.get(char);
  if (count !== undefined) {
    map.set(char, count + 1);
  }
}


function normalizeAndSortFrequencies (entries) {
  const result = Array.from(entries);
  const totalCount = result.reduce((a, x) => a + x[1], 0);
  result.sort(function (s1, s2) {
    const p1 = s1[1], p2 = s2[1];
    return p1 > p2 ? -1 : (p1 < p2 ? 1 : 0);
  });
  return result.map(([symbol, count]) => ({symbol, proba: count / totalCount}));
}

function FrequencyAnalysisSelector (state) {
  const {taskData: {version:{version}}, editingDecipher, frequencyAnalysis: {textFrequencies, visibleLetters, totalChars, frequencyCount}, symbols: {sym1Small: singleSymbol}} = state;
  const scale = 30 / referenceFrequencies.reduce((a, x) => Math.max(a, x.proba), 0);
  return {
    editingDecipher,
    singleSymbol,
    referenceFrequencies,
    visibleLetters,
    textFrequencies,
    totalChars,
    frequencyCount,
    scale,
    version,
  };
}

const numberStyle = {
  fontSize: 'medium'
};

class FrequencyAnalysisView extends React.PureComponent {
  render () {
    const {version, editingDecipher, singleSymbol, visibleLetters, totalChars, frequencyCount, referenceFrequencies, textFrequencies, scale} = this.props;
    if (!referenceFrequencies) return false;

    return (
      <div className='clearfix'>
        {version !== 1 && <h6><b>&nbsp;&nbsp;&nbsp;&nbsp;Frequencies of the <i style={numberStyle}>{frequencyCount}</i> most frequent symbols, out of {<i style={numberStyle}>{totalChars}</i>} present in the message after applying the AND tool.</b></h6>}
        <div style={{float: 'left', width: '100px', height: '108px', fontSize: '10px', lineHeight: '10px', position: 'relative'}}>
          <div style={{height: '30px', position: 'absolute', top: '6px'}}>
            {"Fréquences dans le texte :"}
          </div>
          <div style={{height: '20px', position: 'absolute', top: '36px'}}>
            {"Symboles du texte :"}
          </div>
          <div style={{height: '20px', position: 'absolute', top: '62px'}}>
            {"Substitutions :"}
          </div>
          <div style={{height: '30px', position: 'absolute', top: '84px'}}>
            {"Fréquences en français :"}
          </div>
        </div>
        {range(0, frequencyCount).map(index =>
          <div key={index} style={{marginRight: '4px', float: 'left', width: '20px', height: '108px', position: 'relative'}}>
            <TextFrequencyBox index={index} editingDecipher={editingDecipher} singleSymbol={singleSymbol} cell={textFrequencies[index]} scale={scale} />
            <ReferenceFrequencyBox index={index} visibleLetters={visibleLetters} cell={referenceFrequencies[index]} scale={scale} />
          </div>)}
      </div>
    );
  }
}

class TextFrequencyBox extends React.PureComponent {
  render () {
    const {cell, scale, singleSymbol, editingDecipher} = this.props;
    if (!cell) return false;

    const highlighted = editingDecipher.symbol && editingDecipher.symbol === cell.symbol;

    const svgStyle = {};

    if (highlighted) {
        svgStyle.backgroundColor = "#9c9c9c";
        svgStyle.outline = '3px solid #9c9c9c';
    }

    return (
      <div style={ {position: 'absolute', top: '0px'}}>
        <div style={{width: '20px', height: '30px', display: 'table-cell', verticalAlign: 'bottom'}}>
          <div style={{height: `${Math.min(30, Math.round(cell.proba * scale))}px`, width: '8px', marginLeft: '5px', background: 'black'}} />
        </div>
        <div style={{width: '17px', height: '20px', border: '1px solid white', marginBottom: '3px', marginTop: '3px', textAlign: 'center'}}>
          <svg
            className={`_${cell.symbol}a`}
            width={singleSymbol.width}
            height={singleSymbol.height}
            style={svgStyle}
          >
            {singleSymbol.cells}
          </svg>
        </div>
      </div>
    );
  }
}

class ReferenceFrequencyBox extends React.PureComponent {
  render () {
    const {cell, scale, visibleLetters} = this.props;
    const visibleInfo = visibleLetters[frequencyAlphabet.indexOf(cell.symbol)];
    let bgColor = "transparent";
    if (visibleInfo) {
      if (visibleInfo.isEdited) {
        bgColor = '#c7c7c7b3';
      } else {
        if (visibleInfo.isHint) {
          bgColor = '#8c8c8cb3';
        }
      }
    }
    return (
      <div style={{position: 'absolute', top: '60px'}}>
        <div style={{backgroundColor: bgColor, width: '17px', height: '20px', border: '1px solid black', marginBottom: '2px', textAlign: 'center'}}>
          {cell.symbol}
        </div>
        <div style={{width: '20px', height: '30px', verticalAlign: 'top'}}>
          <div style={{height: `${Math.round(cell.proba * scale)}px`, width: '8px', marginLeft: '5px', background: 'black'}} />
        </div>
      </div>
    );
  }
}

export default {
  actionReducers: {
    appInit: appInitReducer,
    taskInit: taskInitReducer,
    taskRefresh: taskRefreshReducer,
  },
  lateReducer: frequencyAnalysisLateReducer,
  views: {
    FrequencyAnalysis: connect(FrequencyAnalysisSelector)(FrequencyAnalysisView)
  },
};
