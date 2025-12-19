import {Instruction} from './Opcodes.js';

export class Printer
{
    public static print(bytecode: Instruction[], options: PrintOptions = {}): string[]
    {
        const formatted: any[] = [];

        let longestOpcode: number  = 0,
            longestArgs: number    = 0,
            longestComment: number = 0;

        for (let addr: number = 0; addr < bytecode.length; addr++) {
            const instr: Instruction = bytecode[addr];
            const address: string    = addr.toString().padStart(8, '0');
            const args: string       = Printer.convertArgs(instr.arg);
            const opcode: string     = instr.op.padEnd(12, ' ');
            const comment: string    = instr.comment ? ` ; ${instr.comment}` : '';
            const position: string   = instr.pos ? ` // (${instr.pos.lineStart}:${instr.pos.columnStart})` : '';

            longestOpcode = Math.max(longestOpcode, opcode.length);
            longestArgs   = Math.max(longestArgs, args.length);
            longestComment= Math.max(longestComment, comment.length);

            formatted.push({instr, address, args, opcode, comment, position});
        }

        const result: string[] = [];

        for (const item of formatted) {
            let line = `${item.address} ${item.opcode.padEnd(longestOpcode, ' ')} ${item.args.padEnd(longestArgs, ' ')}`;
            if (options.includeComments) {
                line += ' ' + item.comment.padEnd(longestComment, ' ');
            }
            if (options.includePositions) {
                line += ' ' + item.position;
            }
            result.push(line);
        }

        return result;
    }

    private static convertArgs(arg: any): string
    {
        if (arg === null || arg === undefined) return '';

        if (Array.isArray(arg)) {
            const result: string[] = [];
            for (const item of arg) {
                result.push(this.convertArgs(item));
            }
            return `[${result.join(', ')}]`;
        }

        if (typeof arg === 'object') {
            const result: string[] = [];
            for (const key in arg) {
                result.push(`${key}: ${this.convertArgs(arg[key])}`);
            }
            return `{${result.join(', ')}}`;
        }

        return JSON.stringify(arg);
    }
}

type PrintOptions = {
    includeComments?: boolean;
    includePositions?: boolean;
}
