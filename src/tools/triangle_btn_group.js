import React from 'react';
import {elements} from '../utils';
import {symSpecV1} from '../symbols_bundle';
const  {RADIUS: RADIUS_3X, BETWEEN_DOTS: BETWEEN_DOTS_3X, BETWEEN_SYM_HZ: BETWEEN_SYM_HZ_3X} = symSpecV1(3);


export default class TriangleButtonGroup extends React.PureComponent {
  render () {
    const {onClick} = this.props;
    const triangles = [];
    let margin = (RADIUS_3X + 1) - 12;
    for (let i = 0; i < 9; i++) {
      triangles.push(<div key={i} onClick={onClick.bind(null, elements[i])} style={{marginLeft: margin}} className="triangle"></div>);
      margin = (i === 2 || i === 5) ? BETWEEN_SYM_HZ_3X - 24 : BETWEEN_DOTS_3X - 24;
    }
    return (
      <div style={{marginTop: 10}}>
        {triangles}
      </div>
    );
  }
}