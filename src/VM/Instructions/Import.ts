import { Opcode, Program } from '../../Compiler/index.js';
import { State }           from '../State.js';

/**
 * @opcode Opcode.IMPORT
 */
export function _import(state: State, arg: string, moduleCache: any, resolveModule: any, program: Program): void
{
    if (moduleCache[arg]) {
        const moduleExports = moduleCache[arg];
        state.push(moduleExports);
        return;
    }

    const moduleProgram = resolveModule(arg);
    if (! moduleProgram) {
        throw new Error(`Module not found: ${arg}`);
    }

    if (! moduleProgram || typeof moduleProgram !== 'object') {
        throw new Error(`Invalid module format for: ${arg}`);
    }

    if (typeof moduleProgram.instructions === 'undefined') {
        state.push(moduleProgram);
        return;
    }

    const returnIp      = state.ip;
    const moduleStartIp = program.instructions.length;

    program.instructions.push(...moduleProgram.instructions.map((instr: any) => {
        const newInstr = {...instr};

        if (
            newInstr.op === Opcode.JMP ||
            newInstr.op === Opcode.JMP_IF_TRUE ||
            newInstr.op === Opcode.JMP_IF_FALSE ||
            newInstr.op === Opcode.CALL ||
            newInstr.op === Opcode.ITER_NEXT
        ) {
            if (typeof newInstr.arg === 'number') {
                newInstr.arg += moduleStartIp;
            }
        }

        if (newInstr.op === Opcode.MAKE_FUNCTION) {
            newInstr.arg = {
                ...newInstr.arg,
                addr: newInstr.arg.addr + moduleStartIp,
            };
        }

        return newInstr;
    }));

    state.pushFrame(returnIp, false, true, arg);
    state.ip = moduleStartIp;
}
