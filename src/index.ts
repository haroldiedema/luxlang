export * from './Compiler/index.js';
export * from './Debugger/index.js';
export * from './Parser/index.js';
export * from './Tokenizer/index.js';
export * from './VM/index.js';

// ---
// import { Compiler, Printer } from './Compiler/index.js';
// import { Debugger } from './Debugger/index.js';
// import { Parser }            from './Parser/index.js';
// import { Tokenizer } from './Tokenizer/index.js';
// import { VirtualMachine } from './VM/index.js';
//
// const code = `
// limit = 3
// results = []
//
// while [x for x in 0..limit]:
//     results.push(limit)
//     out("Looping with limit: " + limit)
//     limit = limit - 1
//
// out(results)
// `;
//
// console.log(Tokenizer.tokenize(code).tokens.map(t => `${t.type} "${t.value}"`).join('\n'));
//
// const program = Compiler.compile(code);
// const vm = new VirtualMachine(program, {
//     functions: {
//         out: (...args: any[]) => console.log("[VM OUTPUT]:", ...args),
//     }
// });
//
// Debugger.create(vm);
