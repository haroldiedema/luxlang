import fs                                                           from 'node:fs';
import * as path                                                    from 'node:path';
import { Compiler, Program, VirtualMachine, VirtualMachineOptions } from '../dist/index.js';

type FixtureVM = {
    title: string,
    vm: TestVirtualMachine,
    pass: any[],
    fail: string,
}

export function createFixtureVM(fixtureFile: string): FixtureVM
{
    const fixture = parseFixtureFile(fixtureFile);

    return {
        title: fixture.title,
        pass:  fixture.pass ? JSON.parse(fixture.pass) : [],
        fail:  fixture.fail ? fixture.fail.trim() : '',
        vm:    createVirtualMachine({
            code:    fixture.code,
            modules: fixture.modules,
            budget:  100_000_000,
        }),
    };
}

/**
 * Creates a new VirtualMachine instance for testing purposes.
 *
 * @param {CreateVMOptions} options
 * @returns {TestVirtualMachine}
 */
export function createVirtualMachine(options: CreateVMOptions): TestVirtualMachine
{
    const moduleCache: Record<string, Program> = {};
    if (options.modules) {
        for (const [name, code] of Object.entries(options.modules)) {
            moduleCache[name] = Compiler.compile(code, name);
        }
    }

    return new TestVirtualMachine(Compiler.compile(options.code), {
        throwOnError:  options.throwOnError ?? true,
        budget:        options.budget ?? 100000,
        colors:        false,
        resolveModule: (name: string) => {
            if (moduleCache[name]) {
                return moduleCache[name];
            }
        },
    });
}

export class TestVirtualMachine extends VirtualMachine
{
    public output: any[] = [];

    constructor(program: Program, options: VirtualMachineOptions)
    {
        if (! options.functions) {
            options.functions = {};
        }

        options.functions['out'] = (...args: any[]) => {
            this.output.push(...args);
        };

        super(program, options);
    }
}

export interface CreateVMOptions
{
    code: string;
    modules?: Record<string, string>;
    budget?: number;
    throwOnError?: boolean;
}

function parseFixtureFile(file: string): any
{
    const lines: string[] = fs.readFileSync(file, 'utf-8').replace(/\r\n/g, '\n').split('\n');
    const result: any     = {
        title:   '',
        code:    '',
        modules: {},
        pass:    null,
        fail:    null,
    };

    if (lines[0].startsWith('# ')) {
        result.title = lines[0].slice(2).trim();
        lines.shift();
    } else {
        result.title = `Untitled Test: ${path.basename(file)}`;
    }

    let target: any      = result;
    let key: string      = 'code';
    let buffer: string[] = [];

    for (const line of lines) {
        if (line.startsWith('---')) {
            if (target && buffer.length > 0) {
                target[key] = buffer.join('\n');
            }

            target = line.slice(3).trim().replace(/-+/g, '').trim();

            if (target.toLowerCase().startsWith('module:')) {
                key    = target.slice(7).trim();
                target = result['modules'];
            } else {
                key    = target.toLowerCase() || 'code';
                target = result;
            }
            buffer = [];
        } else {
            if (buffer.length === 0 && line.trim() === '') {
                continue;
            }
            buffer.push(line);
        }
    }

    if (target && buffer.length > 0) {
        target[key] = buffer.join('\n');
    }

    return result;
}
