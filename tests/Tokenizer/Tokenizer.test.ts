import fs                             from 'node:fs';
import path                           from 'node:path';
import { describe, expect, it }       from 'vitest';
import { FixtureInfo, FixtureParser } from '../Fixture.js';
import { Tokenizer, TokenStream }     from '../../dist/index.js';

describe('Tokenizer', () => {
    fs.readdirSync(path.resolve(import.meta.dirname, 'Fixtures'))
        .map(file => path.resolve(import.meta.dirname, 'Fixtures', file))
        .filter(file => file.endsWith('.md'))
        .forEach(file => {
            const fixtures: FixtureInfo[] = FixtureParser.parse(file);

            for (const fixture of fixtures) {
                runFixture(fixture, file);
            }
        });
});

function runFixture(fixture: FixtureInfo, filename: string): void
{
    it(fixture.title, () => {
        const tokens: TokenStream = Tokenizer.tokenize(fixture.code);

        if (! fixture.passText) {
            throw new Error(`Fixture "${filename}" is missing expected JSON output.`);
        }

        const expected: string[][] = fixture.passText.split('\n')
            .map(l => l.split(' '))
            .map(l => [l[0], l.slice(1).join(' ').trim()]);

        for (let i = 0; i < expected.length; i++) {
            const token = tokens.tokens[i];
            expect(token).toBeTruthy();
            expect(token.type, `Token #${i} Type = ${token.type}, value = ${token.value}`).toBe(expected[i][0]);
            expect(token.value, `Token #${i} Type = ${token.type} / ${expected[0]}, value = ${token.value} / ${expected[1]}`).toBe(expected[i][1]);
        }
    });
}
