import React from 'react';
import {connect} from 'react-redux';
import {updateGridGeometry, updateGridVisibleRows} from './utils';
import {symSpecV1} from './symbols_bundle';
const  {BETWEEN_SYM_VT} = symSpecV1();


function appInitReducer (state, _action) {
  return {
    ...state, cipheredText: {
      cellWidth: 0,
      cellHeight: 0,
      scrollTop: 0,
      nbCells: 0
    }
  };
}

function taskInitReducer (state) {
  let {cipheredText} = state;
  if (!cipheredText) {
    return state;
  }
  const {cipherSymbols} = state.taskData;
  const {width, height} = state.symbols.sym3Normal;
  cipheredText = {
    ...cipheredText, cellWidth: width,
    cellHeight: height, cells: cipherSymbols, nbCells: cipherSymbols.length
  };
  cipheredText = updateGridVisibleRows(cipheredText);
  return {...state, cipheredText};
}

function taskRefreshReducer (state) {
  let {cipheredText} = state;
  if (!cipheredText) {
    return state;
  }
  const {cipherSymbols} = state.taskData;
  cipheredText = {...cipheredText, cells: cipherSymbols, nbCells: cipherSymbols.length};
  cipheredText = updateGridGeometry(cipheredText);
  cipheredText = updateGridVisibleRows(cipheredText);
  return {...state, cipheredText};
}

function cipheredTextResizedReducer (state, {payload: {width}}) {
  let {cipheredText} = state;
  cipheredText = {...cipheredText, width};
  cipheredText = updateGridGeometry(cipheredText);
  cipheredText = updateGridVisibleRows(cipheredText);
  return {...state, cipheredText};
}

function cipheredTextScrolledReducer (state, {payload: {scrollTop}}) {
  let {cipheredText} = state;
  cipheredText = {...cipheredText, scrollTop: Math.max(BETWEEN_SYM_VT / 2 - 5, scrollTop)};
  cipheredText = updateGridVisibleRows(cipheredText);
  return {...state, cipheredText};
}

function CipherTextViewSelector (state) {
  const {actions, cipheredText, symbols} = state;
  const {cipheredTextResized, cipheredTextScrolled} = actions;
  const {width, height, cellWidth, cellHeight, bottom, pageRows, pageColumns, visible, scrollTop} = cipheredText;
  const {cells} = symbols.sym3Normal;
  return {
    cipheredTextResized, cipheredTextScrolled,
    width, height, visibleRows: visible.rows, cellWidth, cellHeight, bottom, pageRows, pageColumns, scrollTop,
    cells
  };
}

class CipherTextView extends React.PureComponent {

  render () {
    const {width, height, pageColumns, visibleRows, cellWidth, cellHeight, bottom, cells} = this.props;
    return (
      <div>
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
          {(function () {
            const lines = [];
            for (let i = 0; i < pageColumns-1; i++) {
              lines.push(<span key={i} style={{
                position: 'absolute',
                left: `${(i+1) * cellWidth}px`,
                height: `${bottom}px`,
                borderLeft: '2px solid #000',
              }}></span>);
            }
            return lines;
          })()}

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
      </div>
    );
  }

  refTextBox = (element) => {
    this._textBox = element;
    const width = element.clientWidth;
    const height = element.clientHeight;
    this.props.dispatch({type: this.props.cipheredTextResized, payload: {width, height}});
  };
  onScroll = () => {
    const scrollTop = this._textBox.scrollTop;
    this.props.dispatch({type: this.props.cipheredTextScrolled, payload: {scrollTop}});
  };
  componentDidUpdate () {
    this._textBox.scrollTop = this.props.scrollTop;
  }
}

export default {
  actions: {
    cipheredTextResized: 'CipheredText.Resized' /* {width: number, height: number} */,
    cipheredTextScrolled: 'CipheredText.Scrolled' /* {scrollTop: number} */,
  },
  actionReducers: {
    appInit: appInitReducer,
    taskInit: taskInitReducer,
    taskRefresh: taskRefreshReducer,
    cipheredTextResized: cipheredTextResizedReducer,
    cipheredTextScrolled: cipheredTextScrolledReducer,
  },
  views: {
    CipheredText: connect(CipherTextViewSelector)(CipherTextView),
  }
};
