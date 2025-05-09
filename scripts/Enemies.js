import * as fnExports from './Functions.js';
import {Character} from './Character.js';
import { parseEnemy } from './GameLogic.js';
Object.entries(fnExports).forEach(([name, exported]) => window[name] = exported);


export class Enemy extends Character {

    /**
     * @typedef {Object} EnemyConfig_
     * @prop {Array} lootTable - Array of objects each holding an item, its rarity, and its count
     * @prop {Number} weight - The relative chance to get this enemy
     * @typedef {CharacterConfig & EnemyConfig_} EnemyConfig
     * @param {EnemyConfig} options
     */
    constructor(options={}) {
        let defaults = {
            lootTable: [], weight: 1
        }
        options = Object.assign(defaults, options)
        super(Object.assign(defaults, options))
        this.lootTable = options.lootTable
        this.weight = options.weight;
    }

    // returns a cloned instance
    clone() {
        return new Enemy({name:this.name, hp:this.hp, strength:this.strength, agility:this.agility, desc:this.desc, lootTable: this.lootTable})
    }
}

export class Team {


    /**
     * @typedef {Object} TeamConfig
     * @prop {String} groupName - The display name of the team. ex: a bunch of hooligans
     * @prop {Array} enemyPool - List of enemies and their weights to pull from
     * @prop {Array} rewardPool - List of rewards and their weights to pull from
     * @prop {Number} enemyMin - The lower boundry for the number of enemies
     * @prop {Number} enemyMax - The upper boundry for the number of enemies
     * @prop {Number} rewardMin - The lower boundry for the number of rewards
     * @prop {Number} rewardMax - The upper boundry for the number of rewards
     * @prop {Boolean} uniqueEnemies - Whether each enemy can only be added once
     * @prop {Boolean} useEnemyLoot - Whether the enemy loot gets rolled in addition to the team rewards
     * @param {TeamConfig} options
     */
    constructor(options={}) {
        let defaults = {
            enemyPool:[], rewardPool: [], uniqueEnemies:true, groupName:'a group of enemies', enemies:[]
        }
        options = Object.assign(defaults, options)
        Object.assign(this, defaults, options)
        if (!this.enemyMin) this.enemyMin = this.enemyPool.length;
        if (!this.enemyMax) this.enemyMax = this.enemyMin;
        if (!this.rewardMin) this.rewardMin = this.rewardPool.length;
        if (!this.rewardMax) this.rewardMax = this.rewardMin;
        this.id = this.id ?? this.name;
    }

    // returns a cloned instance
    clone() {
        return new Team(this)
    }

    // generates enemies from enemyPool
    generateEnemies() {
        this.enemies = [];
        let generatedEnemies = fnExports.weightedRandom(this.enemyPool,
        {unique: this.uniqueEnemies, count: random(this.enemyMin, this.enemyMax)});
        for (const enemy of generatedEnemies) {
            this.enemies.push(parseEnemy(enemy).clone())
        }
        this.enemies = fnExports.sortByPath(this.enemies, ['name'])
    }
}