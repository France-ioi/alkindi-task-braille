import React from 'react';

export default class ColumnsSeparators extends React.PureComponent {
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
