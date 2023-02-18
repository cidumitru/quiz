#!/usr/bin/env node
'use strict';

const fs = require('fs');
const filePath = './docs/assets/app-config.json';

console.log('Updating build date...');
fs.readFile(filePath, 'utf8', function (err, data) {
    if (err) return console.log(err);

    const result = data.replace("$BUILD_DATE$", new Date().toISOString());

    fs.writeFile(filePath, result, 'utf8', function (err) {
        if (err) return console.log(err);
    });
});