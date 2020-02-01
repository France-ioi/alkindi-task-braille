/*
- shows a slice of the clearText
- adds deciphered characters from start up to the "current" animation position
  (lazily computed)
- scrolling does not affect the current animation position
*/

import React from 'react';
import {connect} from 'react-redux';
import update from 'immutability-helper';

import {updateGridGeometry, updateGridVisibleRows, applySubstitutions} from './utils';


function appInitReducer (state, _action) {
  return {
    ...state, editingDecipher: {}, decipheredText: {
      cellWidth: 24,
      cellHeight: 51,
      scrollTop: 0,
      nbCells: 0,
      substitutionCells: null,
      decipheredLetters: {}
    }
  };
}

function taskInitReducer (state, _action) {
  let {decipheredText, substitutions: {cells: substitutionCells}, frequencyAnalysis: {cells}} = state;
  decipheredText = {...decipheredText, cells, substitutionCells, nbCells: cells.length};
  return applyRefreshedData({...state, decipheredText});
}

function taskRefreshReducer (state) {
  let {decipheredText} = state;
  if (!decipheredText) {
    return state;
  }
  const {hints} = state.taskData;
  const {substitutions: {cells: substitutionCells}, frequencyAnalysis: {cells}} = state;

  const hintsData = {};
  hints.forEach(({cellRank: j, symbol, type}) => {
    if (type === 'type_1') {
      hintsData[j] = {
        charAt: symbol,
        isHint: true,
      };
    }
  });

  const allHints = hints.filter(hint => hint.type === 'type_2');

  allHints.forEach(({clearText}) => {
    for (let i = 0; i < clearText.length; i++) {
      hintsData[i] = {
        charAt: clearText[i],
        isHint: true,
      };
    }
  });

  decipheredText = update(decipheredText, {decipheredLetters: {$merge: hintsData}});

  decipheredText = {...decipheredText, substitutionCells, cells, nbCells: cells.length};
  return applyRefreshedData({...state, decipheredText});
}

function decipheredTextResizedReducer (state, {payload: {width}}) {
  let {decipheredText} = state;
  decipheredText = {...decipheredText, width, height: 4 * decipheredText.cellHeight};
  decipheredText = updateGridGeometry(decipheredText, 0);
  return applyRefreshedData({...state, decipheredText});
}

function decipheredTextScrolledReducer (state, {payload: {scrollTop}}) {
  let {decipheredText} = state;
  decipheredText = {...decipheredText, scrollTop};
  return applyRefreshedData({...state, decipheredText});
}

function decipheredTextLateReducer (state, _action) {
  if (!state.taskData || !state.frequencyAnalysis.cells) return state;
  let {substitutions, decipheredText, frequencyAnalysis: {cells}} = state;

  if (substitutions.cells === decipheredText.substitutionCells && cells === decipheredText.cells) {
    return state;
  }

  decipheredText = {
    ...decipheredText,
    substitutionCells: substitutions.cells, cells
  };
  return applyRefreshedData({...state, decipheredText});
}

function applyRefreshedData (state) {
  let {taskData: {alphabet}, substitutions, decipheredText} = state;

  const {cells, decipheredLetters} = decipheredText;
  const position = cells.length - 1;

  function getCell (index) {
    const ciphered = cells[index];
    let cell = {position: index, ciphered};
    let rank = ciphered;
    if (index <= position) {
      Object.assign(cell, applySubstitutions(substitutions, rank));
      if (cell.rank !== -1) {
        cell.clear = alphabet[cell.rank];
      }
      Object.assign(cell, decipheredLetters[index] || {charAt: null});
    }
    return cell;
  }

  decipheredText = updateGridVisibleRows(decipheredText, {getCell});
  return {...state, decipheredText};
}

function decipheredCellEditStartedReducer (state, {payload: {cellRank, symbol}}) {
  return update(state, {editingDecipher: {$set: {cellRank, symbol}}});
}


function decipheredCellEditCancelledReducer (state, _action) {
  return update(state, {editingDecipher: {$set: {}}});
}

function decipheredCellCharChangedReducer (state, {payload: {position, symbol}}) {
  let {taskData: {alphabet}} = state;
  if (symbol.length !== 1 || -1 === alphabet.indexOf(symbol)) {
    symbol = null;
  }

  const value = {};
  value[position] = {
    charAt: symbol
  };

  return applyRefreshedData(update(state,
    {
      decipheredText: {
        decipheredLetters: {$merge: value}
      }
    }));

}


