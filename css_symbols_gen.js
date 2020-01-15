var fs = require('fs');
var file = './src/symbols.css';

try {
    fs.unlinkSync(file);
} catch (err) { } // eslint-disable-line

var stream = fs.createWriteStream(file);

function range (til) {
    var x = 0, xs = [];
    while (x < til) xs.push(x++);
    return xs;
}

function generateBitmasks (n) {
    return range(Math.pow(2, n)).map(function (x) {
        return x.toString(2);
    });
}

const data = generateBitmasks(12);

stream.once('open', function () {
    let c = 0;
    for (let k = 1; k < data.length; k++) {
        const numStr = data[k];
        const dots = [];
        const indexStart = 12 - numStr.length;
        for (let i = 0; i < numStr.length; i++) {
            if (numStr[i] === '1') {
                dots.push(indexStart + i);
            }
        }

        ['a', 'b', 'c'].forEach((l, i) => {
            const sym = `._${k}${l}`;
            dots.forEach(d => stream.write(`${sym} .d${i}_${d},`));
        });

        // if (k === 5) {
        //     break;
        // }
        if (k > c + 150) {
            c = k;
            console.log('written upto symbol', k);
            stream.write(`.z{fill: #000;}`);
        }
    }
    stream.write(`.z{fill: #000;}`);
    stream.end();
});