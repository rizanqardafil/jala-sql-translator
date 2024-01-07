function sum(x, y, z) {
    return x + y + z;
}

const numbers = [1, 2, 3];
const accumulation = sum(...numbers);
console.log(accumulation);

// Hasil: 6
