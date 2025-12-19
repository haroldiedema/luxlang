import fs   from 'node:fs';
import path from 'node:path';

const baseDir    = import.meta.dirname;
const opsDir     = path.join(baseDir, '../src/VM/Instructions');
const outputFile = path.join(baseDir, '../src/VM/InstructionSet.ts');

interface OpDefinition
{
    opcode: string; // e.g. "Opcode.ADD" or "0x01"
    funcName: string;
    body: string;
}

function parseFile(content: string): OpDefinition[]
{
    const results: OpDefinition[] = [];

    // Regex to find the start of a function and its JSDoc
    // Matches: /** ... @opcode VALUE ... */ export function NAME
    const headerRegex = /\/\*\*[\s\S]*?@opcode\s+([^\s\*]+)[\s\S]*?\*\/\s*export\s+function\s+(\w+)\s*\([^)]*\)\s*:\s*void\s*\{/g;

    let match;
    while ((match = headerRegex.exec(content)) !== null) {
        const opcode     = match[1];      // Capture Group 1: The Opcode Value
        const funcName   = match[2];    // Capture Group 2: The Function Name
        const startIndex = headerRegex.lastIndex; // Where the body starts (after '{')

        // --- Robust Body Extraction (Nested Braces) ---
        let braceCount   = 1; // We passed the first '{'
        let currentIndex = startIndex;

        while (braceCount > 0 && currentIndex < content.length) {
            const char = content[currentIndex];
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
            currentIndex++;
        }

        // Extract body (excluding the final '}')
        const body = content.substring(startIndex, currentIndex - 1).trim();

        results.push({opcode, funcName, body});
    }

    return results;
}

// --- Main Execution ---

let allOps: OpDefinition[] = [];

// 1. Scan Files
if (fs.existsSync(opsDir)) {
    fs.readdirSync(opsDir).forEach(file => {
        if (!file.endsWith('.ts')) return;
        const content = fs.readFileSync(path.join(opsDir, file), 'utf-8');
        allOps        = allOps.concat(parseFile(content));
    });
}

// 2. Generate Class
const output = `
import { ForbiddenKeys }  from './ForbiddenKeys.js';
import { dispatchNative } from './NativeDispatcher.js';
import { State }          from './State.js';
import { Opcode }         from '../Compiler/Opcodes.js';

/**
 * Handles instruction execution for the VM.
 *
 * This class is auto-generated. Do not edit directly.
 */
export abstract class InstructionSet
{
    protected abstract state: State;
    protected abstract instructions: any[];
    protected abstract natives: Map<string, Function>;

    /**
     * Executes instructions until the budget is exhausted or the VM halts.
     *
     * @param {number} budget The maximum number of instructions to execute.
     * @returns {boolean} True if the VM has halted, false otherwise.
     */
    public execute(budget: number): boolean
    {
        const state = this.state;
        const instructions = this.instructions;

        while (budget > 0 && !state.isHalted) {
            const instr = instructions[state.ip];
            state.ip++; // Automatic IP Increment (Standard VM behavior)

            switch (instr.op) {
${allOps.map(op => `                case ${op.opcode}: this.__op_${op.funcName}(instr.arg); break;`).join('\n')}
            }

            budget--;
        }

        return state.isHalted;
    }
    ${allOps.map(op => {
    const processedBody = op.body
        .replace(/state\./g, 'this.state.')
        .replace(/natives\./g, 'this.natives.')
        .trim()
        .replace(/\n/g, '\n    ');

    return `
    protected __op_${op.funcName}(arg: any): void
    {
        ${processedBody}
    }`;
}).join('\n')}
}
`;

fs.writeFileSync(outputFile, output);
console.log(`Successfully generated VM with ${allOps.length} opcodes.`);
