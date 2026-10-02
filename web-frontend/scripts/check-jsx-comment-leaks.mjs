import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from '@babel/parser';

const root = process.argv[2];
const files = [];
(function walk(dir) {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            if (entry === 'node_modules' || entry === 'dist') continue;
            walk(full);
        } else if (/\.jsx$/.test(entry)) {
            files.push(full);
        }
    }
})(root);

let leaks = 0;

for (const file of files) {
    const code = readFileSync(file, 'utf8');
    const ast = parse(code, { sourceType: 'module', plugins: ['jsx'] });

    (function visit(node) {
        if (!node || typeof node !== 'object') return;

        // A JSXText child is literal text. If it contains comment syntax, the
        // comment will be rendered on screen instead of being stripped.
        if (node.type === 'JSXText') {
            const value = node.value;
            if (/\/\*|\*\/|\/\//.test(value) && value.trim() !== '') {
                leaks += 1;
                const line = node.loc.start.line;
                console.log(`LEAK ${file.replace(root, '.')}:${line}`);
                console.log(`     renders: ${JSON.stringify(value.slice(0, 90))}`);
            }
        }

        for (const key of Object.keys(node)) {
            if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue;
            const child = node[key];
            if (Array.isArray(child)) child.forEach(visit);
            else if (child && typeof child.type === 'string') visit(child);
        }
    })(ast);
}

console.log(leaks === 0 ? '\nNo JSX-text comment leaks found.' : `\n${leaks} leak(s) found.`);