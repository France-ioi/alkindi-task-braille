
import React from 'react';
import {connect} from 'react-redux';
import classnames from 'classnames';
import {range} from 'range';
import update from 'immutability-helper';
import {put, select, takeEvery} from 'redux-saga/effects';

import {wrapAround, editSubstitutionCell, lockSubstitutionCell, dumpSubstitutions, loadSubstitutions} from './utils';


function appInitReducer (state, _action) {
  return {...state, substitutions: {}, editing: {}};
}

function taskInitReducer (state, _action) {
  const {alphabet, hints} = state.taskData;
  const substitutions = loadSubstitutions(alphabet, hints, []);
  return {...state, substitutions, taskReady: true};
}

function taskRefreshReducer (state, _action) {
  const {alphabet, hints} = state.taskData;
  const dump = dumpSubstitutions(alphabet, state.substitutions);
  const substitutions = loadSubstitutions(alphabet, hints, dump);
  return {...state, substitutions};
}

function substitutionCellEditStartedReducer (state, {payload: {cellRank}}) {
  const {alphabet} = state.taskData;
  cellRank = wrapAround(cellRank, alphabet.length);
  return update(state, {editing: {$set: {cellRank}}});
}

function substitutionCellEditMovedReducer (state, {payload: {cellMove}}) {
  let {taskData: {alphabet}, substitutions: {cells, selectedAlphabet}, editing: {cellRank}} = state;
  let cellStop = cellRank;
  if (cellRank === undefined) return state;
  let cell;
  do {
    cellRank = wrapAround(cellRank + cellMove, alphabet.length);
    cell = cells[selectedAlphabet[cellRank].symbol];
    /* If we looped back to the starting point, the move is impossible. */
    if (cellStop == cellRank) return state;
  } while (cell.hint || cell.locked);
  return update(state, {editing: {$set: {cellRank}}});
}

function substitutionCellEditCancelledReducer (state, _action) {
  return update(state, {editing: {$set: {}}});
}

function substitutionCellCharChangedReducer (state, {payload: {rank, symbol}}) {
  let {taskData: {alphabet}, substitutions} = state;
  if (symbol.length !== 1 || -1 === alphabet.indexOf(symbol)) {
    symbol = null;
  }
  const substitution = editSubstitutionCell(substitutions, rank, symbol);
  return update(state, {substitutions: {$set: substitution}});
}

function substitutionCellLockChangedReducer (state, {payload: {rank, isLocked}}) {
  const substitution = lockSubstitutionCell(state.substitutions, rank, isLocked);
  return update(state, {substitutions: {$set: substitution}});
}

function substitutionLateReducer (state) {
  if (state.substitutions
    && state.frequencyAnalysis
    && state.frequencyAnalysis.textFrequencies) {
    let {substitutions} = state;
    let {textFrequencies} = state.frequencyAnalysis;
    if (textFrequencies === substitutions.selectedAlphabet) {
      return state;
    }

    const selectedAlphabet = textFrequencies;
    substitutions = {...substitutions, selectedAlphabet};
    state = {...state, substitutions};
  }
  return state;

}

function SubstitutionSelector (state) {
  const {
    actions: {
      substitutionCellLockChanged, substitutionCellCharChanged,
      substitutionCellEditCancelled, substitutionCellEditStarted, substitutionCellEditMoved
    },
    substitutions, editing,
    symbols: {sym1Small: singleSymbol},
    taskData: {alphabet},
    editingDecipher,
  } = state;
  const {cells, selectedAlphabet} = substitutions;
  return {
    substitutionCellEditStarted, substitutionCellEditCancelled, substitutionCellEditMoved,
    substitutionCellLockChanged, substitutionCellCharChanged,
    editingDecipher, cells, nbCells: alphabet.length, selectedAlphabet, singleSymbol, editingRank: editing.cellRank
  };
}

class SubstitutionView extends React.PureComponent {
  render () {
    const {cells, editingDecipher, editingRank, nbCells, selectedAlphabet, singleSymbol} = this.props;
    return (
      <div style={{width: "100%"}}>
        <div className='clearfix' style={{marginLeft: "130px"}}>
          {range(0, nbCells).map(index => {
            const rank = selectedAlphabet[index].symbol;
            const {rotating, editable, locked, conflict, hint} = cells[rank];
            const isActive = false;
            const isEditing = editingRank === index && !locked && !hint;
            const isLast = nbCells === index + 1;
            const highlighted = editingDecipher.symbol && editingDecipher.symbol === rotating;
            // const shiftedIndex = (rank) % nbCells;
            // const {rotating} = cells[selectedAlphabet[shiftedIndex].symbol];

            return (
              <SubstitutionCell key={rank} rank={rank} isLast={isLast}
                staticChar={rotating} editRank={index} singleSymbol={singleSymbol}
                editableChar={editable} isLocked={locked} isHint={hint}
                isEditing={isEditing} isActive={isActive} highlighted={highlighted}
                onChangeChar={this.onChangeChar} onChangeLocked={this.onChangeLocked}
                onEditingStarted={this.onEditingStarted}
                onEditingCancelled={this.onEditingCancelled}
                onEditingMoved={this.editingMoved} isConflict={conflict} />);
          })}
        </div>
      </div>
    );
  }
  onEditingStarted = (rank) => {
    this.props.dispatch({type: this.props.substitutionCellEditStarted, payload: {cellRank: rank}});
  };
  onEditingCancelled = () => {
    this.props.dispatch({type: this.props.substitutionCellEditCancelled});
  };
  onChangeChar = (rank, symbol) => {
    symbol = symbol.toUpperCase();
    this.props.dispatch({type: this.props.substitutionCellCharChanged, payload: {rank, symbol}});
  };
  onChangeLocked = (rank, isLocked) => {
    this.props.dispatch({type: this.props.substitutionCellLockChanged, payload: {rank, isLocked}});
  };
  editingMoved = (substitutionMove, cellMove) => {
    this.props.dispatch({type: this.props.substitutionCellEditMoved, payload: {substitutionMove, cellMove}});
  };
}

