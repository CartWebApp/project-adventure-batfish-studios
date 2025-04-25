// Limits a number to be between a min and a max
export function clamp(num, min, max) {
    return Math.max(Math.min(num, max), min)
}

// Pauses for a given amount of time (use async function and do "await sleep(ms)")
export function sleep(ms = 0) {
    return new Promise(rs => setTimeout(rs, ms));
}

// pauses for a set time or until a set condition is met
export function cancelableSleep(ms = 0, signal) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(resolve, ms);

        signal?.addEventListener("abort", () => {
            clearTimeout(timeoutId);
            reject(new Error("Sleep aborted"));
        });
    });
}

// returns a random number between 2 numbers, rounded to a given number of decimals
export function random(min, max, places = 0) {
    const randomNum = Math.random() * (max - min) + min
    return Math.floor(randomNum * 10 ** places) / 10 ** places;
}

// halts until element is clicked
export async function awaitClick(element) {
    return new Promise(resolve => {
        element.addEventListener('click', () => {
            resolve();
        }, { once: true });
    });
}

// halts until any element in a list of elements is clicked
export async function awaitClickList(elements) {
    return new Promise(resolve => {
        for (const element of elements) {
            element.addEventListener('click', () => {
                resolve();
            }, { once: true });
        }
    });
}

// waits for an animation to end
export async function awaitAnimation(element) {
    return new Promise(resolve => {
        element.addEventListener('animationend', () => {
            resolve();
        }, { once: true });
    });
}

// copies an object's properties to another object
export function transferProperties(transferFrom, transferTo) {
    for (const key of Object.keys(transferFrom)) {
        const value = transferFrom[key];
        transferTo[key] = value;
    }
}

// checks if a key-value pair exists in an array of objects
// ex: checkPropertyValues([{id: 1}, {id: 2}], 'id', 2) -> true
// ex: checkPropertyValues([{id: 1}, {id: 2}], 'id', 3) -> false
export function checkPropertyValues(array, key, value) {
    for (const object of array) {
        if (object[key] && object[key] === value) {
            return true;
        }
    }
    return false;
}

// gets the value of a root property
export function getRootVar(propertyName) {
    if (window.getComputedStyle(document.documentElement).getPropertyValue('--' + propertyName) != '') {
        document.documentElement.style.setProperty('--' + propertyName, value);
    }
}

// sets the value of a root property
export function setRootVar(propertyName, value) {
    document.documentElement.style.setProperty('--' + propertyName, value);
}

// toggles which is the visible child element of a container (only 1 can be visible)
export function setVisibleChild(activeChild, parent) {
    for (const child of parent.children) {
        if (child != activeChild) {
            child.style.display = 'none';
        }
    }
    activeChild.style.display = '';
}

// deep copies an object
export function deepClone(obj) {
    if (typeof obj !== "object" || obj === null) {
        return obj; // Return primitive values directly
    }

    let copy = Array.isArray(obj) ? [] : {};

    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            copy[key] = deepClone(obj[key]); // Recursively clone nested objects
        }
    }
    return copy;
}