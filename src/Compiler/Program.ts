import { Instruction } from './Opcodes.js';

export type Program = {
    instructions: Instruction[];
    metadata: {
        functions: Record<string, FunctionAddress>;
        events: Record<string, FunctionAddress>;
    };
}

export type FunctionAddress = {
    address: number;
    numArgs: number;
}
