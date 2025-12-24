import fs                                      from 'node:fs';
import path                                    from 'node:path';
import { describe, expect, it }                from 'vitest';
import { Compiler, VirtualMachine }            from '../dist/index.js';
import type { Program, VirtualMachineOptions } from '../dist/index.js';

export class Fixture
{
    /**
     * Loads a fixture from a file.
     *
     * @param fixtureFile
     */
    static run(fixtureFile: string): void
    {
        let title = path
            .basename(fixtureFile, '.md')
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());

        describe(title, () => {
            const fixtures = FixtureParser.parse(fixtureFile);

            for (const fixtureInfo of fixtures) {
                new Fixture(fixtureFile, fixtureInfo).run();
            }
        });
    }

    static load(fixtureFile: string): Fixture[]
    {
        const fixtures: Fixture[]         = [];
        const fixtureInfos: FixtureInfo[] = FixtureParser.parse(fixtureFile);

        for (const fixtureInfo of fixtureInfos) {
            fixtures.push(new Fixture(fixtureFile, fixtureInfo));
        }

        return fixtures;
    }

    public readonly title: string;
    public readonly code: string;
    public readonly modules: Record<string, Program>;
    public readonly passText: string | null;
    public readonly passJson: any;
    public readonly fail: string | null;

    private readonly options: Record<string, any>;
    private readonly output: any[] = [];
    private readonly filename: String;

    private constructor(
        filename: string,
        file: FixtureInfo,
    )
    {
        this.filename = filename;
        this.title    = file.title ?? path.basename(file.title);
        this.code     = file.code ?? '';
        this.passText = file.passText ?? null;
        this.passJson = file.passJson ?? null;
        this.fail     = file.fail ?? null;
        this.options  = file.options ?? {};
        this.modules  = {};

        for (const [name, code] of Object.entries(file.modules)) {
            this.modules[name] = Compiler.compile(code);
        }
    }

    public run(): void
    {
        it(this.title, () => {
            const vm = this.createVirtualMachine();

            if (this.fail && (this.passText || this.passJson)) {
                throw new Error(`Fixture cannot have both FAIL and PASS expectations: ${this.filename}`);
            }

            const msg = `\nFixture: ${this.filename}\nTest: ${this.title}\n`;

            if (this.fail) {
                expect(() => vm.run(), msg).toThrow(this.fail);
                return;
            }

            if (this.passText) {
                vm.run();
                expect(this.output.join('\n'), msg).toEqual(this.passText);
                return;
            }

            if (this.passJson) {
                vm.run();
                expect(this.output, msg).toEqual(this.passJson);
                return;
            }

            throw new Error(`No PASS or FAIL expectation defined in fixture: ${this.filename}`);
        });
    }

    public createVirtualMachine(options: VirtualMachineOptions = {}): VirtualMachine
    {
        return new VirtualMachine(Compiler.compile(this.code), {
            throwOnError:  true,
            budget:        100_000_000,
            colors:        false,
            resolveModule: (name: string) => {
                return this.modules[name] ?? undefined;
            },
            functions:     {
                'out': (...args: any[]) => {
                    this.output.push(...args);
                },
            },
            ...options,
            ...this.options,
        });
    }
}

class FixtureParser
{
    public static parse(filename: string): FixtureInfo[]
    {
        return new FixtureParser(
            filename,
            fs.readFileSync(filename, {encoding: 'utf-8'})
                .replace(/\r\n/g, '\n')
                .split('\n'),
        ).parse();
    }

    private readonly filename: string;
    private readonly lines: string[];

    private lineIndex: number      = 0;
    private tokens: FixtureToken[] = [];

    constructor(
        filename: string,
        lines: string[],
    )
    {
        this.filename = filename;
        this.lines    = lines;
    }

