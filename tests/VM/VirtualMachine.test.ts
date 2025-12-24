import fs           from 'node:fs';
import path         from 'node:path';
import { describe } from 'vitest';
import { Fixture }  from '../Fixture.js';

describe('Virtual Machine', () => {
    fs
        .readdirSync(path.resolve(import.meta.dirname, 'Fixtures'))
        .map(file => path.resolve(import.meta.dirname, 'Fixtures', file))
        .filter(file => file.endsWith('.md'))
        .forEach(file => Fixture.run(file));
});
