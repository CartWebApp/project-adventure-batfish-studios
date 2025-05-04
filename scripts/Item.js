
// holds item related classes

import * as functionExports from './Functions.js';

export class Item {
    constructor(data, name, count=1, type='generic', description='', style='') {
        Object.assign(this, {name, count, type, description, style}, data)
    }
}

export class Consumable extends Item {
    constructor(data, name, count, type, description, style, effects=[], hideEffects = false) {
        super(data, name, count, type, description, style)
        if (!this.effects) this.effects = effects;
        if (!this.hideEffects) this.hideEffects = hideEffects;

    }

    // uses the consumable
    use(target) {
        if (this.count === 0) return ['Missing ' + this.name]
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