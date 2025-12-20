import {describe, expect, it}           from 'vitest';
import {Compiler, Instruction, Printer} from '../../dist/index.js';

const tests = [
    {
        name: 'Simple Addition & Print',
        src:  `x=1\ny=2\nprint(x + y)`,
        code: [
            '00000000 CONST        1                                  // (1:1)',
            '00000001 STORE        "x"                                // (1:1)',
            '00000002 POP                                             // (1:1)',
            '00000003 CONST        2                                  // (2:1)',
            '00000004 STORE        "y"                                // (2:1)',
            '00000005 POP                                             // (2:1)',
            '00000006 LOAD         "x"                                // (3:7)',
            '00000007 LOAD         "y"                                // (3:11)',
            '00000008 ADD                                             // (3:11)',
            '00000009 CALL         {name: "print", addr: , args: 1}   // (3:11)',
            '00000010 POP                                             // (3:11)',
            '00000011 RET                                             // (3:11)',
        ],
    },
    {
        name: 'Function Declaration & Call',
        src:  `fn add(a, b):\n    return a + b\n\nresult = add(3, 4)\nprint(result)`,
        code: [
            '00000000 JMP          7                                                  ',
            '00000001 STORE        "b"                               ; DECL add(a, b) ',
            '00000002 STORE        "a"                                                ',
            '00000003 LOAD         "a"                                                 // (2:12)',
            '00000004 LOAD         "b"                                                 // (2:16)',
            '00000005 ADD                                                              // (2:16)',
            '00000006 RET                                                              // (2:16)',
            '00000007 CONST        3                                                   // (4:1)',
            '00000008 CONST        4                                                   // (4:1)',
            '00000009 CALL         {name: "add", addr: 1, args: 2}                     // (4:1)',
            '00000010 STORE        "result"                                            // (4:1)',
            '00000011 POP                                                              // (4:1)',
            '00000012 LOAD         "result"                                            // (5:7)',
            '00000013 CALL         {name: "print", addr: , args: 1}                    // (5:7)',
            '00000014 POP                                                              // (5:7)',
            '00000015 RET                                                              // (5:7)',
        ],
    },
    {
        name: 'If Statement',
        src:  `x = 10\nif x > 5:\n    print(x)\nelse:\n    print(0)`,
        code: [
            '00000000 CONST        10                                 // (1:1)',
            '00000001 STORE        "x"                                // (1:1)',
            '00000002 POP                                             // (1:1)',
            '00000003 LOAD         "x"                                // (2:4)',
            '00000004 CONST        5                                  // (2:4)',
            '00000005 GT                                              // (2:4)',
            '00000006 JMP_IF_FALSE 11                                 // (2:4)',
            '00000007 LOAD         "x"                                // (3:11)',
            '00000008 CALL         {name: "print", addr: , args: 1}   // (3:11)',
            '00000009 POP                                             // (3:11)',
            '00000010 JMP          14                                 // (3:11)',
            '00000011 CONST        0                                  // (5:5)',
            '00000012 CALL         {name: "print", addr: , args: 1}   // (5:5)',
            '00000013 POP                                             // (5:5)',
            '00000014 RET                                             // (5:5)',
        ],
    },
    {
        name: 'Array declaration & access',
        src:  `arr = [1, 2, 3]\nprint(arr[1])`,
        code: [
            '00000000 CONST        1                                  // (1:8)',
            '00000001 CONST        2                                  // (1:8)',
            '00000002 CONST        3                                  // (1:8)',
            '00000003 MAKE_ARRAY   3                                  // (1:8)',
            '00000004 STORE        "arr"                              // (1:8)',
            '00000005 POP                                             // (1:8)',
            '00000006 LOAD         "arr"                              // (2:7)',
            '00000007 CONST        1                                  // (2:7)',
            '00000008 GET_PROP     "arr"                              // (2:7)',
            '00000009 CALL         {name: "print", addr: , args: 1}   // (2:7)',
            '00000010 POP                                             // (2:7)',
            '00000011 RET                                             // (2:7)',
        ],
    },
    {
        name: 'Object declaration & property access',
        src:  `obj = {a: 10, b: 20}\nprint(obj["b"])`,
        code: [
            '00000000 CONST        "a"                                // (1:8)',
            '00000001 CONST        10                                 // (1:8)',
            '00000002 CONST        "b"                                // (1:8)',
            '00000003 CONST        20                                 // (1:8)',
            '00000004 MAKE_OBJECT  2                                  // (1:8)',
            '00000005 STORE        "obj"                              // (1:8)',
            '00000006 POP                                             // (1:8)',
            '00000007 LOAD         "obj"                              // (2:7)',
            '00000008 CONST        "b"                                // (2:7)',
            '00000009 GET_PROP     "obj"                              // (2:7)',
            '00000010 CALL         {name: "print", addr: , args: 1}   // (2:7)',
        ],
    },
    {
        name: 'Factorial Function',
        src:  `fn factorial(n):\n    if n <= 1:\n        return 1\n    else:\n        return n * factorial(n - 1)\n\nresult = factorial(5)\nprint(result)`,
        code: [
            '00000000 JMP          18                                                         ',
            '00000001 STORE        "n"                                    ; DECL factorial(n) ',
            '00000002 LOAD         "n"                                                         // (2:8)',
            '00000003 CONST        1                                                           // (2:8)',
            '00000004 LTE                                                                      // (2:8)',
            '00000005 JMP_IF_FALSE 9                                                           // (2:8)',
            '00000006 CONST        1                                                           // (3:9)',
            '00000007 RET                                                                      // (3:9)',
            '00000008 JMP          16                                                          // (3:9)',
            '00000009 LOAD         "n"                                                         // (5:16)',
            '00000010 LOAD         "n"                                                         // (5:30)',
            '00000011 CONST        1                                                           // (5:30)',
            '00000012 SUB                                                                      // (5:30)',
            '00000013 CALL         {name: "factorial", addr: 1, args: 1}                       // (5:30)',
            '00000014 MUL                                                                      // (5:30)',
            '00000015 RET                                                                      // (5:30)',
            '00000016 CONST                                                                    // (5:30)',
            '00000017 RET                                                                      // (5:30)',
            '00000018 CONST        5                                                           // (7:1)',
            '00000019 CALL         {name: "factorial", addr: 1, args: 1}                       // (7:1)',
            '00000020 STORE        "result"                                                    // (7:1)',
            '00000021 POP                                                                      // (7:1)',
            '00000022 LOAD         "result"                                                    // (8:7)',
            '00000023 CALL         {name: "print", addr: , args: 1}                            // (8:7)',
            '00000024 POP                                                                      // (8:7)',
            '00000025 RET                                                                      // (8:7)',
        ],
    },
    {
        name: 'Event Hook',
        src:  `on click(event):\n    print("Clicked!")\n`,
        code: [
            '00000000 JMP          7                                                     ',
            '00000001 STORE        "event"                           ; HOOK click(event) ',
            '00000002 CONST        "Clicked!"                                             // (2:5)',
            '00000003 CALL         {name: "print", addr: , args: 1}                       // (2:5)',
            '00000004 POP                                                                 // (2:5)',
            '00000005 CONST                                                               // (2:5)',
            '00000006 RET                                                                 // (2:5)',
            '00000007 RET                                                                 // (1:1)'
        ],
    }
];

describe('Compiler', () => {
    for (const test of tests) {
        it(`should compile: ${test.name}`, () => {
            const bytecode: Instruction[] = Compiler.compile(test.src).instructions;
            const printed: string[]       = Printer.print(bytecode, {includeComments: true, includePositions: true});
            const actualLines: string[]   = printed.slice(0, test.code.length);

            expect(actualLines).toEqual(test.code);
        });
    }

    it('should put public functions and variables in the program metadata', () => {
        const program = Compiler.compile(`
public x = 10
y = 20

public fn greet(name):
    return "Hello, " + name
    
fn farewell(name):
    return "Goodbye, " + name
`);

        expect(program.exported.functions).toEqual(['greet']);
        expect(program.exported.variables).toEqual(['x']);
    });
});
