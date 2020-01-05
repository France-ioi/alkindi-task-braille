import React from 'react';

const radius = 3;
const BETWEEN_DOTS = 2 * (2 * radius);
const BETWEEN_SYM_HZ = 4 * (2 * radius);
const BETWEEN_SYM_VT = 6 * (2 * radius);

// create the visual positioning of 9X4 symbols cell.
export function createSymbolStructure () {
    const cells = [];
    let cx = BETWEEN_SYM_HZ / 2;
    const y = BETWEEN_SYM_VT / 2;
    let cy = y;
    for (let s = 0; s < 3; s++) {
        for (let xi = 0; xi < 3; xi++) {
            cy = y;
            for (let yi = 0; yi < 4; yi++) {
                const key = `dot_${s}_${(yi * 3) + xi}`;
                cells.push(
                    <circle
                        key={key}
                        className={`dot ${key} `}
                        cx={cx}
                        cy={cy}
                        r={radius}
                        fill='inherit'
                    />);
                    cy += BETWEEN_DOTS;
            }
            cx += BETWEEN_DOTS;
        }
        cx += BETWEEN_SYM_HZ;
    }
    return {cells, width: cx - (BETWEEN_SYM_HZ/2), height: cy - BETWEEN_DOTS + (BETWEEN_SYM_VT/2)};
}