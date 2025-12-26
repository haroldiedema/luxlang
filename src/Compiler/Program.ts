import { Instruction } from './Opcodes.js';

export type Program = {
    hash: string;
    source: string;
    moduleName?: string;
    instructions: Instruction[];
    references: {
        functions: Record<string, CallableAddress>;
        events: Record<string, CallableAddress>;
    };
    exported: {
        functions: string[];
        variables: string[];
    };
}

export type CallableAddress = {
    address: number;
    numArgs: number;
}
