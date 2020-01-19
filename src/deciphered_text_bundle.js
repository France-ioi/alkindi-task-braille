/*
- shows a slice of the clearText
- adds deciphered characters from start up to the "current" animation position
  (lazily computed)
- scrolling does not affect the current animation position
*/

import React from 'react';
import {connect} from 'react-redux';
import update from 'immutability-helper';

import {editSubstitutionCell, updateGridGeometry2, updateGridVisibleRows2, applySubstitutions, getClassNames} from './utils';

function appInitReducer (state, _action) {
  return {
    ...state, editingDecipher: {}, decipheredText: {
      cellWidth: 24,
      cellHeight: 51,
      scrollTop: 0,
      nbCells: 0,
      substitutionCells: null,
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
  const {substitutions: {cells: substitutionCells}, frequencyAnalysis: {cells}} = state;
  decipheredText = {...decipheredText, substitutionCells, cells, nbCells: cells.length};
  return applyRefreshedData({...state, decipheredText});
}

function decipheredTextResizedReducer (state, {payload: {width}}) {
  let {decipheredText} = state;
  decipheredText = {...decipheredText, width, height: 4 * decipheredText.cellHeight};
  decipheredText = updateGridGeometry2(decipheredText);
  return applyRefreshedData({...state, decipheredText});
}

function decipheredTextScrolledReducer (state, {payload: {scrollTop}}) {
  let {decipheredText} = state;
  decipheredText = {...decipheredText, scrollTop};
  decipheredText = updateGridGeometry2(decipheredText);
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

  const {cells} = decipheredText;
  const position = cells.length - 1;

  function getCell (index) {
    const ciphered = cells[index];
    const cell = {position: index, ciphered};
    let rank = ciphered;
    if (index <= position) {
      Object.assign(cell, applySubstitutions(substitutions, rank));
      if (cell.rank !== -1) {
        cell.clear = alphabet[cell.rank];
      }
    }
    return cell;
  }

  decipheredText = updateGridVisibleRows2(decipheredText, {getCell});
  return {...state, decipheredText};
}



function decipheredCellEditStartedReducer (state, {payload: {cellRank, symbol}}) {
  return update(state, {editingDecipher: {$set: {cellRank, symbol}}});
}


function decipheredCellEditCancelledReducer (state, _action) {
  return update(state, {editingDecipher: {$set: {}}});
}

function decipheredCellCharChangedReducer (state, {payload: {rank, symbol}}) {
  let {taskData: {alphabet}, substitutions} = state;
  if (symbol.length !== 1 || -1 === alphabet.indexOf(symbol)) {
    symbol = null;
  }
  const substitution = editSubstitutionCell(substitutions, rank, symbol);
  return update(state, {substitutions: {$set: substitution}});
}


function DecipheredTextViewSelector (state) {
  const {actions, decipheredText, symbols: {singleSymbol}, editingDecipher} = state;
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
      <div ref={this.refTextBox} onScroll={this.onScroll} style={{position: 'relative', width: width && `${width}px`, height: height && `${height}px`, overflowY: 'scroll'}}>
        {(visibleRows || []).map(({index, columns}) =>
          <div key={index} style={{position: 'absolute', top: `${index * cellHeight}px`}}>
            {columns.map(({index, position, ciphered, clear, isHint, locked, colorClass, borderClass}) =>
              <TextCell key={index} editingDecipher={editingDecipher} singleSymbol={singleSymbol}
                colorClass={colorClass} borderClass={borderClass}
                column={index} position={position} ciphered={ciphered}
                clear={clear} isHint={isHint} locked={locked}
                cellWidth={cellWidth} cellHeight={cellHeight}
                onChangeChar={this.onChangeChar}
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
    this.props.dispatch({type: this.props.decipheredCellCharChanged, payload: {rank, symbol}});
  };
}

class TextCell extends React.PureComponent {
  render () {
    let {editingDecipher, position, singleSymbol, column, ciphered, clear, isHint, locked, isConflict, cellWidth, cellHeight, colorClass, borderClass} = this.props;
    const cellStyle = {
      position: 'absolute',
      left: `${column * (cellWidth)}px`,
      width: `${cellWidth}px`,
      height: `${cellHeight - 2}px`,
      border: 'solid #777',
      borderWidth: '1px 0'
    };

    const noHintSymbol = isHint && !clear;

    const editableCellStyle = {
      borderRight: '1px solid #eee',
      textAlign: 'center',
      cursor: 'text',
      backgroundColor: (isHint || locked) ? ((locked) ? '#e2e2e2' : (noHintSymbol ? '#fcc' : '#a2a2a2')) : '#fff'
    };

    let isEditing = false;
    if ("cellRank" in editingDecipher) {
      isEditing = editingDecipher.cellRank === position;
    }

    if (noHintSymbol) {
      clear = '✖';
    }


    const editableCell = (
      <div style={editableCellStyle} onClick={this.startEditing}>
        {isEditing
          ? <input ref={this.refInput} onChange={this.cellChanged} onKeyDown={this.keyDown}
            type='text' value={clear || ''} style={{width: '19px', height: '20px', textAlign: 'center'}} />
          : (clear || '\u00A0')}
      </div>
    );

    return (
      <div className={`${getClassNames(colorClass, borderClass)}`} style={cellStyle}>
        <div style={{
          width: `99%`,
          height: `26px`,
          borderRight: '1px solid #9e9e9e',
          borderBottom: '1px solid #ccc',
        }}>
          <div style={{
            width: `16px`,
            height: `22px`,
            borderColor: 'transparent',
            borderStyle: 'solid',
            borderWidth: '2px 4px 2px 4px'
          }}>
            {(<svg
              className={`_${ciphered}a`}
              width={singleSymbol.width}
              height={singleSymbol.height}
              transform={`scale(0.5) translate(-${singleSymbol.width / 2}, -${singleSymbol.height / 2})`}
            >
              {singleSymbol.cells}
            </svg>) || ' '}</div>
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
  startEditing = () => {
    const {isHint, locked, isEditing, position, ciphered} = this.props;
    if (!isHint && !locked && !isEditing) {
      this.props.onEditingStarted(position, ciphered);
    }
  };
  cellChanged = () => {
    const value = this._input.value.substr(-1); /* /!\ IE compatibility */
    this.props.onChangeChar(this.props.ciphered, value);
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
