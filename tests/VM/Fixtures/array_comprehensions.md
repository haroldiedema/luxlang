# Array Comprehensions

The VM should support array comprehensions to create new arrays based on existing ones.

```
arr = [1, 2, 3, 4, 5]
squared = [x * x for x in arr]
out(squared)  // Should output [1, 4, 9, 16, 25]
```

## PASS

```json
[[1, 4, 9, 16, 25]]
```

---

# Array Comprehensions - Empty Source

Iterating over an empty array should result in an empty array and not crash.

```
empty = []
result = [x * 10 for x in empty]
out(result)
```

## PASS

```json
[[]]
```

# Array Comprehensions - Scope Shadowing

The iterator variable inside the comprehension should not modify a variable with the same name in the outer scope.

```
x = 999
result = [x for x in [1, 2, 3]]
out(result)
out(x)
```

## PASS

```json
[[1, 2, 3], 999]
```

# Array Comprehensions - External Variables

The expression inside the comprehension should be able to access variables defined outside the loop (closure/scope capture).

```
factor = 10
offset = 5
nums = [1, 2, 3]
result = [(n * factor) + offset for n in nums]
out(result)
```

## PASS

```json
[[15, 25, 35]]
```

# Array Comprehensions - String Manipulation

Verify that comprehensions work correctly with string types and concatenation.

```
names = ["alice", "bob", "charlie"]
greetings = ["Hello, " + name + "!" for name in names]
out(greetings)
```

## PASS

```json
[["Hello, alice!", "Hello, bob!", "Hello, charlie!"]]
```

# Array Comprehensions - Nested Logic

Verify that the expression can contain complex logic or function calls (assuming a `len` or similar function exists, otherwise math).

```
matrix = [[1, 2], [3, 4], [5, 6]]
// Extract the first element of each sub-array
firsts = [row[0] for row in matrix]
out(firsts)
```

## PASS

```json
[[1, 3, 5]]
```
