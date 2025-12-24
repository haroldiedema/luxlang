export * from './Compiler/index.js';
export * from './Debugger/index.js';
export * from './Parser/index.js';
export * from './Tokenizer/index.js';
export * from './VM/index.js';

// // ---
// //
// import { Compiler, Printer } from './Compiler/index.js';
// import { Debugger } from './Debugger/index.js';
// import { Parser }            from './Parser/index.js';
// import { Tokenizer } from './Tokenizer/index.js';
// import { VirtualMachine } from './VM/index.js';
//
// const code = `
// blueprint Player(name):
//     name: name
//     hp: 100
//
//     fn greet():
//         return "Hi, I am " + this.name
//
//     fn take_damage(amount):
//         this.hp = this.hp - amount
//
// p1 = new Player("Alice")
// p2 = new Player("Bob")
//
// out(p1.name)           // "Alice"
// out(p2.name)           // "Bob"
//
// p1.name = "Charlie"
// out(p1.name)           // "Charlie"
// out(p2.name)           // "Bob"
//
// out(p1.greet())        // "Hi, I am Charlie"
// out(p2.greet())        // "Hi, I am Bob"
//
// p1.take_damage(10)
// out(p1.hp)             // 90
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

// Debugger.create(vm);

// vm.run();
