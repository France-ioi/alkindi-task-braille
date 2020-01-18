// import React from 'react';
// import {connect} from 'react-redux';
import {createSymbolStructure, createSingleSymbol} from './utils';

export const RADIUS = 3;
export const BETWEEN_DOTS = 2 * (2 * RADIUS);
export const BETWEEN_SYM_HZ = 4 * (2 * RADIUS);
export const BETWEEN_SYM_VT = 6 * (2 * RADIUS);


function appInitReducer (state, _action) {
  const {cells, width, height} = createSymbolStructure();
  //const symbolsMap = generateBitmasks(12);
  return {
    ...state, symbols: {
      cells,
      width,
      height,
      singleSymbol: createSingleSymbol()
    }
  };
}

function taskInitReducer (state) {
  return {...state};
}

function taskRefreshReducer (state) {
  return {...state};
}




export default {
  actions: {
    // cipheredTextResized: 'CipheredText.Resized' /* {width: number, height: number} */,
    // cipheredTextScrolled: 'CipheredText.Scrolled' /* {scrollTop: number} */,
  },
  actionReducers: {
    appInit: appInitReducer,
    taskInit: taskInitReducer,
    taskRefresh: taskRefreshReducer,
  },
  views: {
    // SymbolSvg: connect(SymbolSvgSelector)(SymbolSvg),
  }
};
