import React from 'react';
import {connect} from 'react-redux';
import {updateGridGeometry, updateGridVisibleRows, applyXOR} from './utils';
import {BETWEEN_DOTS, BETWEEN_SYM_VT, BETWEEN_SYM_HZ, RADIUS} from './symbols_bundle';

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

const colMasks = [
  1 << 2 | 1 << 5 | 1 << 8 | 1 << 11, // 2340
  1 << 1 | 1 << 4 | 1 << 7 | 1 << 10, // 1170
  1 << 0 | 1 << 3 | 1 << 6 | 1 << 9  // 585
];


function appInitReducer (state, _action) {
  return {
    ...state, xorText: {
      cellWidth: 0,
      cellHeight: 0,
      scrollTop: 0,
      nbCells: 0,
      permTextCells: null,
      dump: {
        xorMask: [0, 0, 0]
      },
    }
  };
}

function taskInitReducer (state) {
  let {xorText} = state;
  if (!xorText) {
    return state;
  }
  const {cells} = state.permutationText;
  const {width, height} = state.symbols;

  xorText = {
    ...xorText, cellWidth: width,
    cellHeight: height, permTextCells: cells, cells: [...cells], nbCells: cells.length
  };
  xorText = updateGridVisibleRows(xorText);
  return {...state, xorText};
}

function applyRefreshedData (xorText, newPermTextCells) {
  let {cells, permTextCells, dump: {xorMask}} = xorText;
  if (permTextCells !== newPermTextCells) {
    cells = applyXOR(newPermTextCells, xorMask);
    permTextCells = newPermTextCells;
    return {...xorText, cells, permTextCells, nbCells: permTextCells.length};
  }
  return xorText;
}

function taskRefreshReducer (state) {
  let {xorText} = state;
  if (!xorText) {
    return state;
  }
  const {cells} = state.permutationText;
  xorText = applyRefreshedData(xorText, cells);
  xorText = updateGridGeometry(xorText);
  xorText = updateGridVisibleRows(xorText);
  return {...state, xorText};
}

function xorTextResizedReducer (state, {payload: {width}}) {
  let {xorText} = state;
  xorText = {...xorText, width};
  xorText = updateGridGeometry(xorText);
  xorText = updateGridVisibleRows(xorText);
  return {...state, xorText};
}

function xorTextScrolledReducer (state, {payload: {scrollTop}}) {
  let {xorText} = state;
  xorText = {...xorText, scrollTop: Math.max(BETWEEN_SYM_VT / 2 - 5, scrollTop)};
  xorText = updateGridVisibleRows(xorText);
  return {...state, xorText};
}

function applyXORChange (state, symbol, change) {
  let {xorText} = state;
  let {cells, dump: {xorMask}} = xorText;
  xorMask = [...xorMask];
  xorMask[symbol] ^= change;

  const tmpMask = [null, null, null];
  tmpMask[symbol] = change;
  cells = applyXOR(cells, tmpMask);

  xorText = {...xorText, dump: {xorMask}, cells};
  xorText = updateGridVisibleRows(xorText);
  return {...state, xorText};
}

function xorTextBitFlippedReducer (state, {symbol, bitPosition}) {
  return applyXORChange(state, symbol, 1 << bitPosition);
}

function xorTextColumnFlippedReducer (state, {symbol, column}) {
  return applyXORChange(state, symbol, colMasks[column]);
}

function xorTextLateReducer (state) {
  let {xorText, permutationText} = state;
  if (!xorText || !permutationText || !permutationText.cells) {
    return state;
  }

  xorText = applyRefreshedData(xorText, permutationText.cells);
  xorText = updateGridVisibleRows(xorText);
  return {...state, xorText};
}


