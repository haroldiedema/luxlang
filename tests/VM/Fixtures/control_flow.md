# Basic If

The VM should execute the block inside an `if` statement only when the condition is true.

```
if true:
    out("Executed")

if false:
    out("Skipped")

out("Done")
```

## PASS

- Executed
- Done

---

# If-Else

The VM should execute the `else` block when the condition is false, and skip it when true.

```
if true:
    out("If Block")
else:
    out("Else Block")

if false:
    out("If Block 2")
else:
    out("Else Block 2")
```

## PASS

- If Block
- Else Block 2

---

# Nested Ifs

The VM should correctly handle nested scope and jumps.

```
if true:
    out("Level 1")
    if true:
        out("Level 2")
    
    if false:
        out("Skipped")
    else:
        out("Level 2 Else")
```

## PASS

- Level 1
- Level 2
- Level 2 Else

---

# Dynamic Conditions

The VM should evaluate expressions inside the if-condition.

```
x = 10
y = 20

if x < y:
    out("x is smaller")

if x * 2 == y:
    out("math works")
```

## PASS

- x is smaller
- math works

---

# Truthiness

```
if 1 == 1:
    out("True Expression")

if 1 != 1:
    out("False Expression")
    
if true:
    out("Also True")
```

## PASS

- True Expression
- Also True

---

# If ... in String

The VM should evaluate conditions involving string containment.

```
if "cat" in "concatenate":
    out("Found cat")
    
if "dog" in "concatenate":
    out("Found dog")
```

## PASS

- Found cat

---

# If ... in Array

The VM should evaluate conditions involving array containment.

```
if 2 in [1, 2, 3]:
    out("Found 2")
    
if 5 in [1, 2, 3]:
    out("Found 5")
```

## PASS

- Found 2

---

# If ... in Object

The VM should evaluate conditions involving object key containment.

```
player = {
    name: "Alice",
    score: 100
}

if "name" in player:
    out("Player has a name")
    
if "level" in player:
    out("Player has a level")

// Test the inverse case (!)
if !("level" in player):
    out("Player has no level")
    
// Test the "not" keyword
if "specialization" not in player:
    out("Player has no specialization")
```

## PASS

- Player has a name
- Player has no level
- Player has no specialization

---

# Basic For Loop

The VM should iterate over a collection (assuming your language supports array/range iteration) or perform a basic count.

```
for i in [1, 2, 3]:
    out(i)
```

## PASS

- 1
- 2
- 3

---

# Loop Scope

The iterator variable `i` should be accessible inside the loop.

```
x = 0
for i in [10, 20, 30]:
    x = x + i
out(x)
```

## PASS

- 60

# Shadowing Loop Variable

The loop iterator variable should shadow any variable of the same name in the outer scope.

```
i = 100
for i in [1, 2, 3]:
    out(i)
out(i)
```

## PASS
- 1
- 2
- 3
- 100

---

# Nested Loops

The VM should handle multiple nested loops without mixing up the instruction pointers or stack frames.

```
for i in [1, 2]:
    for j in [1, 2]:
        out(i * 10 + j)

```

## PASS

- 11
- 12
- 21
- 22

---

# Break Statement

The `break` keyword should immediately exit the nearest enclosing loop.

```
for i in [1, 2, 3, 4, 5]:
    if i == 3:
        break
    out(i)
out("Done")
```

## PASS

- 1
- 2
- Done

---

# Nested Break Statement

The `break` keyword should only exit the nearest enclosing loop, not all loops.

```
for i in [1, 2]:
    for j in [1, 2, 3]:
        if j == 3:
            break
        out(i * 10 + j)     
```

## PASS

- 11
- 12
- 21
- 22

---

# Continue Statement

The `continue` keyword should skip the rest of the current iteration and jump to the next one.

``` 
for i in [1, 2, 3, 4]:
    if i == 2:
        continue
    out(i)
```

## PASS

- 1
- 3
- 4

---

# Nested Continue Statement

The `continue` keyword should only affect the nearest enclosing loop.

```
for i in [1, 2]:
    for j in [1, 2, 3]:
        if j == 2:
            continue
        out(i * 10 + j)
```

## PASS

- 11
- 13
- 21
- 23
