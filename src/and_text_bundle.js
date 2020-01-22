import React from 'react';
import TriangleButtonGroup from './tools/triangle_btn_group';
import SymbolsCircleAsBits from './tools/sym_circles_as_bits';
import {connect} from 'react-redux';
import {colMasks, updateGridGeometry, updateGridVisibleRows, applyAND} from './utils';
import {symSpecV1} from './symbols_bundle';
const  {BETWEEN_SYM_VT} = symSpecV1();


function appInitReducer (state, _action) {
  return {
    ...state, andText: {
      cellWidth: 0,
      cellHeight: 0,
      scrollTop: 0,
      nbCells: 0,
      xorCells: null,
      dump: {
        andMask: [4095, 4095, 4095]
      },
    }
  };
}

function taskInitReducer (state) {
  let {andText} = state;
  if (!andText) {
    return state;
  }
  // const {addAnd} = state.taskData.version;
  const {cells} = state.permutationText;
  const {width, height} = state.symbols.sym3Normal;

  // const dump = {
  //   andMask: (addAnd) ?  [0, 0, 0] : [4095, 4095, 4095]
  // };
  andText = applyRefreshedData(andText, cells);
  andText = {
    ...andText, cellWidth: width, /*dump,*/
    cellHeight: height
  };
  andText = updateGridVisibleRows(andText);
  return {...state, andText};
}

function applyRefreshedData (andText, newXorCells) {
  let {cells, xorCells, dump: {andMask}} = andText;
  if (xorCells !== newXorCells) {
    cells = applyAND(newXorCells, andMask);
    xorCells = newXorCells;
    return {...andText, cells, xorCells, nbCells: xorCells.length};
  }
  return andText;
}

function taskRefreshReducer (state) {
  let {andText} = state;
  if (!andText) {
    return state;
  }
  const {cells} = state.permutationText;
  andText = applyRefreshedData(andText, cells);
  andText = updateGridGeometry(andText);
  andText = updateGridVisibleRows(andText);
  return {...state, andText};
}

function andTextResizedReducer (state, {payload: {width}}) {
  let {andText} = state;
  andText = {...andText, width};
  andText = updateGridGeometry(andText);
  andText = updateGridVisibleRows(andText);
  return {...state, andText};
}

function andTextScrolledReducer (state, {payload: {scrollTop}}) {
  let {andText} = state;
  andText = {...andText, scrollTop: Math.max(BETWEEN_SYM_VT / 2 - 5, scrollTop)};
  andText = updateGridVisibleRows(andText);
  return {...state, andText};
}

function applyANDChange (state, symbol, change) {
  let {andText} = state;
  let {cells, xorCells, dump: {andMask}} = andText;
  andMask = [...andMask];
  andMask[symbol] ^= change;

  cells = applyAND(xorCells, andMask);

  andText = {...andText, dump: {andMask}, cells};
  andText = updateGridVisibleRows(andText);
  return {...state, andText};
}

function andTextBitFlippedReducer (state, {symbol, bitPosition}) {
  return applyANDChange(state, symbol, 1 << bitPosition);
}

function andTextColumnFlippedReducer (state, {symbol, column}) {
  return applyANDChange(state, symbol, colMasks[column]);
}

function andTextLateReducer (state) {
  let {andText, xorText} = state;
  if (!andText || !xorText || !xorText.cells) {
    return state;
  }

  andText = applyRefreshedData(andText, xorText.cells);
  andText = updateGridVisibleRows(andText);
  return {...state, andText};
}


function ANDViewSelector (state) {
  const {actions, andText, symbols} = state;
  const {andTextResized, andTextScrolled, andTextBitFlipped, andTextColumnFlipped} = actions;
  const {dump: {andMask}, width, height, cellWidth, cellHeight, bottom, pageRows, pageColumns, visible, scrollTop} = andText;
  const {sym3Big, sym3Normal: {cells}} = symbols;
  return {
    andTextResized, andTextScrolled, andTextBitFlipped, andTextColumnFlipped,
    andMask, width, height, visibleRows: visible.rows, cellWidth, cellHeight, bottom, pageRows, pageColumns, scrollTop,
    cells, sym3Big
  };
}

class ColumnsSeparators extends React.PureComponent {
  render () {
    const {pageColumns, cellWidth, bottom} = this.props;
    const lines = [];
    for (let i = 0; i < pageColumns - 1; i++) {
      lines.push(<span key={i} style={{
        position: 'absolute',
        left: `${(i + 1) * cellWidth}px`,
        height: `${bottom}px`,
        borderLeft: '2px solid #000',
      }}></span>);
    }
    return lines;
  }
}