function XORViewSelector (state) {
  const {actions, xorText, symbols} = state;
  const {xorTextResized, xorTextScrolled, xorTextBitFlipped, xorTextColumnFlipped} = actions;
  const {dump: {xorMask}, width, height, cellWidth, cellHeight, bottom, pageRows, pageColumns, visible, scrollTop} = xorText;
  const {cells} = symbols;
  return {
    xorTextResized, xorTextScrolled, xorTextBitFlipped, xorTextColumnFlipped,
    xorMask, width, height, visibleRows: visible.rows, cellWidth, cellHeight, bottom, pageRows, pageColumns, scrollTop,
    cells
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


const XORNoteText = () => (<div style={{height: 150}} className="xor_note">
  <b />
  <p>Click on a dot to flip its color.</p>
  <p>Click on a triangle to flip a column.</p>
  <p>A black dot means every dot in this position within a block of 3 symbols will be flipped in the text</p>
</div>);

class TriangleButtonGroup extends React.PureComponent {
  render () {
    const {onClick} = this.props;
    const triangles = [];
    let margin = 0;
    for (let i = 0; i < 9; i++) {
      triangles.push(<div key={i} onClick={onClick.bind(null, elements[i])} style={{marginLeft: margin}} className="triangle"></div>);
      margin = (i === 2 || i === 5) ? Math.ceil(BETWEEN_SYM_HZ * 2) + 1 : BETWEEN_DOTS;
    }
    return (
      <div style={{marginTop: 98}}>
        {triangles}
      </div>
    );
  }
}

class SymbolsCircleAsBits extends React.PureComponent {
  render () {
    const {cells, onBitClick} = this.props;
    return cells.map(ele => React.cloneElement(ele, {
      onClick: onBitClick.bind(null, ele.key.substr(1).split('_').map((v, i) => i === 1 ? 11 - parseInt(v) : parseInt(v))),
      cy: ele.props.cy - BETWEEN_SYM_VT/2 + RADIUS + 1,
      cx: ele.props.cx - BETWEEN_SYM_HZ/2 + RADIUS + 1,
    }));
  }
}

class XORTool extends React.PureComponent {

  render () {
    const {xorMask, cells, onBitClick, onTriangleClick} = this.props;
    return (
      <div className="xor_wrapper">
        <div className="xor_tool">
          <svg className={`_${xorMask[0]}a _${xorMask[1]}b _${xorMask[2]}c`}
            transform="scale(3) translate(42.6, 16)"
            style={{
              width: (BETWEEN_DOTS*6) + (BETWEEN_SYM_HZ*2) + (RADIUS+1)*2,
              height: (BETWEEN_DOTS*3) + (RADIUS+1)*2
            }}
          >
            <SymbolsCircleAsBits
              cells={cells}
              onBitClick={onBitClick}
            />
          </svg>
          <TriangleButtonGroup onClick={onTriangleClick} />
        </div>
        <XORNoteText />
      </div>
    );
  }
}

class XORView extends React.PureComponent {

  render () {
    const {xorMask, width, height, pageColumns, visibleRows, cellWidth, cellHeight, bottom, cells} = this.props;
    return (
      <div>
        <XORTool
          cells={cells}
          xorMask={xorMask}
          onBitClick={this.onBitClick}
          onTriangleClick={this.onTriangleClick}
        />
        <h3>Result of XOR Mask</h3>
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
                  (<svg
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
                  </svg>)
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
    this.props.dispatch({type: this.props.xorTextResized, payload: {width, height}});
  };
  onScroll = () => {
    const scrollTop = this._textBox.scrollTop;
    this.props.dispatch({type: this.props.xorTextScrolled, payload: {scrollTop}});
  };
  componentDidUpdate () {
    this._textBox.scrollTop = this.props.scrollTop;
  }
  onBitClick = (position) => {
    const [symbol, bitPosition] = position;
    this.props.dispatch({
      type: this.props.xorTextBitFlipped,
      symbol,
      bitPosition
    });
  }
  onTriangleClick = (position) => {
    const [symbol, column] = position;
    this.props.dispatch({
      type: this.props.xorTextColumnFlipped,
      symbol,
      column
    });
  }
}

export default {
  actions: {
    xorTextResized: 'xorText.Resized' /* {width: number, height: number} */,
    xorTextScrolled: 'xorText.Scrolled' /* {scrollTop: number} */,
    xorTextBitFlipped: 'xorText.BitFlipped',
    xorTextColumnFlipped: 'xorText.ColumnFlipped',
  },
  actionReducers: {
    appInit: appInitReducer,
    taskInit: taskInitReducer,
    taskRefresh: taskRefreshReducer,
    xorTextResized: xorTextResizedReducer,
    xorTextScrolled: xorTextScrolledReducer,
    xorTextBitFlipped: xorTextBitFlippedReducer,
    xorTextColumnFlipped: xorTextColumnFlippedReducer,
  },
  lateReducer: xorTextLateReducer,
  views: {
    XORText: connect(XORViewSelector)(XORView),
  }
};
