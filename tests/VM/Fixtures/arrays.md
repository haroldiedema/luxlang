# Basic Array Declaration

The VM should be able to declare arrays and output their contents.

```
// Directly.
out([1, 2, 3])

// Via a variable.
arr = [4, 5, 6]
out(arr)
```

## PASS

```json
[
  [1, 2, 3],
  [4, 5, 6]
]
```

---

# Array Element Access

The VM should be able to access individual elements of an array.

```
arr = [10, 20, 30]
out(arr[0])  // Should output 10
out(arr[1])  // Should output 20
out(arr[2])  // Should output 30
```

## PASS

- 10
- 20
- 30

---

# Out of Bounds Access

The VM should raise an error when trying to access an array index that is out of bounds.

```
arr = [1, 2, 3]
out(arr[3])  // This should raise an error
```

## FAIL
```
The index #3 is out of bounds [0] - [2].

Source:
   1| arr = [1, 2, 3]
>> 2| out(arr[3])
```

---

# Nested Arrays

The VM should be able to handle nested arrays and access their elements.

```
nestedArr = [[1, 2], [3, 4], [5, 6]]
out(nestedArr[0][1])  // Should output 2
out(nestedArr[2][0])  // Should output 5
```

## PASS
 
- 2
- 5

---

# Array Length

The VM should be able to determine the length of an array.

```
arr = [7, 8, 9, 10]
out(arr.length)  // Should output 4
out(arr.size)    // Should also output 4
```

## PASS

- 4
- 4

---

# Array Modification

The VM should be able to modify elements of an array.

```
arr = [100, 200, 300]
arr[1] = 250
out(arr)  // Should output [100, 250, 300]
```

## PASS

```json
[[100, 250, 300]]
```

---

# Array Methods: Push & Pop

The VM should support then common array method "pop", which removes and returns the last element of the array.

```
arr = [1, 2, 3]
arr.push(4)

out(arr.size) // Should output 4 (the length)
out(arr.pop()) // Should output 4 (the removed element)
out(arr.size) // Should output 3 (the new length)
out(arr) // Should output [1, 2, 3]
```

## PASS

- 4
- 4
- 3
- 1,2,3

---

# Array Methods: Shift & Unshift

The VM should support the common array methods "shift" and "unshift", which remove and add elements to the start of the array.

```
arr = [2, 3, 4]
arr.unshift(1) // arr is now [1, 2, 3, 4]
out(arr.shift()) // Should output 1 (the removed element)
out(arr) // Should output [2, 3, 4]
```

## PASS

- 1
- 2,3,4

---

# Array Methods: Slice & Splice

The VM should support the common array methods "slice" and "splice".

```
arr = [10, 20, 30, 40, 50]
sliced = arr.slice(1, 4) // Should be [20, 30, 40]
out(sliced)

spliced = arr.splice(2, 2) // Should remove [30, 40] from arr
out(spliced)
out(arr) // Should now be [10, 20, 50]
```

## PASS

- 20,30,40
- 30,40
- 10,20,50

---

# Array Iteration

The VM should be able to iterate over array elements using a loop.

```
arr = [5, 10, 15]
sum = 0

for i in arr:
    sum = sum + i

for (i in arr):
    sum = sum + i

out(sum)  // Should output 60
```

## PASS

- 60

---
