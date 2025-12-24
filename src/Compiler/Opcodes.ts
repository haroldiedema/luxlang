import { TokenPosition } from '../Tokenizer/index.js';

export enum Opcode
{
    HALT           = 'HALT',   // Stop execution
    CONST          = 'CONST',  // Push a value onto the stack
    SWAP           = 'SWAP',   // Swap top two values on the stack
    EXPORT         = 'EXPORT', // Mark top of stack for export (2 values: name, value)
    IMPORT         = 'IMPORT', // Import a module (arg: module name)
    WAIT           = 'WAIT',   // Pause execution for X milliseconds (stack: [duration])
    NEW            = 'NEW',    // Stack: [arg1, arg2..., Blueprint] -> Instance
    SUPER          = 'SUPER',  // Invoke parent method ({name: string, args: number})

    // Arithmetic
    ADD            = 'ADD',
    SUB            = 'SUB',
    MUL            = 'MUL',
    DIV            = 'DIV',
    MOD            = 'MOD',
    EXP            = 'EXP',
    NEG            = 'NEG',

    // Comparison
    EQ             = 'EQ',
    NEQ            = 'NEQ',
    GT             = 'GT',
    GTE            = 'GTE',
    LT             = 'LT',
    LTE            = 'LTE',
    IN             = 'IN',

    // Logical
    NOT            = 'NOT',

    // Logic
    JMP            = 'JMP',          // Unconditional Jump
    JMP_IF_FALSE   = 'JMP_IF_FALSE', // Jump if top of stack is false
    JMP_IF_TRUE    = 'JMP_IF_TRUE',   // Jump if top is true (pops value)
    DUP            = 'DUP',           // Duplicate top value (A -> A, A)
    POP            = 'POP',           // Discard top value (A -> )

    // Variables
    LOAD           = 'LOAD',   // Load variable value onto stack
    STORE          = 'STORE',  // Store top of stack into variable

    // Functions
    CALL           = 'CALL',   // { name: string, addr: number, args: number }
    CALL_METHOD    = 'CALL_METHOD', // { name: string, args: number }
    CALL_PARENT    = 'CALL_PARENT', // arg: number of args
    RET            = 'RET',

    // Collections
    MAKE_ARRAY     = 'MAKE_ARRAY',  // Stack: [arg1, arg2...] -> Array
    MAKE_RANGE     = 'MAKE_RANGE',  // Stack: [start, end] -> Range
    MAKE_OBJECT    = 'MAKE_OBJECT', // Stack: [key1, val1...] -> Object
    MAKE_FUNCTION  = 'MAKE_FUNCTION', // { name: string, addr: number, args: number }
    MAKE_BLUEPRINT = 'MAKE_BLUEPRINT', // [ name, startIndex ]
    MAKE_METHOD    = 'MAKE_METHOD', // Stack: [{ ... MAKE_FUNCTION result ... }]

    // Property Access
    GET_PROP       = 'GET_PROP',    // Stack: [Object, Key] -> [Value]
    SET_PROP       = 'SET_PROP',    // Stack: [Object, Key, Value] -> [Value]

    // Iteration
    ITER_INIT      = 'ITER_INIT',   // Stack: [Array] -> [Iterator]
    ITER_NEXT      = 'ITER_NEXT',   // Stack: [Iterator] -> [Value] (or Jump if done)
    ARRAY_PUSH     = 'ARRAY_PUSH',  // Stack: [Array, Value] -> []
}

export interface Instruction
{
    op: Opcode;
    arg?: any;        // The payload (e.g., the number 5, the string "x", or a jump address)
    comment?: string; // Helper for readability when printing ASM
    pos?: TokenPosition;
}