    private parse(): FixtureInfo[]
    {
        this.tokenize();
        const fixtures: FixtureInfo[] = [];

        let currentFixture: FixtureInfo = {
            title:    '',
            code:     '',
            modules:  {},
            passText: null,
            passJson: null,
            fail:     null,
            options:  {},
        };

        while (this.tokens.length > 0) {
            const token = this.tokens.shift();
            if (! token) {
                break;
            }

            if (token.type === 'header' && token.level === 1) {
                if (currentFixture.code !== '') {
                    fixtures.push(currentFixture);
                    currentFixture = {
                        title:    '',
                        code:     '',
                        modules:  {},
                        passText: null,
                        passJson: null,
                        fail:     null,
                        options:  {},
                    };
                }

                currentFixture.title = token.content;

                // Skip text content after title.
                if (this.tokens.length > 0 && this.tokens[0].type === 'text') {
                    this.tokens.shift();
                }

                continue;
            }

            if (token.type === 'text') {
                continue; // Ignore stray text tokens.
            }

            if (token.type === 'blockquote') {
                if (currentFixture.title === '') {
                    throw new Error(`VM options found before title header in fixture: ${this.filename}`);
                }

                currentFixture.options = {...currentFixture.options, ...token.content};
                continue;
            }

            if (token.type === 'code') {
                if (currentFixture.title === '') {
                    throw new Error(`Code block found before title header in fixture: ${this.filename}`);
                }

                if (currentFixture.code === '') {
                    currentFixture.code = token.content;
                } else {
                    throw new Error(`Multiple code blocks found under header "${currentFixture.title}" in fixture: ${this.filename}`);
                }
                continue;
            }

            if (token.type === 'header' && token.level === 2) {
                if (currentFixture.title === '') {
                    throw new Error(`Section header found before title header in fixture: ${this.filename}`);
                }

                const section = token.content.toLowerCase();

                if (section === 'pass') {
                    const nextToken = this.tokens.shift();
                    if (! nextToken) {
                        throw new Error('Expected content after PASS header.');
                    }

                    if (nextToken.type === 'text') {
                        // Remove leading "-" from the text content.
                        currentFixture.passText = nextToken.content
                            .split('\n')
                            .map((line: string) => line.replace(/^\s*-\s*/, ''))
                            .join('\n');
                        continue;
                    }

                    if (nextToken.type === 'code') {
                        try {
                            currentFixture.passJson = JSON.parse(nextToken.content);
                            continue;
                        } catch (e) {
                            currentFixture.passText = nextToken.content;
                            continue;
                        }
                    }

                    continue;
                }
                if (section === 'fail') {
                    const nextToken = this.tokens.shift();
                    if (! nextToken || (nextToken.type !== 'text' && nextToken.type !== 'code')) {
                        throw new Error('Expected text content after FAIL header.');
                    }
                    currentFixture.fail = nextToken.content;
                    continue;
                }

                // Module section
                if (section.startsWith('module:')) {
                    const nextToken = this.tokens.shift();
                    if (! nextToken || nextToken.type !== 'code') {
                        throw new Error(`Expected code block after module header: ${token.content}`);
                    }
                    currentFixture.modules[token.content.slice(7).trim()] = nextToken.content;
                    continue;
                }

                throw new Error(`Unknown section header: ${token.content}`);
            }

            throw new Error(`Unexpected token type: ${token.type}`);
        }

        if (currentFixture.code !== '') {
            fixtures.push(currentFixture);
        }

        return fixtures;
    }

