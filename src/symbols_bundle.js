import {createSymbolStructure, createSymbolStructureV2, createSingleSymbol} from './utils';


export function symSpecV1 (mut = 1) {
  const RADIUS = 3 * mut;
  const BETWEEN_DOTS = 2 * (2 * RADIUS);
  const BETWEEN_SYM_HZ = 4 * (2 * RADIUS);
  const BETWEEN_SYM_VT = 6 * (2 * RADIUS);
  return {
    RADIUS,
    BETWEEN_DOTS,
    BETWEEN_SYM_HZ,
    BETWEEN_SYM_VT
  };
}


function appInitReducer (state, _action) {
  const sym3Normal = createSymbolStructure(symSpecV1());
  const sym3Big = createSymbolStructureV2(symSpecV1(3));
  const sym1Small = createSingleSymbol(symSpecV1(0.5));
  return {
    ...state, symbols: {
      sym3Normal,
      sym3Big,
      sym1Small,
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