function DecipheredTextViewSelector (state) {
  const {actions, decipheredText, symbols: {sym1Small: singleSymbol}, editingDecipher} = state;
  const {decipheredCellEditStarted, decipheredCellEditCancelled, decipheredCellCharChanged, decipheredTextResized, decipheredTextScrolled, schedulingJump} = actions;
  const {width, height, cellWidth, cellHeight, bottom, pageRows, pageColumns, visible, scrollTop} = decipheredText;
  return {
    decipheredCellEditStarted, decipheredCellEditCancelled, decipheredCellCharChanged,
    decipheredTextResized, decipheredTextScrolled, schedulingJump,
    editingDecipher, singleSymbol, width, height, visibleRows: visible.rows, cellWidth, cellHeight, bottom, pageRows, pageColumns, scrollTop
  };
}

class DecipheredTextView extends React.PureComponent {
  render () {
    const {editingDecipher, singleSymbol, width, height, visibleRows, cellWidth, cellHeight, bottom} = this.props;
    return (
      <div ref={this.refTextBox} onScroll={this.onScroll} style={{position: 'relative', width: width && `${width}px`, height: height && `${height}px`, overflowY: 'scroll', border: 'solid black 1px'}}>
        {(visibleRows || []).map(({index, columns}) =>
          <div key={index} style={{position: 'absolute', top: `${index * cellHeight}px`}}>
            {columns.filter(c => c !== null).map(({index, position, ciphered, charAt, clear, isHint, locked, colorClass, borderClass}) =>
              <TextCell key={index} editingDecipher={editingDecipher} singleSymbol={singleSymbol}
                colorClass={colorClass} borderClass={borderClass}
                column={index} position={position} ciphered={ciphered}
                clear={clear} charAt={charAt} isHint={isHint} locked={locked}
                cellWidth={cellWidth} cellHeight={cellHeight}
                onChangeChar={this.onChangeChar}
                startHighlighting={this.startHighlighting}
                onEditingStarted={this.onEditingStarted}
                onEditingCancelled={this.onEditingCancelled} />)}
          </div>)}
        <div style={{position: 'absolute', top: `${bottom}px`, width: '1px', height: '1px'}} />
      </div>
    );
  }
  refTextBox = (element) => {
    this._textBox = element;
    const width = element.clientWidth;
    const height = element.clientHeight;
    this.props.dispatch({type: this.props.decipheredTextResized, payload: {width, height}});
  };
  onScroll = () => {
    const scrollTop = this._textBox.scrollTop;
    this.props.dispatch({type: this.props.decipheredTextScrolled, payload: {scrollTop}});
  };
  componentDidUpdate () {
    this._textBox.scrollTop = this.props.scrollTop;
  }
  onEditingStarted = (rank, symbol) => {
    this.props.dispatch({type: this.props.decipheredCellEditStarted, payload: {cellRank: rank, symbol}});
  };
  onEditingCancelled = () => {
    this.props.dispatch({type: this.props.decipheredCellEditCancelled});
  };
  onChangeChar = (rank, symbol) => {
    symbol = symbol.toUpperCase();
    this.props.dispatch({type: this.props.decipheredCellCharChanged, payload: {position: rank, symbol}});
  };

}

