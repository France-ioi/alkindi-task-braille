import React from 'react';

export default class SymbolsCircleAsBits extends React.PureComponent {
  render () {
    const {cells, onBitClick} = this.props;
    return cells.map(ele => React.cloneElement(ele, {
      onClick: onBitClick.bind(null, ele.key.substr(1).split('_').map((v, i) => i === 1 ? 11 - parseInt(v) : parseInt(v)))
    }));
  }
}
