import React from 'react';
import TriangleButtonGroup from './tools/triangle_btn_group';
import SymbolsCircleAsBits from './tools/sym_circles_as_bits';
import ColumnsSeparators from './tools/column_sepatators';
import {connect} from 'react-redux';
import {colMasks, updateGridGeometry, updateGridVisibleRows, applyXOR} from './utils';
import {symSpecV1} from './symbols_bundle';
const  {BETWEEN_SYM_VT} = symSpecV1();


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
  const {width, height} = state.symbols.sym3Normal;

  xorText = {...xorText, cellWidth: width, cellHeight: height};
  xorText = applyRefreshedData(xorText, cells);
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
  const {sym3Big, sym3Normal: {cells}} = symbols;
  return {
    xorTextResized, xorTextScrolled, xorTextBitFlipped, xorTextColumnFlipped,
    xorMask, width, height, visibleRows: visible.rows, cellWidth, cellHeight, bottom, pageRows, pageColumns, scrollTop,
    sym3Big, cells
  };
}


const XORNoteText = () => (<div style={{height: 150}} className="xor_note">
  <b />
  <p>Cliquez sur un point pour changer sa couleur.</p>
  <p>Cliquez sur un triangle pour inverser une colonne.</p>
  <p>Un point noir signifie que tout point à cette position dans un bloc de 3 symboles sera inversé dans le texte.</p>
</div>);

class XORTool extends React.PureComponent {

  render () {
    const {xorMask, sym3Big, onBitClick, onTriangleClick} = this.props;
    return (
      <div className="xor_wrapper">
        <div className="xor_tool">
          <svg className={`_${xorMask[0]}a _${xorMask[1]}b _${xorMask[2]}c`}
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
        <XORNoteText />
      </div>
    );
  }
}

class XORView extends React.PureComponent {

  render () {
    const {xorMask, width, height, pageColumns, visibleRows, cellWidth, cellHeight, bottom, cells, sym3Big} = this.props;
    return (
      <div>
        <XORTool
          sym3Big={sym3Big}
          xorMask={xorMask}
          onBitClick={this.onBitClick}
          onTriangleClick={this.onTriangleClick}
        />
        <br />
        <h3>Résultat du masque XOR</h3>
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
                  </svg>)  : (<div key={index} style={{
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
