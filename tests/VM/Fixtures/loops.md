# Simple for loop

The range operator (`..`) creates a sequence of numbers from the start value to
the end value (exclusive). This can be used in a `for` loop to iterate over a
range of numbers.

```
for i in 0..5:
    out(i)
```

## PASS

```json
[0, 1, 2, 3, 4]
```

---

# Iterate over items in a list

You can iterate directly over the items in a list using a `for` loop.

```
my_list = [10, 20, 30, 40, 50]

for item in my_list:
    out(item)
    
for item in my_list.reverse():
    out(item)
```

## PASS

```json
[
  10, 20, 30, 40, 50,
  50, 40, 30, 20, 10
]
```

---

# Iterate over list via range

You can also use the range operator to iterate over the indices of a list.

```
my_list = [10, 20, 30, 40, 50]

for i in 0..my_list.size:
    out(my_list[i])
```

## PASS

```json
[10, 20, 30, 40, 50]
```

# Expressions in loop range

You can use expressions in the range of a loop.

```
my_list = [10, 20, 30, 40, 50]

for i in (0..my_list.size).reverse():
    out(my_list[i])
    
for i in (1 + 1)..(3 + 3):
    out(i * 10)
```

## PASS

```json
[
  50, 40, 30, 20, 10,
  20, 30, 40, 50
]
```

---

# Respecting instruction budget in large loops

> - budget: 100

This test ensures that large loops respect the instruction budget and do not
cause freezes. In this test, we simply count to 10,000 and output the count
each time. Because of the instruction budget of 100, the VM should yield control
back to the host during execution.

When the VM runs again, it will simply continue where it left off.

```
count = 0
for i in 0..10000:
    count = count + 1
    out(count)
```

## PASS

```json
[1,2,3,4,5,6,7]
```

---

# While-loop

A `while` loop continues to execute as long as its condition evaluates to true.

```
count = 0
while count < 5:
    out(count)
    count = count + 1
```

## PASS

```json
[0, 1, 2, 3, 4]
```

---

# Do-while loop

A `do-while` loop executes its body at least once before checking the condition.

```
count = 0
do:
    out(count)
    count = count + 1
while count < 5
```

## PASS

```json
[0, 1, 2, 3, 4]
```

# Array Comprehension While-Loop

This test serves as a "Chaos Test" that combines several features: while-loops,
array comprehensions, external variable manipulation, and truthy/falsy evaluation.

This test uses an array comprehension as the while condition. The loop
continues as long as the comprehension produces a non-empty array. We use an
external variable limit to eventually force the comprehension to return an
empty array [], which is falsy.

```
limit = 3
results = []

// The loop condition is an expression that evaluates to an array.
// [x for x in range(limit)] will be [0, 1, 2], then [0, 1], then [0], then []
while [x for x in 0..limit]:
    results.push(limit)
    limit = limit - 1

out(results)
```

## PASS

```json
[[3, 2, 1]]
```

---
