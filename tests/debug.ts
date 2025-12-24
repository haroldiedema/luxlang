import * as fs      from 'node:fs';
import * as path    from 'node:path';
import { Debugger } from '../dist/index.js';

// @ts-ignore
import { Fixture } from './Fixture.ts';

const rootDir: string             = import.meta.dirname;
const fixtureCategory: string     = process.argv[2];
const fixtureFile: string         = process.argv[3];
const fixtureIndex: number | null = process.argv[4] ? parseInt(process.argv[4], 10) : null;

if (! fixtureCategory || ! fixtureFile) {
    console.error('Usage: ts-node debug.ts <category> <file> [index]');
    process.exit(1);
}

const fixturesDir: string = path.resolve(rootDir, findFileIn(rootDir, fixtureCategory) || fixtureCategory, 'Fixtures');
if (! fs.existsSync(fixturesDir)) {
    console.error(`No fixtures found for category "${fixtureCategory}". Available categories are: "${findCategories().join('", "')}".`);
    process.exit(1);
}

const filename = findFileIn(fixturesDir, fixtureFile) || findFileIn(fixturesDir, fixtureFile + '.md') || fixtureFile;
if (! fs.existsSync(path.resolve(fixturesDir, filename))) {
    console.error(`The fixture file "${fixtureFile}" does not exist in category "${fixtureCategory}". Available fixtures: "${findFixturesIn(fixturesDir).join('", "')}".`);
    process.exit(1);
}

const fixtures = Fixture.load(path.resolve(fixturesDir, filename));
if (fixtures.length > 0 && fixtureIndex === null) {
    console.error(`The fixture file "${fixtureFile}" contains multiple fixtures. Please specify an index (0 to ${fixtures.length - 1}).`);
    for (let i = 0, len = fixtures.length; i < len; i++) {
        console.error(`- [${i}] ${fixtures[i].title}`);
    }
    process.exit(1);
}

const fixture = fixtureIndex !== null ? fixtures[fixtureIndex] : fixtures[0];
if (! fixture) {
    console.error(`No fixture found at index ${fixtureIndex} in file "${fixtureFile}".`);
    process.exit(1);
}

console.log(`Starting debugger session for "${fixture.title}"`);
Debugger.create(fixture.createVirtualMachine({colors: true}));

function findFileIn(dir: string, file: string): string | null
{
    const fullPath = path.resolve(dir, file);
    if (fs.existsSync(fullPath)) {
        return fullPath;
    }

    for (const entry of fs.readdirSync(dir)) {
        if (entry.toLowerCase() === file.toLowerCase()) {
            return entry;
        }
    }

    return null;
}

function findCategories(): string[]
{
    return fs
        .readdirSync(rootDir, {withFileTypes: true})
        .filter(entry => entry.isDirectory() && fs.existsSync(path.resolve(rootDir, entry.name, 'Fixtures')))
        .map(entry => entry.name);
}

function findFixturesIn(dir: string): string[]
{
    return fs
        .readdirSync(dir, {withFileTypes: true})
        .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
        .map(entry => entry.name.replace(/\.md$/, ''));
}
