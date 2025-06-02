const fs = require('fs');
const path = require('path');
const { parse } = require('json2csv');

const saveData = (requests, dir) => {
    fs.writeFileSync(path.join(dir, 'dataset.json'), JSON.stringify({ requests }, null, 2));
};

module.exports = { saveData };
