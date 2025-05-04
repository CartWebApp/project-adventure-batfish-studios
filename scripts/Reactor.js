import { sleep, awaitAnimation } from './Functions.js';


export class Reactor {
    constructor(value) {
        this._value = value;
        this._subscribers = new Set();
    }

    // the get and set run when the property is called like reactor.value = 7 or reactor.value
    get value() {
        return this._value;
    }

    // sets the values and runs each subscriber function
    set value(newVal) {
        let oldValue = this._value;
        this._value = newVal;
        for (const subscriberFunc of this._subscribers) {
            subscriberFunc(newVal, oldValue)
        }
    }

    // adds a function to be run every time the value gets changed
    subscribe(func) {
        this._subscribers.add(func);
        func(this._value);
    }

    //binds this to a DOM element via querySelector
    bindQuery(query, animation, attribute='textContent') {
        this.subscribe(async ()=> {
            let element = document.querySelector(query);
            element[attribute] = this.value;
            if (animation) {
                element.style.animation = '';
                await sleep(0);
                element.style.animation = animation;
                await awaitAnimation(element);
                element.style.animation = '';
            }
        })
    }

    //binds this to a DOM element directly
    bindElement(element, attribute='textContent') {
        this.subscribe(()=> {
            element[attribute] = this.value;
        })
    }
}