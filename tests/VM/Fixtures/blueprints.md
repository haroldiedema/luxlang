# Basic Blueprint

A blueprint is similar to a "class" in other programming languages. It serves as a template for creating objects with
predefined properties and methods.

```
blueprint Player(name):
    name: name
    hp: 100

    fn greet():
        return "Hi, I am " + this.name

    fn take_damage(amount):
        this.hp = this.hp - amount

p1 = new Player("Alice")
p2 = new Player("Bob")

out(p1.name)           // "Alice"
out(p2.name)           // "Bob"

p1.name = "Charlie"
out(p1.name)           // "Charlie"
out(p2.name)           // "Bob"

out(p1.greet())        // "Hi, I am Charlie"
out(p2.greet())        // "Hi, I am Bob"

p1.take_damage(10)
out(p1.hp)             // 90
```

## PASS

- Alice
- Bob
- Charlie
- Bob
- Hi, I am Charlie
- Hi, I am Bob
- 90