class TextCell extends React.PureComponent {
  render () {
    let {editingDecipher, position, singleSymbol, column,
      charAt, ciphered, clear, isHint, locked,
      cellWidth, cellHeight} = this.props;
    const isEmptyCell = ciphered === undefined;

    const cellStyle = {
      position: 'absolute',
      left: `${column * (cellWidth)}px`,
      width: `${cellWidth}px`,
      height: `${cellHeight - 2}px`,
      border: 'solid #777',
      borderWidth: '1px 0'
    };

    const isConflict = charAt && clear && charAt !== clear;

    const editableCellStyle = {
      borderRight: '1px solid #eee',
      textAlign: 'center',
      cursor: 'text',
      backgroundColor: (isHint || locked) ? ((!isHint) ? '#a2a2a2' : (isConflict ? '#fcc' : '#aaffaa')) : (clear ? '#e2e2e2' : '#fff')
    };

    const inputStyle = {width: '20px', height: '20px', textAlign: 'center', padding: '0', outline: '0', border: 'none'};

    if (isConflict) {
      editableCellStyle.backgroundColor = '#fcc';
      inputStyle.backgroundColor = '#fcc';
    }

    const symbolCellStyle = {
      width: '100%',
      height: '26px',
      borderRight: '1px solid #9e9e9e',
      borderBottom: '1px solid #ccc',
      paddingTop: '1px'
    };

    let isEditing = false;
    if ("cellRank" in editingDecipher) {
      isEditing = editingDecipher.cellRank === position;
      if (isEditing) {
        cellStyle.border = '2px solid #000';
        delete cellStyle.borderWidth;
      }
      isEditing = isEditing && !isHint && (!locked || clear !== charAt);

    }

    const editableCell = (
      <div style={editableCellStyle}
      // onClick={!isEmptyCell ? this.startEditing : undefined}
      >
        {isEditing
          ? <input ref={this.refInput} onChange={this.cellChanged} onKeyDown={this.keyDown}
            type='text' value={charAt || clear || ''} style={inputStyle} />
          : (charAt || clear || '\u00A0')}
      </div>
    );

    if (column === 0) {
      editableCellStyle.borderLeft = '1px solid #eee';
      symbolCellStyle.borderLeft = '1px solid #9e9e9e';
    }

    return (
      <div onClick={this.startEditing} style={cellStyle}>
        <div style={symbolCellStyle}>
          <div
            style={{
              width: `17px`,
              height: `23px`,
              margin: 'auto'
            }}>
            {!isEmptyCell ? (<svg
              className={`_${ciphered}a`}
              width={singleSymbol.width}
              height={singleSymbol.height}
            >
              {singleSymbol.cells}
            </svg>) : ' '}</div>
        </div>
        <div style={{width: '100%', height: '20px', textAlign: 'center'}}>{editableCell}</div>
      </div>
    );
  }

  componentDidUpdate () {
    if (this._input) {
      this._input.select();
      this._input.focus();
    }
  }
  keyDown = (event) => {
    let handled = true;
    if (event.key === 'Escape' || event.key === 'Enter') {
      this.props.onEditingCancelled();
    } else {
      handled = false;
    }
    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  endEditing = () => {
    this.props.onEditingCancelled();
  };
  startEditing = () => {
    const {isHint, locked, position, editingDecipher, /*clear, charAt,*/ ciphered} = this.props;
    if (ciphered === undefined) return;
    if ((isHint || locked) && editingDecipher.cellRank !== undefined && editingDecipher.cellRank === position) {
      this.endEditing();
    } else {
      this.props.onEditingStarted(position, ciphered);
    }
  };
  // startHighlighting = () => {
  //   const {position, ciphered} = this.props;
  //   this.props.onEditingStarted(-1, position, ciphered);
  // };
  cellChanged = () => {
    const value = this._input.value.substr(-1); /* /!\ IE compatibility */
    this.props.onChangeChar(this.props.position, value);
  };
  refInput = (element) => {
    this._input = element;
  };
}

export default {
  actions: {
    decipheredTextResized: 'DecipheredText.Resized' /* {width: number, height: number} */,
    decipheredTextScrolled: 'DecipheredText.Scrolled' /* {scrollTop: number} */,
    decipheredCellEditStarted: 'DecipheredText.Cell.Edit.Started',
    decipheredCellEditCancelled: 'DecipheredText.Cell.Edit.Cancelled',
    decipheredCellCharChanged: 'DecipheredText.Cell.Char.Changed',
  },
  actionReducers: {
    appInit: appInitReducer,
    taskInit: taskInitReducer,
    taskRefresh: taskRefreshReducer,
    decipheredTextResized: decipheredTextResizedReducer,
    decipheredTextScrolled: decipheredTextScrolledReducer,
    decipheredCellEditStarted: decipheredCellEditStartedReducer,
    decipheredCellEditCancelled: decipheredCellEditCancelledReducer,
    decipheredCellCharChanged: decipheredCellCharChangedReducer,
  },
  lateReducer: decipheredTextLateReducer,
  views: {
    DecipheredText: connect(DecipheredTextViewSelector)(DecipheredTextView),
  }
};
