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

// halts until element throws a given event
export async function awaitEvent(element, eventName) {
    return new Promise(resolve => {
        element.addEventListener(eventName, () => {
            resolve();
        }, { once: true });
    });
}

// halts until element is clicked
export async function awaitClick(element) {
    return awaitEvent(element, 'click');
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

// checks if a key-value pair exists in an array of objects and attempts to return it
// ex: checkPropertyValues([{id: 1}, {id: 2}], 'id', 2) -> {id: 2}
// ex: checkPropertyValues([{id: 1}, {id: 2}], 'id', 3) -> undefined
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

// toggles which is the visible element of a set of elements (only 1 can be visible)
export function setVisibleElement(activeElement, elementSet) {
    for (const element of elementSet) {
        if (element != activeElement) {
            element.style.display = 'none';
        }
    }
    activeElement.style.display = '';
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

// returns JSON object of the file at the given path
export async function parseJSON(path) {
    return fetch(path).then(res => {
        if (!res.ok) {
            throw new Error(`Error! Status: ${res.status}`);
        }
        return res.json();
    }).catch(error => {
        console.error(`Unable to fetch JSON:`, error);
    })
}

// like indexOf, but based on values and not references
// made for array comparisons
export function looseIndexOf(array, target) {
    for (let i = 0; i < array.length; i++) {
        if (JSON.stringify(array[i]) === JSON.stringify(target)) {
            return i;
        }
    }
}

// generates a random string from a set of characters
export function randomString(charset, length=1) {
    let string = '';
    for (let i = 0; i < length; i++) {
        string += charset[random(0, charset.length)];
    }
    return string;
}

// returns items that are in one array but not in another
// export function findMissing(array1, array2) {
//     f
// }

// returns random items from an array of objects {object, weight} chosen by weight based probability
export function weightedRandom(objectList, {count=1, unique=true}={}) {
    let selections = [];
    for (let i = 0; i < count; i++) {
        if (objectList.length === 0) break;
        let totalWeight = 0;
        for (const object of objectList) {
            totalWeight += object.weight;
        }
        let weightLeft = random(0, totalWeight, 10);
        for (const object of objectList) {
            weightLeft -= object.weight;
            if (weightLeft <= 0) {
                selections.push(object);
                if (unique) {
                    objectList.splice(objectList.indexOf(object),1);
                }
                break;
            }
        }
    }
    return selections;
}

// used for testing random distribution
export function testRandom(iterations, fn, parameters) {
    let overallResult = {};
    for (let i = 0; i < iterations; i++) {
        let result = fn(...parameters);
        if (overallResult[result]) {
            overallResult[result].count += 1
        } else {
            overallResult[result] = {count: 1}
        }
    }
    return overallResult;
}

/**
 * Sorts an array of objects by a property specified by a path array.
 * 
 * @param {Array} array - The array of objects to sort.
 * @param {Array} path - An array representing the path to the property.
 * @param {Boolean} [ascending=true] - Whether to sort in ascending order.
 * @returns {Array} - The sorted array.
 */
export  function sortByPath(array, path, ascending = true) {
    return array.sort((a, b) => {
        const getValue = (obj, path) => path.reduce((acc, key) => acc?.[key], obj);

        const valueA = getValue(a, path);
        const valueB = getValue(b, path);

        if (valueA < valueB) return ascending ? -1 : 1;
        if (valueA > valueB) return ascending ? 1 : -1;
        return 0;
    });
}