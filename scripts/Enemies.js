import * as fnExports from './Functions.js';
import {Character} from './Character.js';
Object.entries(fnExports).forEach(([name, exported]) => window[name] = exported);


export class Enemy extends Character {

    /**
     * @param {CharacterConfig} options
     */
    constructor(options={}) {
        super({options})
    }
}