const ANDNoteText = () => (<div className="xor_note">
  <p>Click on a dot to flip its color.</p>
  <p>Click on a triangle to flip a column.</p>
  <p>A black dot means every dot in this position within its block will be preserved, while a gray dot means it will become gray.</p>
</div>);


class ANDTool extends React.PureComponent {

  render () {
    const {andMask, sym3Big, onBitClick, onTriangleClick} = this.props;
    return (
      <div className="xor_wrapper">
        <div className="xor_tool">
          <svg className={`_${andMask[0]}a _${andMask[1]}b _${andMask[2]}c`}
            width={sym3Big.width}
            height={sym3Big.height}
          >
            <SymbolsCircleAsBits
              cells={sym3Big.cells}
              onBitClick={onBitClick}
            />
          </svg>
          <TriangleButtonGroup onClick={onTriangleClick} />
        </div>
        <ANDNoteText />
      </div>
    );
  }
}

class ANDView extends React.PureComponent {

  render () {
    const {andMask, sym3Big, width, height, pageColumns, visibleRows, cellWidth, cellHeight, bottom, cells} = this.props;
    return (
      <div>
        <ANDTool
          sym3Big={sym3Big}
          andMask={andMask}
          onBitClick={this.onBitClick}
          onTriangleClick={this.onTriangleClick}
        />
        <h3>Result of AND Mask</h3>
        <div
          ref={this.refTextBox}
          onScroll={this.onScroll}
          style={{
            position: 'relative',
            width: width && `${width}px`,
            height: height && `${height}px`,
            overflowX: 'scroll',
            border: '1px solid #000',

          }} >
          <ColumnsSeparators
            pageColumns={pageColumns}
            cellWidth={cellWidth}
            bottom={bottom}
          />
          {(visibleRows || [])
            .map(({index, columns}) =>
              (<div
                key={index}
                style={{
                  position: 'absolute',
                  top: `${index * cellHeight}px`,
                  padding: '4px'
                }}>
                {columns.map(({index, cell}) =>
                  cell ? (<svg
                    key={index}
                    className={`_${cell[0]}a _${cell[1]}b _${cell[2]}c`}
                    width={cellWidth}
                    height={cellHeight}
                    style={{
                      position: 'absolute',
                      left: `${index * cellWidth + 1}px`,
                      width: `${cellWidth}px`,
                      height: `${cellHeight}px`
                    }} >
                    {cells}
                  </svg>) : (<div key={index} style={{
                      position: 'absolute',
                      left: `${index * cellWidth + 1}px`,
                      width: `${cellWidth}px`,
                      height: `${cellHeight}px`
                    }}></div>)
                )}
              </div>)
            )}
          <div style={{
            position: 'absolute',
            top: `${bottom}px`,
            width: '1px',
            height: '1px'
          }} />
        </div>
      </div >
    );
  }

  refTextBox = (element) => {
    this._textBox = element;
    const width = element.clientWidth;
    const height = element.clientHeight;
    this.props.dispatch({type: this.props.andTextResized, payload: {width, height}});
  };
  onScroll = () => {
    const scrollTop = this._textBox.scrollTop;
    this.props.dispatch({type: this.props.andTextScrolled, payload: {scrollTop}});
  };
  componentDidUpdate () {
    this._textBox.scrollTop = this.props.scrollTop;
  }
  onBitClick = (position) => {
    const [symbol, bitPosition] = position;
    this.props.dispatch({
      type: this.props.andTextBitFlipped,
      symbol,
      bitPosition
    });
  }
  onTriangleClick = (position) => {
    const [symbol, column] = position;
    this.props.dispatch({
      type: this.props.andTextColumnFlipped,
      symbol,
      column
    });
  }
}

export default {
  actions: {
    andTextResized: 'andText.Resized' /* {width: number, height: number} */,
    andTextScrolled: 'andText.Scrolled' /* {scrollTop: number} */,
    andTextBitFlipped: 'andText.BitFlipped',
    andTextColumnFlipped: 'andText.ColumnFlipped',
  },
  actionReducers: {
    appInit: appInitReducer,
    taskInit: taskInitReducer,
    taskRefresh: taskRefreshReducer,
    andTextResized: andTextResizedReducer,
    andTextScrolled: andTextScrolledReducer,
    andTextBitFlipped: andTextBitFlippedReducer,
    andTextColumnFlipped: andTextColumnFlippedReducer,
  },
  lateReducer: andTextLateReducer,
  views: {
    ANDText: connect(ANDViewSelector)(ANDView),
  }
};
