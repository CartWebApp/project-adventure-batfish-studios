
// holds item related classes

import * as functionExports from './Functions.js';

export class Item {
    constructor(data, name, count=1, type='generic', description='', style='') {
        Object.assign(this, {name, count, type, description, style}, data)
    }
}

export class Consumable extends Item {
    constructor(data, name, count, type, description, style, effects=[]) {
        super(data, name, count, type, description, style)
        if (!this.effects) this.effects = effects;
    }

    // uses the consumable
    use(target) {
        let messages = [];
        messages.push(`Used ${this.style}${this.name}`)
        for (const effect of this.effects) {
            if (effect.type === 'heal') {
                let regainedHP = target.changeHP(effect.value)
                messages.push(`[c:lime]+ ${regainedHP} HP`)
            } else if (effect.type === 'gainMaxHP') {
                target.maxHP += effect.value
                messages.push(`[class:health]+ ${effect.value} Max HP`)
            }
        }
        target.removeItem(this.name);
        return messages;
    }
}