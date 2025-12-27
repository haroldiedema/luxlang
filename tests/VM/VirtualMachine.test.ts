import fs                           from 'node:fs';
import path                         from 'node:path';
import { describe, expect, it } from 'vitest';
import { Compiler, VirtualMachine } from '../../dist/index.js';
import { Fixture }                  from '../Fixture.js';

describe('Virtual Machine', () => {
    fs
        .readdirSync(path.resolve(import.meta.dirname, 'Fixtures'))
        .map(file => path.resolve(import.meta.dirname, 'Fixtures', file))
        .filter(file => file.endsWith('.md'))
        .forEach(file => Fixture.run(file));
});

describe('Virtual Machine (Async & Wait)', async () => {
    it('should pause execution while awaiting a Promise', async () => {
        const buffer: any[] = [];
        const program       = Compiler
            .compile(`
out("Before async call")
result = runAsyncFunction("foo")
out("After async call")
out(result)
`);

        const vm = new VirtualMachine(program, {
            functions: {
                out:              (...args: any[]) => buffer.push(...args),
                runAsyncFunction: async (name: string) => {
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            resolve(name);
                        }, 1);
                    });
                },
            },
        });

        vm.run();
        expect(buffer).toEqual(['Before async call']);

        await new Promise((resolve) => setTimeout(resolve, 2));
        vm.run();

        expect(buffer).toEqual(['Before async call', 'After async call', 'foo']);
    });
});