    private tokenize(): void
    {
        while (this.lineIndex < this.lines.length) {
            const line = this.lines[this.lineIndex];

            if (line.trim() === '---') {
                this.lineIndex++;
                continue;
            }

            if (line.startsWith('# ')) {
                this.tokens.push({
                    type:    'header',
                    level:   1,
                    content: line.slice(2).trim(),
                });
                this.lineIndex++;
                continue;
            }

            if (line.startsWith('## ')) {
                this.tokens.push({
                    type:    'header',
                    level:   2,
                    content: line.slice(3).trim(),
                });
                this.lineIndex++;
                continue;
            }

            if (line.startsWith('> - ')) {
                let buffer: string[] = [];
                while (this.lineIndex < this.lines.length && this.lines[this.lineIndex].startsWith('> - ')) {
                    buffer.push(this.lines[this.lineIndex].slice(4));
                    this.lineIndex++;
                }

                // Parse blockquote content into options object.
                const options: Record<string, any> = {};

                for (const [key, value] of buffer.map(line => line.split(':').map(part => part.trim()))) {
                    try {
                        options[key] = JSON.parse(value);
                    } catch {
                        options[key] = value.trim();
                    }
                }

                this.tokens.push({
                    type:    'blockquote',
                    content: options,
                });
                continue;
            }

            if (line.startsWith('```')) {
                this.lineIndex++;

                const codeLines: string[] = [];
                while (this.lineIndex < this.lines.length && ! this.lines[this.lineIndex].startsWith('```')) {
                    codeLines.push(this.lines[this.lineIndex]);
                    this.lineIndex++;
                }

                this.lineIndex++;

                this.tokens.push({
                    type:    'code',
                    content: this.stripCodeFences(codeLines.join('\n')),
                });
                continue;
            }

            // Plain text
            const textLines: string[] = [];
            while (this.lineIndex < this.lines.length
                && ! this.lines[this.lineIndex].startsWith('#')
                && ! this.lines[this.lineIndex].startsWith('```')
                && ! this.lines[this.lineIndex].startsWith('> ')
                && ! this.lines[this.lineIndex].startsWith('---')
                ) {
                textLines.push(this.lines[this.lineIndex]);
                this.lineIndex++;
            }

            if (textLines.length > 0) {
                this.tokens.push({
                    type:    'text',
                    content: textLines.join('\n').trim(),
                });
            }
        }

        // Filter blank text tokens.
        this.tokens = this.tokens.filter(token => ! (token.type === 'text' && token.content === ''));
    }

    private stripCodeFences(content: string): string
    {
        return content
            .replace(/```\w*\n/, '')
            .replace(/```\n?$/, '');
    }
}

type FixtureToken = {
    type: 'header' | 'code' | 'text' | 'blockquote';
    level?: number;
    content: any;
}

type FixtureInfo = {
    /**
     * The title of the test fixture.
     *
     * Parsed from the H1 markdown header (# Title) at the beginning of the file.
     */
    title: string;

    /**
     * The main code block.
     *
     * Parsed from the first code fence block in the file.
     */
    code: string;

    /**
     * Additional modules defined in the fixture.
     *
     * Parsed from code fence blocks labeled with the module name using the syntax:
     * (Markdown H2 header) ## module_name followed by a code fence block.
     */
    modules: Record<string, string>;

    /**
     * The expected output when the test passes.
     *
     * Parsed from the "Pass" section in the fixture file. The PASS header is
     * expected to be written as a Markdown H2 header (## PASS), followed by
     * either a code fence block (JSON) or plain text.
     */
    passText: string | null;

    /**
     * The expected output when the test passes, parsed as JSON.
     *
     * Parsed from the "Pass" section in the fixture file. The PASS header is
     * expected to be written as a Markdown H2 header (## PASS), followed by
     * either a code fence block (JSON) or plain text.
     */
    passJson: any;

    /**
     * The expected error message when the test fails.
     *
     * Parsed from the "Fail" section in the fixture file. The FAIL header is
     * expected to be written as a Markdown H2 header (## FAIL), followed by
     * plain text.
     */
    fail: string | null;

    /**
     * Additional options for the Virtual Machine.
     *
     * Parsed from blockquotes in the fixture file, for example:
     * ```
     * > optionName: optionValue
     * > anotherOption: anotherValue
     * ```
     */
    options: Record<string, any>;
}
