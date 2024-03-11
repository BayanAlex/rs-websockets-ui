export function random(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function delay(delay: number) {
    return new Promise((resolve) => setTimeout(resolve, delay));
}
