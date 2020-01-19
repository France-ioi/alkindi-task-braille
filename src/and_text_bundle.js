import React from 'react';
import {connect} from 'react-redux';
import {updateGridGeometry, updateGridVisibleRows, applyAND} from './utils';
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
    ...state, andText: {
      cellWidth: 0,
      cellHeight: 0,
      scrollTop: 0,
      nbCells: 0,
      xorCells: null,
      dump: {
        andMask: [0, 0, 0]
      },
    }
  };
}

function taskInitReducer (state) {
  let {andText} = state;
  if (!andText) {
    return state;
  }
  const {addAnd} = state.taskData.version;
  const {cells} = state.permutationText;
  const {width, height} = state.symbols;

  const dump = {
    andMask: (addAnd) ?  [0, 0, 0] : [4095, 4095, 4095]
  };

  andText = {
    ...andText, cellWidth: width, dump,
    cellHeight: height, xorCells: cells, cells: [...cells], nbCells: cells.length
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

  const tmpMask = [null, null, null];
  tmpMask[symbol] = andMask[symbol];

  cells = applyAND(xorCells, tmpMask, cells);

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
  const {cells} = symbols;
  return {
    andTextResized, andTextScrolled, andTextBitFlipped, andTextColumnFlipped,
    andMask, width, height, visibleRows: visible.rows, cellWidth, cellHeight, bottom, pageRows, pageColumns, scrollTop,
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


const ANDNoteText = () => (<div className="xor_note">
  <p>Click on a dot to flip its color.</p>
  <p>Click on a triangle to flip a column.</p>
  <p>A black dot means every dot in this position within its block will be preserved, while a gray dot means it will become gray.</p>
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

class ANDTool extends React.PureComponent {

  render () {
    const {andMask, cells, onBitClick, onTriangleClick} = this.props;
    return (
      <div className="xor_wrapper">
        <div className="xor_tool">
          <svg className={`_${andMask[0]}a _${andMask[1]}b _${andMask[2]}c`}
            transform="scale(3) translate(42.6, 16)"
            style={{
              width: (BETWEEN_DOTS*6) + (BETWEEN_SYM_HZ*2) + (RADIUS+1)*2,
              height: (BETWEEN_DOTS*3) + (RADIUS+1)*2,
            }}
          >
            <SymbolsCircleAsBits
              cells={cells}
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
    const {andMask, width, height, pageColumns, visibleRows, cellWidth, cellHeight, bottom, cells} = this.props;
    return (
      <div>
        <ANDTool
          cells={cells}
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
