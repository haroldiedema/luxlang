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
const output = `// This file is auto-generated via "scripts/generate.ts". Do not edit directly.
import { ForbiddenKeys }       from './ForbiddenKeys.js';
import { dispatchNative }      from './NativeDispatcher.js';
import { State }               from './State.js';
import { Instruction, Opcode } from '../Compiler/Opcodes.js';
import { Program }             from '../Compiler/Program.js';

/**
 * Handles instruction execution for the VM.
 *
 * This class is auto-generated. Do not edit directly.
 */
export abstract class InstructionSet
{
    protected abstract state: State;
    protected abstract program: Program;
    protected abstract natives: Map<string, Function>;
    protected abstract moduleCache: Record<string, any>;
    protected abstract resolveModule: (moduleName: string) => Program | undefined;
    
    /**
     * Executes instructions until the budget is exhausted or the VM halts.
     *
     * @param {number} budget The maximum number of instructions to execute.
     * @param {number} deltaTime The time elapsed since the last execution (in milliseconds).
     * @returns {boolean} True if the VM has halted, false otherwise.
     */
    protected execute(budget: number, deltaTime: number = 16.6): [number, boolean]
    {
        const state = this.state;

        state.wallTime += deltaTime;

        for (const frame of state.frames) {
            if (frame.sleepTimer > 0) {
                frame.sleepTimer -= deltaTime;
                frame.sleepTimer = Math.max(0, frame.sleepTimer);
            }
        }

        if (state.sleepTime > 0) {
            state.sleepTime -= deltaTime;
            state.sleepTime = Math.max(0, state.sleepTime);
        }

        if (state.isSleeping) {
            return [budget, false];
        }

        while (budget > 0 && ! state.isHalted && ! state.isSleeping && ! state.isAwaitingPromise) {
            budget--;

            // Note: Don't use the cached version of program/instructions here,
            //       as the currentProgram may change due to CALL/CALL_METHOD/IMPORT.
            const instructions = state.currentProgram.instructions;
            if (state.ip >= instructions.length) {
                state.isHalted = true;
                break;
            }

            const instr = instructions[state.ip];
            if (! instr?.op) {
                throw new Error(\`Instruction format invalid: \${JSON.stringify(instr)}\`);
            }

            state.ip++; // Automatic IP Increment (Standard VM behavior)

            switch (instr.op) {
${allOps.map(op => `                case ${op.opcode}: this.__op_${op.funcName}(instr.arg); break;`).join('\n')}
                default:
                    throw new Error(\`Unknown opcode: \${instr.op}\`);
            }
        }

        return [budget, state.isHalted];
    }
    ${allOps.map(op => {
    const processedBody = op.body
        .replace(/state\./g, 'this.state.')
        .replace(/natives\./g, 'this.natives.')
        .replace(/moduleCache/g, 'this.moduleCache')
        .replace(/resolveModule\(/g, 'this.resolveModule(')
        .replace(/\s+program\./g, 'this.program.')
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
