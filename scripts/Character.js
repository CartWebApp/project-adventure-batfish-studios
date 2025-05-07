import * as fnExports from './Functions.js';
import { Reactor } from './Reactor.js';
Object.entries(fnExports).forEach(([name, exported]) => window[name] = exported);



// generic character class
export class Character {

    /**
     * @typedef {Object} CharacterConfig
     * @prop {String} name 
     * @prop {*} hp 
     * @prop {*} strength 
     * @prop {*} agility 
     * @prop {*} desc 
     * 
     * @param {CharacterConfig} options
     */

    constructor(options={}) {
        let defaults = {
            name:'Default Character', hp:100, strength:10, agility:10, desc:''
        }
        options = Object.assign(defaults, options);
        this.name = options.name;
        this._maxHP = new Reactor(options.hp);
        this._hp = new Reactor(this._maxHP.value);
        this._strength = new Reactor(options.strength);
        this._agility = new Reactor(options.agility);
        this._desc = new Reactor(options.desc);
    }

    // creates getters and setters
    get maxHP() { return this._maxHP.value; }
    set maxHP(newValue) { this._maxHP.value = newValue; }
    get hp() { return this._hp.value; }
    set hp(newValue) { this._hp.value = newValue; }
    get strength() { return this._strength.value; }
    set strength(newValue) { this._strength.value = newValue; }
    get agility() { return this._agility.value; }
    set agility(newValue) { this._agility.value = newValue; }
    get desc() { return this._desc.value; }
    set desc(newValue) { this._desc.value = newValue; }

    // returns a cloned instance
    clone() {
        return new Character(this.name, this.hp, this.strength, this.agility, this.desc)
    }

    // changes the characters hp
    changeHP(amount) {
        let previousHP = this.hp;
        this.hp = clamp(this.hp + amount, 0, this.maxHP);
        return this.hp - previousHP;
    }

    // changes the characters max hp
    changeMaxHP(amount) {
        this.maxHP = clamp(this.maxHP + amount, 1, Infinity);
        this.hp = clamp(this.hp, 0, this.maxHP);
        return this.maxHP;
    }

    getAttack() {
        return this.strength * fnExports.random(.9, 1.1, 1);
    }

    getSpeed() {
        return this.agility;
    }

}