class SubstitutionCell extends React.PureComponent {
  /* XXX Clicking in the editable div and entering the same letter does not
         trigger a change event.  This behavior is unfortunate. */
  render () {
    let {staticChar, highlighted, singleSymbol, editableChar, isLocked, isHint, isActive, isEditing, isLast, isConflict} = this.props;
    const columnStyle = {
      float: 'left',
      width: '20px',
    };
    const staticCellStyle = {
      border: '1px solid black',
      borderRightWidth: isLast ? '1px' : '0',
      textAlign: 'center',
      height: '28px'
    };
    if (highlighted) {
      staticCellStyle.backgroundColor = "#9c9c9c";
    }

    const editableCellStyle = {
      border: '1px solid black',
      borderRightWidth: isLast ? '1px' : '0',
      textAlign: 'center',
      cursor: 'text',
      backgroundColor: isHint ? '#afa' : (isConflict ? '#fcc' : '#fff')
    };

    // if (isHint && charAt && editableChar !== charAt) {
    //   editableCellStyle.backgroundColor = '#fcc';
    // }

    /* Apply active-status separation border style. */
    const bottomCellStyle = staticCellStyle;
    if (isActive) {
      bottomCellStyle.marginTop = '0';
      bottomCellStyle.borderTopWidth = '3px';
    } else {
      bottomCellStyle.marginTop = '2px';
      bottomCellStyle.borderTopWidth = '1px'; /* needed because react */
    }
    const staticCell = (
      <div style={staticCellStyle}>
        {(<svg
          className={`_${staticChar}a`}
          width={singleSymbol.width}
          height={singleSymbol.height}
        >
          {singleSymbol.cells}
        </svg>) || '\u00A0'}
      </div>
    );
    const editableCell = (
      <div style={editableCellStyle} onClick={this.startEditing}>
        {isEditing
          ? <input ref={this.refInput} onChange={this.cellChanged} onKeyDown={this.keyDown}
            type='text' value={editableChar || ''} style={{width: '19px', height: '20px', textAlign: 'center'}} />
          : (editableChar || '\u00A0')}
      </div>
    );
    const lock = (
      <div style={{marginTop: '2px', textAlign: 'center', cursor: 'pointer'}} onClick={this.lockClicked}>
        {isHint || <i className={classnames(['fa', isLocked ? 'fa-lock' : 'fa-unlock-alt'])} />}
      </div>
    );
    return (
      <div style={columnStyle}>
        {staticCell}{editableCell}{lock}
      </div>
    );
  }
  componentDidUpdate () {
    if (this._input) {
      this._input.select();
      this._input.focus();
    }
  }
  startEditing = () => {
    if (!this.props.isLocked && !this.props.isEditing) {
      this.props.onEditingStarted(this.props.editRank);
    }
  };
  keyDown = (event) => {
    let handled = true;
    if (event.key === 'ArrowRight') {
      this.props.onEditingMoved(0, 1);
    } else if (event.key === 'ArrowLeft') {
      this.props.onEditingMoved(0, -1);
    } else if (event.key === 'ArrowUp') {
      this.props.onEditingMoved(-1, 0);
    } else if (event.key === 'ArrowDown') {
      this.props.onEditingMoved(1, 0);
    } else if (event.key === 'Escape' || event.key === 'Enter') {
      this.props.onEditingCancelled();
    } else {
      handled = false;
    }
    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  cellChanged = () => {
    const value = this._input.value.substr(-1); /* /!\ IE compatibility */
    this.props.onChangeChar(this.props.rank, value);
  };
  lockClicked = () => {
    this.props.onChangeLocked(this.props.rank, !this.props.isLocked);
  };
  refInput = (element) => {
    this._input = element;
  };
}

export default {
  actions: {
    substitutionCellEditStarted: 'Substitution.Cell.Edit.Started',
    substitutionCellEditMoved: 'Substitution.Cell.Edit.Moved',
    substitutionCellEditCancelled: 'Substitution.Cell.Edit.Cancelled',
    substitutionCellLockChanged: 'Substitution.Cell.Lock.Changed',
    substitutionCellCharChanged: 'Substitution.Cell.Char.Changed',
    substitutionKeyLoaded: 'Substitution.Key.Loaded',
  },
  actionReducers: {
    appInit: appInitReducer,
    taskInit: taskInitReducer,
    taskRefresh: taskRefreshReducer,
    substitutionCellEditStarted: substitutionCellEditStartedReducer,
    substitutionCellEditMoved: substitutionCellEditMovedReducer,
    substitutionCellEditCancelled: substitutionCellEditCancelledReducer,
    substitutionCellLockChanged: substitutionCellLockChangedReducer,
    substitutionCellCharChanged: substitutionCellCharChangedReducer,
    // substitutionKeyLoaded: substitutionKeyLoadedReducer,
  },
  saga: function* () {
    const actions = yield select(({actions}) => actions);
    yield takeEvery(actions.substitutionCellEditStarted, function* () {
      yield put({type: actions.hintRequestFeedbackCleared});
    });
  },
  lateReducer: substitutionLateReducer,
  views: {
    Substitution: connect(SubstitutionSelector)(SubstitutionView)
  }
};
