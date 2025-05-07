
// holds item related classes

import * as functionExports from './Functions.js';

export class Item {
    /**
     * @typedef {Object} ItemConfig
     * @prop {String} name - The item's display name
     * @prop {Number} count - The number of the item
     * @prop {String} type - The category of item. ex: consumable
     * @prop {String} desc - The items description
     * @prop {String} style - The css styling of the item. ex: '[c:red]'
     * 
     * @param {ItemConfig} data 
     */
    constructor(data) {
        let defaults = {
            name: '', count:1, type:'generic', desc:'', style:''
        }
        Object.assign(this, defaults, data)
    }
}

export class Consumable extends Item {

    /**
     * @typedef {Object} ConsumableConfig_
     * @prop {Array} effects - Array of effects. ex: [{"type": "heal", "value": 15}]
     * @prop {Boolean} hideEffects - Whether the player needs to have consumed the item at least once to see it's effects
     * @typedef {ItemConfig & ConsumableConfig_} ConsumableConfig
     * 
     * @param {ConsumableConfig} data 
     */
    constructor(data) {
        let defaults = {
            effects: [], hideEffects: false
        }
        super(Object.assign(defaults, data))
    }

    // uses the consumable
    use(target) {
        if (this.count === 0) return ['Missing ' + this.name];
        if (target.hp === 0)  return ['You cannot use items while dead'];
        let messages = [];
        messages.push(`Used ${this.style}${this.name}`)
        for (const effect of this.effects) {
            if (effect.type === 'heal') {
                let regainedHP = target.changeHP(effect.value)
                messages.push(`[class:health]+ ♥${regainedHP} HP`)
            } else if (effect.type === 'gainMaxHP') {
                target.maxHP += effect.value
                messages.push(`[class:health]+ ♥${effect.value} Max HP`)
            } else if (effect.type === 'gainStrength') {
                target.strength += effect.value
                messages.push(`[class:strength]+ ${effect.value} Strength`)
            } else if (effect.type === 'gainAgility') {
                target.agility += effect.value
                messages.push(`[class:agility]+ ${effect.value} Agility`)
            }
        }
        target.removeItem(this.name);
        target.usedItems.add(this.name);
        return messages;
    }

    // returns all of the effects
    getEffects() {
        let messages = [];
        for (const effect of this.effects) {
            if (effect.type === 'heal') {
                messages.push(`[class:health]+ ♥${effect.value} HP`)
            } else if (effect.type === 'gainMaxHP') {
                messages.push(`[class:health]+ ♥${effect.value} Max HP`)
            } else if (effect.type === 'gainStrength') {
                messages.push(`[class:strength]+ ${effect.value} Strength`)
            } else if (effect.type === 'gainAgility') {
                messages.push(`[class:agility]+ ${effect.value} Agility`)
            }
        }
        return messages;
    }
}