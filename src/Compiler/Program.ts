import { Instruction } from './Opcodes.js';

export type Program = {
    source: string;
    moduleName?: string;
    instructions: Instruction[];
    references: {
        functions: Record<string, FunctionAddress>;
        events: Record<string, FunctionAddress>;
    };
    exported: {
        functions: string[];
        variables: string[];
    }
}

export type FunctionAddress = {
    address: number;
    numArgs: number;
}
