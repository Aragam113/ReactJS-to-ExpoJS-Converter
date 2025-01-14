﻿const fs = require('fs');
const path = require('path');
const { Command } = require('commander');
const babelParser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const { transformImports } = require('./index');

const programCLI = new Command();
programCLI
    .version('1.0.0')
    .description('Convert imports from ReactJS to Expo-compatible imports')
    .requiredOption('-i, --input <path>', 'Path to the input ReactJS file')
    .requiredOption('-o, --output <path>', 'Path to the output file')
    .parse(process.argv);

const options = programCLI.opts();
const inputPath = path.resolve(options.input);
const outputPath = path.resolve(options.output);

if (!fs.existsSync(inputPath)) {
    console.error(`Input file does not exist: ${inputPath}`);
    process.exit(1);
}

const reactCode = fs.readFileSync(inputPath, 'utf-8');
const ast = babelParser.parse(reactCode, {
    sourceType: 'module',
    plugins: ['jsx', 'importMeta', 'classProperties', 'typescript'],
});

traverse(ast, {
    ImportDeclaration(path) {
        transformImports(path);
    },
});

const { code } = generate(ast, {}, reactCode);
fs.writeFileSync(outputPath, code, 'utf-8');
console.log(`Imports conversion complete! Output written to ${outputPath}`);
