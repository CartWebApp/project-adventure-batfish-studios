import * as fnExports from './Functions.js';
import {Character} from './Character.js';
Object.entries(fnExports).forEach(([name, exported]) => window[name] = exported);


export class Enemy extends Character {

    /**
     * @typedef {Object} EnemyConfig_
     * @prop {Array} lootTable - Array of objects each holding an item, its rarity, and its count
     * @typedef {CharacterConfig & EnemyConfig_} EnemyConfig
     * @param {EnemyConfig} options
     */
    constructor(options={}) {
        let defaults = {
            lootTable: []
        }
        options = Object.assign(defaults, options)
        super(Object.assign(defaults, options))
        this.lootTable = options.lootTable
    }

    // returns a cloned instance
    clone() {
        return new Enemy({name:this.name, hp:this.hp, strength:this.strength, agility:this.agility, desc:this.desc, lootTable: this.lootTable})
    }
}