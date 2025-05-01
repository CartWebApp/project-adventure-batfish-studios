
// imports Reactor class for reactive values
import { Reactor } from './Reactor.js';

import { CanvasHandler } from './CanvasOverlay.js';

// imports general use functions and sets their namespace to this window
import * as fnExports from './Functions.js';
Object.entries(fnExports).forEach(([name, exported]) => window[name] = exported);

let devMode = false;

let rooms = {};
let currentRoom;
let player;
let isGameLoop = true;
let textController; // makes text writing cancellable
let textControllerSignal;
let textCancelled = false;
let game;
let history;
let currentEnding = 'unset';
let endings = {}; // holds the possible ending names and text
let particleHandler;
let leaveChoices = false;
let startingRoom = 'Example Hub'; // [ 'Example Hub' ][ 'b-start' ]

const parsableStyles = [
    {name: 'reset', identifier: ''}, // parses for full style resets (removes all styles). Syntax is [-:]
    {name: 'class', identifier: 'class'}, // example: [class:item-count], or [class:] to reset
    {name: 'color', identifier: 'c'}, // example: [c:#0011] for green, or [c:] to reset
    {name: 'fontFamily', identifier: 'ff'}, // example: [ff:'Courier New'], or [ff:] to reset
    {name: 'fontSize', identifier: 'fs'}, // example: [fs:32px], or [fs:] to reset
    {name: 'fontStyle', identifier: 'fst'},
    {name: 'rotate', identifier: 'rt'}, // example: [rt:180deg], or [rt:] to reset
    {name: 'textShadow', identifier: 'ts'}, // example: [ts:4px,4px,3px,yellow], or [ts:] to reset
    {name: 'animation', identifier: 'an'}, // example: [an:text-blur 1s ease], or [an:] to reset
    {name: 'filter', identifier: 'fi'}, // example: [fi:blur(6px)], or [fi:] to reset
    {name: 'scale', identifier: 'sc'}, // example: [sc:1.5], or [sc:] to reset
    {name: 'opacity', identifier: 'op'}, // example: [op:0.5], or [op:] to reset
]  

// holds history data
class History {
    constructor() {
        this.choices = {run: [], past: []};
        this.storyLog = [];
        this.actionsLog = [];
        this._roomsVisited = {run: [], past: []}; // rooms visited on current run and all time
        this._endings = new Set();
        this.resets = 0;
        this.container = document.getElementById('history-content')
    }
    
    get endings() { return Array.from(this._endings) }
    
    addEnding(ending) {
        this._endings.add(ending);
    }

    addStory(story) {
        this.storyLog.push(story);
        let textLine = document.createElement('div');
        textLine.textContent = story;
        textLine.classList.add('story-history');
        this.container.appendChild(textLine);
        this.container.scrollTop = this.container.scrollHeight;

    }

    addAction(action) {
        this.actionsLog.push(action);
        let textLine = document.createElement('div');
        textLine.textContent = action;
        textLine.classList.add('action-history');
        this.container.appendChild(textLine);
        this.container.scrollTop = this.container.scrollHeight;

    }

    addRoom(room) {
        this._roomsVisited.run.push(room);
    }

    addChoice(choice) {
        this.choices.run.push(choice);
        let textLine = document.createElement('div');
        textLine.textContent = choice.text;
        textLine.classList.add('choice-history');
        this.container.appendChild(textLine);
        this.container.scrollTop = this.container.scrollHeight;

    }

    // resets run specific history
    softReset() {
        this.choices.past.push(...this.choices.run);
        this._roomsVisited.past.push(...this._roomsVisited.run);
        this.choices.run = [];
        this._roomsVisited.run = [];
        this.storyLog = [];
        this.actionsLog = [];
    }
    
}

// Holds game logic methods
class Game {
    constructor() {

    }

    // Gives an item to the player's inventory
    getItem(itemName, min=1, max=1, style = '', customMessage = '') {
        max = max ?? min;
        let count = random(min, max);
        let messages = [];
        style = style || '[c:var(--item-color)]';
        player.addItem(itemName, count, style);
        if (count > 1) {
            messages.push(customMessage || `Obtained [${style + itemName}[:]] X ${count}`);
        } else {
            messages.push(customMessage || `Obtained [${style + itemName}[:]]`);
        }
        return { messages };
    }

    // leaves the current choice block
    leaveChoice() {
        leaveChoices = true;
    }

    // changes the players health
    changeHP(min, max, cause='default', customMessage = '') {
        max = max ?? min;
        let amount = random(min, max)
        let messages = [];
        player.changeHP(amount);
        if (player.hp <= 0) {
            currentEnding = endings[cause] ? cause : 'default death';
        }
        if (amount >= 0) {
            messages.push(customMessage || `[c:lime]HP +${amount}`);
        } else {
            messages.push(customMessage || `[c:red]HP -${-amount}`);
        }
        return { messages };
    }

    // changes the players max health
    changeMaxHP(min, max, customMessage = '') {
        max = max ?? min;
        let amount = random(min, max)
        let messages = [];
        player.changeMaxHP(amount);
        if (amount >= 0) {
            messages.push(customMessage || `[c:lime]Max HP +${amount}`);
        } else {
            messages.push(customMessage || `[c:red]Max HP -${-amount}`);
        }
        return { messages };
    }

    // Removes an item from the player's inventory
    removeItem(item, count) {
        player.removeItem(item, count);
    }

    // changes the current room to a new room
    changeRoom(room) {
        history.addRoom(room);
        currentRoom = rooms[room];
    }

    // changes the background
    // ex: changeBG('escape.jpg');
    async changeBG(name, transition = {}) {
        transition.out = transition.out ?? '[an:fade-out .5s ease]';
        transition.in = transition.in ?? '[an:fade-in .5s ease]';
        transition.waitsOut = transition.waitsOut ?? false;
        transition.waitsIn = transition.waitsIn ?? false;
        clearDialogueText();
        const background = document.getElementById('background-image');
        if (transition.out && transition.waitsOut) {
            game.styleBG(transition.out)
            await awaitAnimation(background);
        } else if (transition.out && !transition.waitsOut) {
            game.styleBG(transition.out)
        }
        if (name) {
            background.src = `imgs/backgrounds/${name}`;
        }
        if (transition.in && transition.waitsIn) {
            game.styleBG(transition.in)
            await awaitAnimation(background);
        } else if (transition.in && !transition.waitsIn) {
            game.styleBG(transition.in)
        }
    }

    // applies styles given by a string of style identifiers to the background
    styleBG(string) {
        applyStyle(document.getElementById('background-image'), generateStyleList(string));
    }

    // changes the background particle animation
    changeParticleAnimation(animationName, strength, speed) {
        particleHandler.changeAnimation(animationName);
        if (strength) particleHandler.strength = strength;
        if (speed) particleHandler.speed = speed;
    }

    // changes the background particle speed
    changeParticleSpeed(speed) {
        particleHandler.speed += speed;
    }

    // changes the background particle strength
    changeParticleStrength(strength) {
        particleHandler.strength += strength;
    }

    // sets the background particle speed
    setParticleSpeed(speed) {
        particleHandler.speed = speed;
    }

    // sets the background particle strength
    setParticleStrength(strength) {
        particleHandler.strength = strength;
    }

    // writes text
    async writeText(text, options, speed = 20, variance = 5, animation = 'default', waits = true, waitDelay = 0, skippable = true, elementID = 'story', clearsText = false) {
        elementID = options.elementID ?? elementID;
        let textObj = new TextObject(text, options, speed, variance, animation, skippable, waits, waitDelay);
        if (clearsText) clearText(document.getElementById(elementID));
        await typeText(textObj.text,{}, document.getElementById(elementID), textObj.speed, textObj.variance, true, document.getElementById('dialogue-box'), textObj.animation, textControllerSignal, textObj.waits, textObj.waitDelay)
    }

    // initiates combat
    async encounter(enemies, rewards, groupName) {
        let battle = new Battle({enemies, rewards, groupName})
        await battle.encounter();
    }


    // initiates an ending
    async ending(endType) {
        isGameLoop = false;
        currentEnding = endings[endType];
        if (!history.endings.includes(endType)){
            currentEnding.createChoice('Restart', {repeatable: true})
                .addAction({ type: 'restart'});
        }
        history.addEnding(endType);
        clearDialogueText();
        for (const item of currentEnding.queuelist) {
            if (item.type === 'story') {
                clearText(document.getElementById('story'));
                await showStory([item.value]);
                clearText(document.getElementById('action-output'));
            } else if (item.type === 'choicelist') {
                while (getShownChoices(item.value).length > 0) {
                    showChoices(item.value);
                    let selectedChoice = await tryChoices(document.getElementById('choices'));
                    history.addChoice(selectedChoice);
                    clearText(document.getElementById('action-output'))
                    clearText(document.getElementById('choices'))
                    if (selectedChoice.text === 'Restart') {
                        attemptActionsWithText(selectedChoice.actions);
                    } else {
                        await attemptActionsWithText(selectedChoice.actions);
                    }
                }
            } else if (item.type === 'actionlist') {
                await attemptActionsWithText(item.value);
            }
        }
        clearDialogueText();
        await sleep(10);
    }

    // resets the player and game
    async restart() {
        history.resets += 1;
        history.softReset();
        player = new Player();
        generateAllRooms();
        currentRoom = startingRoom;
        isGameLoop = true;
        document.getElementById('history-content').innerHTML = '';
        await sleep(10);
        clearDialogueText();
        document.getElementById('background-image').src = 'imgs/backgrounds/transparent.png'
        gameLoop();
    }

    // Returns whether the player has an item in their inventory
    hasItem(itemName, minCount = 1, customMessage = '') {
        for (const invItem of Object.values(player.inventory)) {
            if (invItem.name === itemName && invItem.count >= minCount)
                return true;
        }
        let message = customMessage || `You do not have [[c:yellow]${itemName}[:]]`;
        return { result: false, message };
    }

    // returns whether a choice has been previously made
    madeChoice(choiceId) {
        return checkPropertyValues(history.choices.run, 'id', choiceId)
        || checkPropertyValues(history.choices.run, 'customID', choiceId);
    }

    // returns whether a choice has been made in a previous run
    madePastChoice(choiceId) {
        return checkPropertyValues(history.choices.past, 'id', choiceId)
            || checkPropertyValues(history.choices.past, 'customID', choiceId);
    }

}

// represents a battle
class Battle {
    constructor(parameters, enemies, rewards, groupName, inputContainer, outputContainer, advanceElement) {
        this.enemies = enemies;
        this.rewards = rewards ?? [];
        this.groupName = groupName ?? 'some enemies';
        this.inputContainer = inputContainer ?? document.getElementById('battle-input');
        this.outputContainer = outputContainer ?? document.getElementById('story');
        this.advanceElement = advanceElement ?? document.getElementById('dialogue-box');
        if (parameters) transferProperties(parameters, this);
        this.textConfig = this.textConfig ?? {element: this.outputContainer, speed: -1, skipElement: this.advanceElement, skippable: true};
        this.enemies = this.enemies.map(enemy => enemy.clone());
        this.remainingEnemies = this.enemies;
    }

    async encounter() {
        let selectedChoice;
        let menuChoices = [
            new Choice('Fight', {speed: -1}),
            // new Choice('Item', {speed: -1}),
            new Choice('Inspect', {speed: -1}),
        ];
        
        // fight loop
        while (this.remainingEnemies.length > 0 && player.hp > 0) {
            clearDialogueText();
            typeText(`You have encountered ${this.groupName}`, {...this.textConfig});
            // shows options: Fight, Item, Inspect
            showChoices(menuChoices, this.inputContainer);
            selectedChoice = await tryChoices(this.inputContainer);
            selectedChoice = selectedChoice.text.toLowerCase();

            // check what option is clicked, and run that function
            if (selectedChoice === 'fight') {
                await this.selectEnemy('fight', 'Which enemy will you attack?');
                if (this.remainingEnemies.length === 0) break;
                await this.enemyTurn();
            } else if (selectedChoice === 'inspect') {
                await this.selectEnemy('inspect', 'Which enemy will you inspect?');
            }
        }

        // end of fight
        if (player.hp > 0) {
            // loot!
            this.getRewards();
            await awaitClick(this.advanceElement);
        }
    }
    
    // shows the remaining enemies to select
    async selectEnemy(action, text='Which enemy?') {
        clearDialogueText();
        typeText(text, {...this.textConfig});
        let selectedEnemy;
        let choices = [];
        for (const enemy of this.remainingEnemies) {
            choices.push(new Choice(enemy.name, {speed: -1, value: enemy}));
        }
        showChoices(choices, this.inputContainer);
        let selectedChoice = await tryChoices(this.inputContainer);
        selectedEnemy = selectedChoice.value;

        if (action === 'fight') {
            await this.fightEnemy(selectedEnemy);
        } else if (action === 'inspect') {
            await this.inspectEnemy(selectedEnemy);
        }

        // dead enemy gets removed
        if (selectedEnemy.hp === 0) {
            this.remainingEnemies.splice(this.remainingEnemies.indexOf(selectedEnemy), 1);
            await typeText(`[c:var(--enemy-name)]${selectedEnemy.name}[:] has been defeated!`, {...this.textConfig, waits: true});
        }
    }

    // shows the remaining enemies to select
    async fightEnemy(enemy) {
        clearDialogueText();
        let baseAttack = player.getAttack();
        let attackMulti = await this.timedAttack(enemy);
        let finalAttack = Math.round(baseAttack * attackMulti);
        enemy.changeHP(-finalAttack)
        typeText(`You delt [class:health]${finalAttack}[:] damage to [c:var(--enemy-name)]${enemy.name}.`, {...this.textConfig});
        await typeText(`Remaining enemy health: [class:health]${enemy.hp}`, {...this.textConfig, waits: true});
    }

    async enemyTurn() {
        clearDialogueText();

        // select random enemy from alive enemies
        let enemy = this.remainingEnemies[random(0, this.remainingEnemies.length - 1)];
        let baseAttack = enemy.getAttack();
        let defenceMulti = await this.timedDefense(enemy);
        let enemyAttack = Math.round(baseAttack / defenceMulti);
        game.changeHP(-enemyAttack, -enemyAttack, 'slain by enemy')
        typeText(`[c:var(--enemy-name)]${enemy.name}[:] delt [class:health]${enemyAttack}[:] damage.`, {...this.textConfig});
        await typeText(`Remaining health: [class:health]${player.hp}`, {...this.textConfig, waits: true});
    }

    // runs a timing minigame to get attack multi
    async timedAttack(enemy) {
        let agilityRatio = player.agility / enemy.agility;
        let speedMulti;
        if (player.agility < enemy.agility) {
            let speedLog = Math.log(1 / agilityRatio);
            speedMulti = clamp(1 + .5 * speedLog, 1, 100);
        } else {
            speedMulti = clamp((1 / agilityRatio) ** .3, .5, 1);
        }

        let offset = await this.timingGame(speedMulti, 'out');
        let multi = 2 - (offset * 4) ** .5;
        return multi;
    }

    // runs a timing minigame to get defense multi
    async timedDefense(enemy) {
        let agilityRatio = player.agility / enemy.agility;
        let speedMulti;
        if (player.agility < enemy.agility) {
            let speedLog = Math.log(1 / agilityRatio);
            speedMulti = clamp(1 + .5 * speedLog, 1, 100);
        } else {
            speedMulti = clamp((1 / agilityRatio) ** .3, .5, 1);
        }

        let offset = await this.timingGame(speedMulti, 'in');
        let multi = 1.8 - (offset) ** .5;
        return multi;
    }

    // runs a timing minigame to get a multi
    async timingGame(speed, direction='out') {

        let keyframes;

        if (direction === 'out') {
            keyframes = [
                {scale: 0},
                {scale: 1.5}
            ]
        } else if (direction === 'in') {
            keyframes = [
                {scale: 2},
                {scale: 0.5}
            ]
        }

        let timing = {
            duration: 1000 / speed
        }

        let target = document.createElement('div');
        target.className = 'timing-target';
        this.advanceElement.appendChild(target);

        let indicator = document.createElement('div');
        indicator.className = 'timing-indicator';
        target.appendChild(indicator);

        if (direction === 'out') {
            indicator.classList.add('solid');
        } else {
            target.classList.add('solid');
        }

        await sleep(300);

        let animation = indicator.animate(keyframes, timing);

        await Promise.race([animation.finished, awaitClick(this.advanceElement)])
        
        let offset = Math.abs(1 - getComputedStyle(indicator).scale)
        indicator.style.scale = getComputedStyle(indicator).scale;
        animation.cancel();
        await sleep(500);
        target.remove();
        return offset;
    }

    // displays an enemies info
    async inspectEnemy(enemy) {
        clearDialogueText();
        typeText(`Name: [c:var(--enemy-name)]${enemy.name}`, {...this.textConfig});
        if (enemy.desc) typeText(`Description: [c:#eeeeee]${enemy.desc}`, {...this.textConfig});
        typeText(`[class:health]HP: ${enemy.hp}/${enemy.maxHP}`, {...this.textConfig});
        typeText(`[class:strength]Strength: ${enemy.strength}`, {...this.textConfig});
        await typeText(`[class:agility]Agility: ${enemy.agility}`, {...this.textConfig, waits: true});
    }

    // gives the player rewards
    async getRewards() {
        clearDialogueText();
            typeText(`You have defeated ${this.groupName}`, {...this.textConfig});
            let rewardActions = []
            for (const reward of this.rewards) {
                rewardActions.push(new Action('getItem', [reward.name, reward.min, reward.max], false))
            }
            await attemptActionsWithText(rewardActions);
    }
}

// generic character class
class Character {
    constructor(name, hp=100, strength=10, agility=10, desc='') {
        this.name = name;
        this._maxHP = new Reactor(hp);
        this._hp = new Reactor(this._maxHP.value);
        this._strength = new Reactor(strength);
        this._agility = new Reactor(agility);
        this._desc = new Reactor(desc);
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
        return new Character(this.name, this.hp, this.strength, this.agility)
    }

    // changes the characters hp
    changeHP(amount) {
        this.hp = clamp(this.hp + amount, 0, this.maxHP);
        return this.hp;
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
class Player extends Character {
    constructor() {
        super('Player', 100, 10, 10);
        this._inventory = new Reactor({});
        this._maxHP.bindQuery('#stat-maxHP');
        this._hp.bindQuery('#stat-hp');
        this._strength.bindQuery('#stat-strength');
        this._agility.bindQuery('#stat-agility');
        this._inventory.subscribe(() => this.refreshInventory(this));
    }

    // returns the players inventory
    get inventory() {
        return this._inventory.value;
    }

    // sets the players inventory
    set inventory(newValue) {
        this._inventory.value = newValue;
    }

    // Adds an item to the players inventory
    addItem(itemName, count = 1, style = '') {
        let newInv = this._inventory.value;
        if (!newInv[itemName]) {
            newInv[itemName] = { name: itemName, count, style }
        } else {
            newInv[itemName].count += count;
        }
        this._inventory.value = newInv;
    }

    // Adds an item to the players inventory
    removeItem(itemName, count = 1) {
        let newInv = this._inventory.value;
        if (!newInv[itemName]) {
            return
        }
        newInv[itemName].count -= count;
        if (newInv[itemName].count <= 0) delete newInv[itemName];
        this._inventory.value = newInv;
    }

    // refreshes the elements representing the player's inventory
    refreshInventory(object) {
        const inventory = document.getElementById('inventory');
        inventory.innerHTML = '';
        for (const item of Object.values(object.inventory)) {
            const itemElement = document.createElement('p');
            itemElement.className = 'item-container flex';
            const nameElement = document.createElement('output');
            nameElement.className = 'item-name';
            const formattedText = formatText(item.style + ' ' + item.name);
            formattedText.className = 'flex';
            nameElement.appendChild(formattedText);
            const countElement = document.createElement('output');
            itemElement.appendChild(countElement);
            countElement.outerHTML = `[<output class="item-count">${item.count}</output>]`;
            itemElement.appendChild(nameElement);
            inventory.appendChild(itemElement);
        }
    }

}

class Enemy extends Character {
    constructor(name, hp, strength, agility, desc) {
        super(name, hp, strength, agility, desc)
    }
}


// default text object for writing to the page
class TextObject {
    constructor(text, options, speed, variance, animation, skippable, waits, waitDelay) {
        this.text = text ?? '';
        this.speed = speed ?? 0;
        this.variance = variance ?? 0;
        this.animation = animation ?? 'none';
        this.skippable = skippable ?? false;
        this.waits = waits ?? false;
        this.waitDelay = waitDelay ?? 0
        this.options = options ?? {};
        this.requirements = [];
        transferProperties(this.options, this);
    }

    addRequirement(options, mode, type, parameters, inverse = false) {
        mode = options.mode ?? mode;
        type = options.type ?? type;
        inverse = options.inverse ?? inverse; // makes it required to NOT meet the requirement
        parameters = options.parameters ?? parameters ?? [];
        this.requirements.push({ mode, type, inverse, parameters });
        return this;
    }
}

class Action {
    constructor(type, parameters=[], waits=false) {
        this.type = type;
        this.parameters = parameters;
        this.waits = waits;
    }
}

class Choice extends TextObject {
    constructor(text, options = {}, repeatable = false, speed = 4, variance = 1, animation = 'default', skippable = true, room = undefined, id = '', customID = '', value='') {
        super(text, options, speed, variance, animation, skippable, true, 0);
        this.hidden = false;
        this.repeatable = repeatable;
        this.room = room;
        this.id = id;
        this.customID = customID;
        this.actions = [];
        this.requirements = [];
        transferProperties(this.options, this);
        if (!this.repeatable && this.room) {
            this.addRequirement({ mode: 'show', type: 'madeChoice', inverse: true, parameters: [this.id] })
        }
    }

    addAction(options, type, parameters, waits) {
        type = options.type ?? type;
        parameters = options.parameters ?? parameters;
        waits = options.waits ?? false;
        this.actions.push(new Action(type, parameters, waits));
        return this;
    }

    addRequirement(options, mode, type, parameters, inverse = false) {
        mode = options.mode ?? mode;
        type = options.type ?? type;
        inverse = options.inverse ?? inverse; // makes it required to NOT meet the requirement
        parameters = options.parameters ?? parameters ?? [];
        this.requirements.push({ mode, type, inverse, parameters });
        return this;
    }

    hide() {
        this.hidden = true;
    }

}

class Room {
    constructor(name, bg) {
        this.name = name;
        this.bg = bg ?? {};
        this.bg.transition = this.bg.transition ?? { out: '[an:fade-out .5s ease]', in: '[an:fade-in .5s ease]', waitsOut: true, waitsIn: false }
        this.bg.transition.waitsOut = this.bg.transition.waitsOut ?? true;
        this.choices = [];
        this.storyParts = []; // gets displayed when entering a room
        this.actions = [];
        this.queuelist = []; // holds the order that everything in the room should happen
        if (this.bg) { this.addAction({ type: 'changeBG', parameters: [this.bg.name, this.bg.transition] }) }
    }

    // adds a choice to the room
    addChoice(choice) {
        this.choices.push(choice);
        const lastInQueue = this.queuelist[this.queuelist.length - 1]
        if (lastInQueue && lastInQueue.type === 'choicelist') {
            lastInQueue.value.push(choice)
        } else {
            this.queuelist.push({ type: 'choicelist', value: [choice] });
        }
    }

    // creates a choice and automatically adds it to the room
    createChoice(text, options, repeatable, speed, variance, animation, skippable, customID) {
        const id = this.getChoiceId(this.choices.length + 1);
        const choice = new Choice(text, options, repeatable, speed, variance, animation, skippable, this, id, customID);
        this.addChoice(choice);
        return choice;
    }

    // returns the id of a choice given the choice number
    getChoiceId(choiceNumber) {
        return `${this.name}-${choiceNumber}`;
    }

    // adds a story line to the room
    addStory(text, options, speed = 20, variance = 5, animation = 'default', waits = true, waitDelay = 0, skippable = true) {
        let storyObject = new TextObject(text, options, speed, variance, animation, skippable, waits, waitDelay);
        this.storyParts.push(storyObject);
        this.queuelist.push({ type: 'story', value: storyObject });
        return storyObject;
    }

    // adds an action for a room
    addAction(options, type, parameters, waits) {
        type = options.type ?? type;
        parameters = options.parameters ?? parameters;
        waits = options.waits ?? waits ?? false;
        const action = new Action(type, parameters, waits);
        this.actions.push(action);

        const lastInQueue = this.queuelist[this.queuelist.length - 1]
        if (lastInQueue && lastInQueue.type === 'actionlist') {
            lastInQueue.value.push(action)
        } else {
            this.queuelist.push({ type: 'actionlist', value: [action] });
        }
        return this
    }
}

class Ending extends Room {
    constructor(name, bg) {
        let defaultBG = { name: 'destruction.jpeg', transition: { out: '[an:fade-out .5s ease-out][op:0]', in: '[an:fade-in .3s ease-out][fi:grayscale(.6)][sc: 1.5]', waitsOut: true, waitsIn: true } }
        bg = bg ?? defaultBG;
        super(name, bg);
        if (bg === defaultBG) {
            this.addAction({ type: 'styleBG', parameters: ['[an:shrink 30s ease-out][fi:grayscale(.6)]'] });
        }
    }
}

// creates an element for a loading buffer
function createLoadingBuffer(elementID='loading-buffer', count = 8, duration = 2000, animatedNumber = 1, image = 'icons/x.svg', imageSize = 16, radius = 120, keyframes = null, timing = null) {
    keyframes = keyframes ?? [
        { transform: "translateY(0px)" },
        { transform: `translateY(${-imageSize / 2}px)`, offset: 1 / count },
    ];

    timing = timing ?? {
        easing: 'ease',
    };
    timing.duration = duration / animatedNumber;
    timing.iterations = Infinity

    let bufferContainer = document.createElement('div');
    bufferContainer.style.height = `${radius}px`;
    bufferContainer.style.width = `${radius}px`;
    bufferContainer.className = `buffer-container`;
    for (let i = 0; i < count; i++) {
        const imageElement = document.createElement('span');
        imageElement.style.width = `${imageSize}px`;
        imageElement.style.backgroundImage = `url(imgs/${image})`;
        imageElement.className = `buffer-img`;
        imageElement.style.rotate = `${360 / count * i}deg`;
        bufferContainer.appendChild(imageElement);
        timing.delay = duration / count * i / 1,
            imageElement.animate(keyframes, timing)
    }
    let bufferWrapper = document.createElement('div');
    bufferWrapper.className = 'bufferWrapper';
    bufferWrapper.style.height = `${radius}px`;
    bufferWrapper.style.width = `${radius}px`;
    bufferWrapper.appendChild(bufferContainer);
    document.getElementById(elementID).appendChild(bufferWrapper)
}

// creates a room and adds it to rooms
function createRoom(name, bg) {
    const newRoom = new Room(name, bg);
    rooms[newRoom.name] = newRoom;
    return newRoom;
}

// creates an ending and adds it to endings
function createEnding(name, bg) {
    const newEnding = new Ending(name, bg);
    endings[newEnding.name] = newEnding;
    return newEnding;
}

// parses a string for style identifiers, returning clean text and a dictionary of location + identifier values
function parseStyles(text, identifier) {
    let data = [];
    let cleanText = text;
    let specialMatches = [...text.matchAll(new RegExp(String.raw`(\[)(?!\[)(?!${identifier}:)([^:^\]]*:)([^\]]*)(\])`, 'g'))];
    for (const match of specialMatches.reverse()) {
        let index = match.index;
        cleanText = cleanText.substring(0, index) + cleanText.substring(index + match[0].length)
    }
    while (cleanText.includes(`[${identifier}:`)) {
        let match = cleanText.match(new RegExp(String.raw`(\[)(?=${identifier || ':'})(${identifier}:)([^\]]*)(\])`));
        let index = match.index;
        let value = match[3];
        data.push({ index, value });
        cleanText = cleanText.substring(0, index) + cleanText.substring(index + match[0].length);
    }
    return { text: cleanText, data }
}

function generateStyleList(string) {
    let styleList = JSON.parse(JSON.stringify(parsableStyles));
    for (const style of styleList) {
        let parsedData = parseStyles(string, style.identifier);
        style.data = parsedData.data;
        style.dataIndex = 0;
        style.currentValue = style.currentValue ?? '';
    }
    return styleList;
}

// applies a parsed styleList to an element
function applyStyle(element, styleList, characterIndex) {
    for (const style of styleList) {
        if (style.data[0] && (characterIndex === undefined || characterIndex === style.data[style.dataIndex]?.index)) {
            style.currentValue = style.data[style.dataIndex].value;
            style.dataIndex += 1;
            if (style.name === 'reset') {
                for (const style of styleList) {
                    style.currentValue = '';
                }
            }
        }
        if (style.name === 'class' && style.currentValue) {
            element.className += ' ' + style.currentValue
        } else {
            element.style[style.name] = style.currentValue;
        }
    }
}

// returns an element with color formatted text
function formatText(text) {
    //to add a style, just put a valid css style in the name and add an identifier
    let textStyles = generateStyleList(text);

    let cleanText = parseStyles(text, 'This returns the clean text because nothing matches this.').text;
    let characterIndex = 0;
    let formattedElement = document.createElement('span');
    let wordArray = cleanText.split(' ')
    for (let i = 0; i < wordArray.length; i++) {
        let word = wordArray[i];
        let wordSpan = document.createElement('span')
        wordSpan.className = 'transition-word';
        formattedElement.appendChild(wordSpan)
        for (let char of word) {
            let charSpan = document.createElement('span');
            charSpan.textContent = char;
            charSpan.className = `transition-character`;
            applyStyle(charSpan, textStyles, characterIndex);
            wordSpan.appendChild(charSpan);
            characterIndex++;
        }
        let space = document.createElement('span');
        space.textContent = ' ';
        space.className = `transition-character`;
        applyStyle(space, textStyles, characterIndex);
        if (i != wordArray.length - 1) {
            wordSpan.appendChild(space);
            characterIndex++;
        }
    }
    return formattedElement;
}

// clears the text in an element
function clearText(element) {
    element.innerHTML = '';
}

// clears the text in all of the dialogue elements
function clearDialogueText() {
    clearText(document.getElementById('story'));
    clearText(document.getElementById('action-output'));
    clearText(document.getElementById('choices'));
    clearText(document.getElementById('battle-input'));
}

// types out text (can be skipped by clicking on element)
async function typeText(text, options, element, speed = 10, variance = 0, skippable = true, skipElement = null, animation = 'none', signal = textControllerSignal, waits = false, waitDelay = 0) {
    element = options.element ?? element;
    speed = options.speed ?? speed;
    variance = options.variance ?? variance;
    skippable = options.skippable ?? skippable;
    skipElement = options.skipElement ?? skipElement;
    animation = options.animation ?? animation;
    signal = options.signal ?? signal;
    waits = options.waits ?? waits;
    waitDelay = options.waitDelay ?? waitDelay;


    let skipped = false;

    if (devMode) waitDelay = 0;

    let skipFunction = () => {
        speed = 0;
        variance = 0;
        textController?.abort();
        textController = new AbortController();
        textControllerSignal = textController.signal;
        skipElement.addEventListener('click', hardSkipFunction, { once: true });
    }
    let hardSkipFunction = () => {
        skipped = true;
    }
    if (skippable) {
        skipElement = skipElement ?? element; // the element the user clicks on to trigger skip
        skipElement.addEventListener('click', skipFunction, { once: true });
    }
    let textLine = document.createElement('span');
    textLine.className = 'text-line';
    element.appendChild(textLine);
    let formattedElement = formatText(text);
    for (const word of formattedElement.children) {
        let wordSpan = word.cloneNode(false);
        textLine.appendChild(wordSpan)
        for (const char of word.children) {
            if (skipped || textCancelled) break;
            let newChar = char.cloneNode(true);
            newChar.classList.add(animation);
            wordSpan.appendChild(newChar);
            try {
                await cancelableSleep(speed + random(0, variance), signal);
            } catch (error) {
                let test = null;
            }
        }
    }

    skipElement.removeEventListener('click', skipFunction);
    skipElement.removeEventListener('click', hardSkipFunction);

    if (textCancelled) {
        return
    }

    if (skipped && !textCancelled) {
        textLine.innerHTML = '';
        for (const word of formattedElement.children) {
            textLine.appendChild(word.cloneNode(true));
        }
    }


    if (waits && waitDelay) {
        await Promise.race([awaitClick(skipElement), sleep(waitDelay)])
    } else if (waits && !waitDelay) {
        await awaitClick(skipElement);
    } else if (!waits && waitDelay) {
        await sleep(waitDelay);
    }
}

// diplays each story part to the dialogue box
async function showStory(story) {
    const dialogueBox = document.getElementById('dialogue-box');
    const storyElement = document.getElementById('story');
    for (const part of story) {
        if (!checkRequirements(part, 'show').metRequirements) return;
        clearText(storyElement);
        await typeText(part.text,{}, storyElement, part.speed, part.variance, true, dialogueBox, part.animation, textControllerSignal, part.waits, part.waitDelay);
        const cleanText = parseStyles(part.text, 'This returns the clean text because nothing matches this.').text;
        history.addStory(cleanText);
        clearText(document.getElementById('action-output'));
    }
}

// returns the choices that are displayed
function getShownChoices(choices) {
    let shownChoices = []
    for (const choice of choices) {
        if (!choice.hidden && checkRequirements(choice, 'show').metRequirements) {
            shownChoices.push(choice);
        }
    }
    return shownChoices;
}

// diplays each choice to the dialogue box
async function showChoices(choices, container) {
    const dialogueBox = document.getElementById('dialogue-box');
    const choiceContainer = container ?? document.getElementById('choices');
    let choiceElements = [];
    let choiceTexts = [];

    for (let i = 0; i < choices.length; i++) {
        const choice = choices[i];
        if (choice.hidden || !checkRequirements(choice, 'show').metRequirements) continue;
        let choiceElement = document.createElement('button');
        choiceElement.className = 'choice';
        choiceElement.id = `choice-${i}`;
        choiceElement.object = choice;
        choiceContainer.appendChild(choiceElement);
        choiceElements.push(choiceElement);
        choiceTexts.push(choice.text);
        typeText(choice.text,{}, choiceElement, choice.speed, choice.variance, true, dialogueBox, choice.animation, textControllerSignal);
    }
}

// returns weather all the requirments are met to make a choice
function checkRequirements(choice, mode = 'use') {
    let metRequirements = true;
    let messages = [];
    let result;
    for (const requirement of choice.requirements) {
        if (requirement.mode != mode) continue;
        if (typeof game[requirement.type] === 'function') {
            result = game[requirement.type](...requirement.parameters)
        } else if (typeof window[requirement.type] === 'function') {
            result = window?.[requirement.type](...requirement.parameters);
        } else if (typeof requirement.type === 'function') {
            result = requirement.type(...requirement.parameters);
        }
        if (typeof result != "object") {
            result = { result };
        }
        if (requirement.inverse) {
            result.result = !result.result;
        }
        metRequirements = result.result && metRequirements;
        if (result.message) {
            messages.push(result.message)
        }
    }
    return { metRequirements, messages };
}

// cancels the writing of text in the dialogue box
async function cancelText() {
    textCancelled = true;
    textController?.abort();
    textController = new AbortController();
    textControllerSignal = textController.signal;
    await sleep(1);
    textCancelled = false;
}

// waits for user to pick a choice
async function selectChoice(choiceContainer) {
    let selectedChoice;
    for (const choiceElement of choiceContainer.children) {
        choiceElement.addEventListener('click', () => { selectedChoice = choiceElement.object })
    }
    await awaitClickList(choiceContainer.children);
    return selectedChoice;
}

// tries to run an action
async function attemptAction(action) {
    if (action.waits) {

        // if the function is within the game object, or is a global function
        if (typeof game[action.type] === 'function') {
            return await game[action.type](...action.parameters);
        } else if (typeof window[action.type] === 'function') {
            return await window?.[action.type](...action.parameters);
        } else if (typeof action.type === 'function') {
            return await action.type(...action.parameters);
        }
    } else {

        // if the function is within the game object, or is a global function
        if (typeof game[action.type] === 'function') {
            return game[action.type](...action.parameters);
        } else if (typeof window[action.type] === 'function') {
            return window?.[action.type](...action.parameters);
        } else if (typeof action.type === 'function') {
            return action.type(...action.parameters);
        }
    }
}

// tries to run a list of actions or an action
async function attemptActionsWithText(actions) {
    if (Object.prototype.toString.call(actions) != '[object Array]') actions = [actions];
    for (const action of actions) {
        let actionResult = await attemptAction(action);
        if (actionResult && actionResult?.messages) {
            for (const message of actionResult.messages) {
                typeText(message,{}, document.getElementById('action-output'));
                const cleanText = parseStyles(message, 'This returns the clean text because nothing matches this.').text;
                history.addAction(cleanText);
            }
        }
    }
}

// loops until a choice is selected that has all requirements met
async function tryChoices(choiceContainer) {
    let selectedChoice;
    let metReqirements = false;
    while (!metReqirements) {
        selectedChoice = await selectChoice(choiceContainer);
        await cancelText();
        clearText(document.getElementById('action-output'));
        let requirementsResult = checkRequirements(selectedChoice, 'use');
        metReqirements = requirementsResult.metRequirements;
        for (const message of requirementsResult.messages) {
            typeText(message,{}, document.getElementById('action-output'));
            const cleanText = parseStyles(message, 'This returns the clean text because nothing matches this.').text;
            history.addAction(cleanText)
        }
    }
    const cleanText = parseStyles(selectedChoice.text, 'This returns the clean text because nothing matches this.').text;
    history.addChoice(selectedChoice)
    return selectedChoice;
}

// repeats every room
async function gameLoop() {
    currentRoom = rooms[startingRoom];
    const choiceContainer = document.getElementById('choices');
    while (isGameLoop) {
        let thisRoom = currentRoom;
        for (const item of currentRoom.queuelist) {
            if (player.hp <= 0) {
                game.ending(currentEnding);
                return;
            }
            if (item.type === 'story') {
                await showStory([item.value]);
            } else if (item.type === 'choicelist') {
                while (isGameLoop && getShownChoices(item.value).length > 0 && thisRoom === currentRoom && !leaveChoices) {
                    leaveChoices = false;
                    if (player.hp <= 0) {
                        game.ending(currentEnding);
                        return;
                    }
                    showChoices(item.value);
                    let selectedChoice = await tryChoices(choiceContainer);
                    clearText(document.getElementById('action-output'))
                    clearText(document.getElementById('choices'))
                    await attemptActionsWithText(selectedChoice.actions);
                }
            } else if (item.type === 'actionlist') {
                await attemptActionsWithText(item.value);
            }
            if (thisRoom != currentRoom || !isGameLoop) { break }
        }
        if (player.hp <= 0) {
            game.ending(currentEnding);
            return;
        }
        else if (thisRoom === currentRoom) {
            await showStory([new TextObject('You have hit a dead end. Please add an ending or a way to change rooms here.', { waits: true, waitDelay: 30000 })]);
        }
    }
}


// initializes the event listeners in on the page
function createEventListeners() {

    // x button for center menu
    document.getElementById('menu-toggle').addEventListener('click', e => {
        document.getElementById('center-menu').classList.add('hidden');
        document.getElementById('dark-overlay').classList.add('hidden');
    })

    document.querySelectorAll('#main-nav button').forEach(button => {
        const toggledElement = document.getElementById(button.id.substring(0, button.id.indexOf('-toggle')));
        const menu = document.getElementById('center-menu');
        const overlay = document.getElementById('dark-overlay');
        button.addEventListener('click', () => {
            if (toggledElement.style.display != 'none' && !menu.classList.contains('hidden')) {
                menu.classList.add('hidden');
                overlay.classList.add('hidden');
            } else {
                menu.classList.remove('hidden');
                overlay.classList.remove('hidden');
            }
            setVisibleElement(toggledElement, document.querySelector('#center-menu .menu-content').children);
        });
    })
}

// creates multi-layer buffers
function bufferTesting(elementID=undefined, iterations=1,count = 8, duration = 2000, animatedNumber = 1, image = 'icons/circle_white.png', imageSize = 16, radius = 120, keyframes = null, modifiers = null) {

    for (let i = 0; i < iterations; i++) {
        let newKeyframes = JSON.parse(JSON.stringify(keyframes));
        for (let j = 0; j < newKeyframes.length; j++) {
            const keyframe = newKeyframes[j];
            const mods = modifiers[j];
            for (const modKey of Object.keys(mods)) {
                keyframe[modKey] = mods[modKey](keyframe[modKey], i)
            }
        }
        createLoadingBuffer(elementID, count, duration, animatedNumber, image, imageSize, radius, newKeyframes);
    }
}

// initializes the rooms and player
async function init() {
    bufferTesting('loading-buffer', 1, 10, 2000, 1, undefined, 20, 128, [
        { opacity: 1},
        { opacity: 0, offset: 1 },
    ], [{},{}]);
    preloadImages();
    particleHandler = new CanvasHandler(document.getElementById('particle-canvas'), undefined, 1, 1)
    // bufferTesting('loading-buffer-2', 1, 128, 2000, 64, 'backgrounds/destruction.jpeg', 20, 128, [
    //     { opacity: 1, scale: 1, filter: 'invert(0)' },
    //     { opacity: 0, scale: .5, offset: 1, filter: 'invert(0)' },
    // ], [{},{scale: (base, index)=>base + index*1 * (1 + index % 2 * -2)}]);
    // bufferTesting('loading-buffer-3', 1, 128, 2000, 32, 'icons/x.svg', 20, 128, [
    //     { opacity: 1, scale: 1, filter: 'invert(0)' },
    //     { opacity: 0, scale: .5, offset: 1, filter: 'invert(0)' },
    // ], [{},{scale: (base, index)=>base + index*1 * (1 + index % 2 * -2)}]);
    // bufferTesting('loading-buffer-4', 4, 128, 1000, 3, undefined, 20, 128, [
    //     { opacity: 1, scale: 1, filter: 'invert(1)' },
    //     { opacity: 0, scale: .5, offset: 1, filter: 'invert(0)' },
    // ], [{},{scale: (base, index)=>base + index*1 * (1 + index % 2 * -2)}]);
    createEventListeners();
    player = new Player();
    history = new History();
    game = new Game();
    generateAllRooms();
    generateEndings();
    await sleep(1000);
    document.getElementById('loading-screen').classList.add('hidden');
    gameLoop();
}

// generates all the rooms
function generateAllRooms() {
    generateExampleRooms();
    generateStartingRooms();
    generateEscapeRooms();
}

// generates the example rooms
function generateExampleRooms() {

    // add styles to text by doing [identifier: + any valid css color + ]
    // to reset that style, just do [identifier:]. to reset all styles, do [:]
    // EX: [c:red] = [c:#ff0000] = [c:rgb(255,0,0)]
    // EX: [fi:blur(1px)] gives the text the filter: blur(1px) style
    // current identifiers: [c: color][ff: fontFamily][fs: fontSize][rt: rotate][ts: textShadow][an: animation][fi: filter][class: class][fst: fontStyle]

    let room = createRoom('Example Hub', { name: 'neutral.jpeg' });
    room.createChoice('Example Rooms')
        .addAction({type: 'changeRoom', parameters: ['Example Room']});
    room.createChoice('Particle Testing')
        .addAction({type: 'changeRoom', parameters: ['Example Room Particles']});
    room.createChoice('Battle Testing')
        .addAction({type: 'changeRoom', parameters: ['Example Room Battle']});

    room = createRoom('Example Room', { name: 'neutral.jpeg' });
    room.addStory(`This is a [an:text-blur 1s ease][c:red]test[c:] story`);
    room.addStory(`This is a [an:text-glow 1s ease infinite alternate][c:red]test[c:] [fi:blur(1px)]story[fi:] [c:#00ff00][ff:'Doto'][fs:24px]continued[:]!`, { speed: 100, variance: 33, animation: 'impact' });
    room.addStory(`[ts:2px 2px 2px white][c:#c5c5c5]Lorem [rt:90deg]ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et [rt:180deg]dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure [rt:270deg]dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui [rt:]officia deserunt mollit anim id est laborum.`, { speed: 10, variance: 3, animation: 'funky' });
    let choice1 = room.createChoice('Pick up item');
    choice1.addAction({ type: 'getItem', parameters: ['Example Item', 1, 10] });
    room.addStory(`This text only shows if you got at least 8 Example Items!`)
        .addRequirement({ mode: 'show', type: 'hasItem', parameters: ['Example Item', 8] });
    room.addStory(`Woah`, { speed: 500, variance: 100, animation: 'shaky' });
    room.addStory(`[c:rgb(0,255,255)]Cooleo![c:] This is a neat blur effect! I like it so much, I think I will put [c:yellow][fs:24px]more[:] text!`, { speed: 100, variance: 10, animation: 'blur' });
    room.addStory(`Or maybe try [c:rgb(136, 255, 0)]a[c:rgb(0, 255, 98)]l[c:rgb(136, 255, 0)]t[c:rgb(0, 255, 98)]e[c:rgb(136, 255, 0)]r[c:rgb(0, 255, 98)]n[c:rgb(136, 255, 0)]a[c:rgb(0, 255, 98)]t[c:rgb(136, 255, 0)]i[c:rgb(0, 255, 98)]n[c:rgb(136, 255, 0)]g[c:] text? This can do that too! Lets see how this looks like when it's long: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`, { speed: 50, variance: 10, animation: 'fade-alternate' });
    room.addStory("Let's have some choices now!", { waits: false, waitDelay: 0 });
    let choice2 = room.createChoice('Open door', { repeatable: true });
    choice2.addAction({ type: 'changeRoom', parameters: ['Example Room 2'] });
    choice2.addAction({ type: 'removeItem', parameters: ['Example Expendable Key'] });
    choice2.addRequirement({ mode: 'use', type: 'hasItem', parameters: ['Example Reusable Key'] });
    choice2.addRequirement({ mode: 'use', type: 'hasItem', parameters: ['Example Expendable Key'] });
    let choice3 = room.createChoice('Pick up key');
    choice3.addAction({ type: 'getItem', parameters: ['Example Reusable Key', 1, 1, '[class:text-glow green]', "yoyo, you got ye an [[class:text-glow green]Example Reusable Key[class:]] yo! Also, this is a [an:text-glow 1s ease infinite alternate][c:cyan]custom action message!"] });
    choice3.addRequirement({ mode: 'show', type: 'madeChoice', inverse: true, parameters: [choice3.id] });
    let choice4 = room.createChoice('Pick up another key', { repeatable: true });
    choice4.addAction({ type: 'getItem', parameters: ['Example Expendable Key'] });
    choice4.addRequirement({ mode: 'show', type: 'madeChoice', parameters: [choice3.id] });
    choice4.addRequirement({ mode: 'show', type: 'hasItem', inverse: true, parameters: ['Example Expendable Key'] });
    // choice5, with different syntax (not using a variable)
    room.createChoice('Touch spike')
        .addAction({ type: 'writeText', parameters: ['[c:yellow]Why did you touch that?', {elementID: 'action-output', waits: false}] })
        .addAction({ type: 'changeHP', parameters: [-5, -10] })
        .addAction({ type: 'changeMaxHP', parameters: [-1, -3] });
    room.createChoice('Look at squeegee')
        .addAction({ type: 'changeHP', parameters: [-9999, -9999, 'squeegee'] })
        .addAction({ type: 'writeText', parameters: ['I have no way to explain this', {elementID: 'story', clearsText: true}] });

    room = createRoom('Example Room 2', { name: 'savior.jpeg' });
    room.addStory('You made it into room 2! [fs:32px][an:text-impact 1000ms ease-in][fw:bold][c:yellow]YAY!');
    room.addStory('This room will auto advance to the next room without any choices!');
    room.addAction({ type: 'styleBG', parameters: ['[fi:grayscale(.2) blur(1px)]'] });
    room.addStory('In 3...', { waitDelay: 1000, waits: false });
    room.addAction({ type: 'styleBG', parameters: ['[fi:grayscale(.4) blur(4px)]'] });
    room.addStory('2...', { waitDelay: 1000, waits: false });
    room.addAction({ type: 'styleBG', parameters: ['[fi:grayscale(.6) blur(8px)]'] });
    room.addStory('1...', { waitDelay: 1000, waits: false });
    room.addAction({ type: 'changeBG', parameters: ['escape.jpeg', { waitsOut: true }] });
    room.addStory('El fin');
    room.addAction({ type: 'ending', parameters: ['Example Ending'] });
    
    // particle testing
    room = createRoom('Example Room Particles', { name: 'neutral.jpeg' });
    room.addAction({type: 'changeParticleAnimation', parameters: ['fog', 1, 1]});
    room.addStory('Lets try out some particles!');
    room.createChoice('Speed Up', {repeatable: true})
    .addAction({type: 'changeParticleSpeed', parameters: [.5]});
    room.createChoice('Slow Down', {repeatable: true})
    .addAction({type: 'changeParticleSpeed', parameters: [-.5]});
    room.createChoice('Strengthen', {repeatable: true})
    .addAction({type: 'changeParticleStrength', parameters: [.5]});
    room.createChoice('Weaken', {repeatable: true})
    .addAction({type: 'changeParticleStrength', parameters: [-.5]});
    let ashes = room.createChoice('Next Animation')
    ashes.addAction({type: 'changeParticleAnimation', parameters: ['ashes', 1, 1]});
    let smoke = room.createChoice('Next Animation')
    smoke.addAction({type: 'changeParticleAnimation', parameters: ['smoke top', 1, 1]});
    smoke.addRequirement({ mode: 'show', type: 'madeChoice', parameters: [ashes.id] })

    // battle testing
    room = createRoom('Example Room Battle', { name: 'neutral.jpeg' });
    room.addAction({type: 'encounter', parameters: [[
        new Enemy('Example Enemy', 10, 2, 5),
        new Enemy('Example Enemy 2', 20, 6, 10, 'This guy has a description, [c:green]Neat!')
    ],
    [
        {name: 'Example Reward', min: 1, max: 5},
        {name: 'Example Reward 2', min: 1, max: 5}
    ], 'a couple of example enemies'], waits: true})
    room.addAction({type: 'encounter', parameters: [[
        new Enemy('Weak Enemy', 10, 2, 2),
        new Enemy('OP Enemy', 200, 500, 500, `You [fst:italic]really[:] don't want to mess with this guy`),
        new Enemy('Enemy 3', 1, 1, 1),
        new Enemy('Enemy 4', 1, 1, 2),
        new Enemy('Enemy 5', 1, 1, 4),
        new Enemy('Enemy 6', 1, 1, 5),
        new Enemy('Enemy 7', 1, 1, 8)
    ], [
        {name: 'Wacky Thing', min: 1, max: 1}
    ], 'The Wacky Gang'], waits: true})
}

function generateStartingRooms() {
    let room = createRoom('b-start', { name: 'neutral.jpeg' }); // beginning-1
    room.addStory(`Danger is imminent. You, among two others, were the only ones smart enough to take precautions. Now, you stand before your cryopod, ready to bid your conciousness farewell.`);
    room.addStory(`Step into the pod?`, { waits: false });
    let choice1 = room.createChoice("Enter.", {customID: 'enter-pod'});
    choice1.addAction({ type: 'changeRoom', parameters: ['b-2-pods'] });
    let choice2 = room.createChoice("Chicken out.");
    choice2.addAction({ type: 'ending', parameters: ['stayed behind'] });

    room = createRoom('b-2-pods', { transition: { out: '', in: '' } }); // beginning-2
    room.addStory(`You get hit with a strong sense of deja vu, but you continue onwards.`)
        .addRequirement({mode: 'show', type: ()=> history.resets > 0 && game.madePastChoice('enter-pod')}); // only shows when having done this in a previous run
    room.addAction({ type: 'styleBG', parameters: ['[an:blur-out 5s ease-out,fade-out 5s ease-out][fi:blur(16px)][op:0]'] });
    room.addStory(`And so you let yourself fade away, no longer within the world...`, { waits: false, waitDelay: 2000, speed: 70, animation: 'blur' });
    room.addAction({ type: 'changeBG', parameters: ['destruction.jpeg', { out: '', in: '' }] });
    room.addAction({ type: 'styleBG', parameters: ['[an:blur-in 2s ease-out,fade-in 2s ease-out][fi:][op:]'] });
    room.addStory(`...until [fw:bold][an:text-glow 1s ease infinite alternate][c: red]now.`, { speed: 100, waits: false, waitDelay: 1000 });
    room.addStory(`Your hearing is the first of your senses to return. Alarms blare in your ears, followed by the whoosh of air and a soft click.`);
    room.addStory(`Next comes your sight. Once the steam clears, the cryopod door creaks open to the now run-down lab. Red lights are flashing through the room, presumably the whole building as well.`);
    room.addStory(`Stepping out of the pod, it appears that yours was the only one to be well-maintained. The other two pods are rusty and broken, with the glass shattered and labels long faded.`);
    room.addStory(`In fact, you can barely make out your own name on the scratchy, old label.`);
    room.addStory(`[c:var(--Gali)]"Gali."`, { waits: false, waitDelay: 1500, speed: 50 });
    room.addStory(`There doesn't seem to be much left to do or see. Anything that once was is long gone.`, { waits: false });
    choice1 = room.createChoice("Leave the lab.");
    choice1.addAction({ type: 'changeRoom', parameters: ['b-3-hallways'] });
    choice2 = room.createChoice(`Go back to sleep.`, {repeatable: true});
    choice2.addAction({ type: 'writeText', parameters: ['[c:yellow]The cryopod zaps you, clearly malfunctioning', {elementID: 'action-output', waits: false, speed: -1}] });
    choice2.addAction({type: 'changeHP', parameters: [-10, -15, 'cryopod']});

    room = createRoom('b-3-hallways', { name: '', transition: { out: '', in: '' } }); // beginning-3
    room.addStory(`After just a bit of effort, the doors (usually automatic, you remember) give way, leading you to three different corridors.`);
    room.addStory(`Unfortunately, your memory of the layout is hazy at best. To be fair, you HAD been quite nervous at the time, keeping your eyes lowered throughout the walk. If only you had paid more attention...`);
    room.addStory(`[c:var(--escape)]Left, [c:var(--destruction)]right, [c:]or [c:var(--savior)]straight ahead?`);
    choice1 = room.createChoice("Go left.");
    choice1.addAction({ type: 'changeRoom', parameters: ['e-start'] }); //escape route
    choice2 = room.createChoice("Go right.");
    choice2.addAction({ type: 'changeRoom', parameters: ['d-start'] }); //destruction route
    let choice3 = room.createChoice("Go straight.");
    choice3.addAction({ type: 'changeRoom', parameters: ['s-start'] }); //savior route

    room = createRoom(`b-return`, { name: 'neutral.jpeg' }); // changed mind at some point
    room.addStory(`Returning to the lab, you find that the way back to your cryopod is now blocked off. The ceiling has collapsed, and the only way back out is through one of the other hallways.`);
    room.addStory(`You can either go [c:var(--escape)]left, [c:var(--destruction)]right, [c:]or [c:var(--savior)]straight ahead.`);
    // choice1 = room.createChoice("Go left.");
     // .addRequirement({ mode: 'show', type: 'madeChoice', parameters: []});
}
// Escape
function generateEscapeRooms() {
    let room = createRoom('e-start', {name: 'escape.jpeg'});
    room.addStory(`Heading to the [c:var(--escape)]left, [c:]you don't seem to recognize much of the place. It's completely trashed.`);
    room.addStory(`Everything here has been ransacked. Any cabinets that used to be here are rusted and broken down. One's even melted, leaning to its side.`);
    room.addStory(`It doesn't seem like there's much in the room that's worth—`, {waits: false, waitDelay: 1000});
    room.addAction({type: 'styleBG', parameters: ['[an:shake 70ms 9 linear alternate][sc:1.2]']});
    room.addStory(`[fst:italic][c:var(--dialogue)]"Rgh—!!"`);
    room.addStory(`[c:''][fst:'']...Is [c:var(--character)]someone [c:'']here?`);
    room.addStory(`[fst:italic][c:var(--actions)](Rustle, rustle...)`, {animation: 'fade-alternate'});
    room.addStory(`You whip your head around just in time to catch [c:var(--character)]the figure of another person, [c:]currently leaping through the broken window across the room.`);
    room.addStory(`Another survivor?`);
    let choice1 = room.createChoice(`After them!`);
    choice1.addAction({type: `changeRoom`, parameters: ['e-outside']});

    room = createRoom('e-outside');
    room.addStory(`Minding the glass, you hop through the hole in the wall, dashing to catch up with the mystery figure.`);
    room.addStory(`They stop just up ahead, regrouping with about four to five others.`);
    room.addStory(`And off to the side, they...`);
    room.addStory(`Woah.`);
    room.addStory(`That's a [c:var(--Gali)]whole spaceship.`);
    room.addStory(`Is that theirs, or has that always been there?`);
    choice1 = room.createChoice(`Run towards the ship.`);
    choice1.addAction({type: `changeRoom`, parameters: [`e-ship`]});
    let choice2 = room.createChoice(`Approach the group.`);
    choice2.addAction({type: `changeRoom`, parameters: [`e-goodFaction`]});

    room = createRoom(`e-ship`, {name: `escape.jpeg`});
    room.addStory(`Luckily, the ship's doors appear to be unlocked.`);
    room.addStory(`It's quite roomy for the amount of people that you've previously seen. Some of the interior's wiring is exposed, as if they'd run out of material midway through building the thing.`);
    choice1 = room.createChoice(`Have a look around.`);
    room.addStory(`Oh, neat! It appears they have a nice little storage rack set up in the corner. There's plenty of new, futuristic (at least, on your end) foods at your disposal.`);
    room.addStory(`And yeah, it doesn't belong to you, but...`);
    room.addStory(`In your defense, you've been starving for decades...`);
    room.addAction({type: `getItem`, parameters: [`Astrostew`, 1, 5]});
    choice1 = room.createChoice(`Quit being nosy.`);
    room.addStory(`You got quite a few stews!`)
        .addRequirement({ mode: 'show', type: 'hasItem', parameters: ['Astrostew', 4] });
    room.addStory(`Perhaps it is best if you leave, though.`)
    room.addStory(`You turn around, stuffing your pockets—`);
    room.addStory(`[fst:italic][c:var(--actions)](Whoosh!)`);
    room.addAction({type: 'styleBG', parameters: ['[an:shake 50ms 7 linear alternate][sc:1.2]']});
    room.addStory(`[fst:italic][c:var(--actions)](DONK!)`);
    room.addAction({type: 'styleBG', parameters: ['[an:blur-out 3s ease-out,fade-out 5s ease-out][fi:blur(10px)][op:0][sc:1.2]']});
    room.addAction({type: 'changeHP', parameters: [-5]})
    room.addStory(`[an:text-shiver .3s ease-in-out infinite alternate]Your head hurts...`, {waits: false, waitDelay: 4500});
    room.addAction({type: 'changeRoom', parameters: ['e-goodFaction']});

    room = createRoom(`e-goodFaction`, {name: `escape.jpeg`});
    room.addStory(`In front of you stands a small, inter-species group of survivors.`);
    room.addStory(`They all raise their weapons, which are crudely built from scraps and duct taped together.`);
    room.addStory(`Their [c:var(--character)]leader, [c:]a tall, cloaked figure, steps forward. The faintest glimpse of purple peeks out from under their burlap hood, glimmering in the Viremian sunlight.`);
    room.addStory(`[c:var(--dialogue)][fst:italic][fs:30px]"You."`, {speed: 350, waits: false, waitDelay:2500});
    room.addStory(`Their spear is pointed towards your chest.`);
    room.addStory(`[c:var(--dialogue)]"Where did you come from? Why are you following me? Who sent you here?"`);
    room.addStory(`The other four continue to circle around you, gazes intense. It's like they're throwing daggers straight into you with their eyes.`);
    choice1 = room.createChoice(`Stay calm and explain yourself.`);
    choice1.addAction({type: 'changeRoom', parameters:['e-gfCareful']});
    choice2 = room.createChoice(`Refuse to be intimidated by this riff-raff.`)
    choice2.addAction({type: 'changeRoom,', parameters: ['e-gfSarcastic']});

    room = createRoom(`e-gfCareful`, {name: 'escape.jpeg', transition: { out: '', in: '' }});
    room.addStory(`You raise your hands up in front of you, attempting to appear peaceful. As you open your mouth to speak, the leader thrusts the spear further. The head is just barely poking at your faded jumpsuit.`);
    room.addStory(`As you recall how you'd first seeked safety in the cryopod, the leader's stance seems to soften a bit.`);
    room.addStory(`They let their guard down further the more you talk, their gaze drifting to the crumbling lab behind you.`); 
    room.addStory(`Slowly, they pull their hood back, revealing their iridescent, choppy hair and purple scales.`);
    room.addStory(`[c:var(--dialogue)]"So [fst:italic]you're [fst:][c:var(--Gali)]Project Permafrost.[c:var(--dialogue)]"`);
    room.addStory(`You tilt your head in confusion, squinting at the rogue survivor.`);
    room.addStory(`Sensing your puzzlement, they approach you, glancing up and down at your figure.`);
    room.addStory(`[c:var(--dialogue)]"Of course! [fst:italic]now [fst:]I recognize the uniform. You were..."`);
    room.addStory(`[c:var(--Gali)]Gali, [c:]you state.`);
    room.addStory(`[c:var(--dialogue)]"Right, right."`);
    room.addStory(`[c:var(--dialogue)]"I was in the pod to [c:var(--Gali)]your left, [c:var(--dialogue)]I believe."`);
    room.addStory(`With their weapon tucked safely away, the leader signals for the others to lower theirs as well.`);
    room.addStory(`[c:var(--dialogue)]"You can call me [c:var(--character)]Idelle.[c:var(--dialogue)]"`);
    room.addStory(`[c:var(--actions)][fst:italic]You and [c:var(--character)]Idelle [c:var(--actions)]are now acquainted.`)
    room.addStory(`[c:var(--dialogue)]"You should have been released years ago, Gali."`);
    room.addStory(`[c:var(--dialogue)]"They let me and that other fellow go after the 60-year contract was up. They couldn't get your pod to open at the time, so..."`);
    room.addStory(`...So you were [an:text-funky][c:var(--destruction)]abandoned, [an:][c:]it seems.`, {speed: 70, waits: false, waitDelay:2500});
    choice1 = room.createChoice(`Ask how long you've been frozen.`);
    room.addStory(`[c:var(--character)]Idelle [c:]gives a sheepish frown, awkwardly patting your shoulder.`);
    room.addStory(`[c:var(--dialogue)]"Oh, I don't know. Just about, erm...an extra...few..."`);
    room.addStory(`[fw:bold][fs:30px][c:var(--dialogue)][an:text-shiver .65s ease-in-out infinite alternate]"...fifteen years?"`, {speed: 65});
    room.addStory(`She moves on without giving you so much as a second to process that little tidbit.`);
    room.addStory(`[c:var(--dialogue)]"It's a good thing you're out now, I suppose. We were just popping through the area to see if there was anything worth taking."`);
    room.addAction({type: 'changeRoom', parameters: ['e-offer']});

    room = createRoom(`e-gfSarcastic`, {name: 'escape.jpeg'});
    room.addStory(``);

    room = createRoom(`e-offer`, {name:'escape.jpeg', transition: {out: '', in: ''}});
    room.addStory(`Continuing to eye you a little, she appears to be lost in thought.`);
    room.addStory(`[c:var(--character)]Idelle [c:]hums to herself, insert more story here`);
    room.addStory(`[c:var(--dialogue)]"You know, this place is gonna blow to bits any day now.`);
    room.addStory(`"It won't do you any good if you stay here."`);
    room.addStory(`"After all, just look at the state of the lab now. Who knows what could have happened if your pod hadn't opened now?"`);
    room.addStory(`Glancing over your shoulder, the lab appears to be in a much worse state than you'd thought from the inside. As if on cue...`);
    room.addStory(`(CRASH!)`);
    room.addStory(`...one of the walls collapses, sending a cloud of dust and debris flying.`);
    room.addStory(`With a sigh, [c:var(--character)]Idelle [c:]gestures to the wreckage.`);
    room.addStory(`"Case in point."`);
    room.addStory(`She turns to the group, who are still standing around, weapons at the ready.`);
    room.addStory(`"We were just about to head out, but...I suppose we could do with a plus one."`);
    room.addStory(`[c:var(--character)]Idelle [c:]looks back at you, her expression softening.`);
    room.addStory(`"We're still gathering up quite a bit of supplies, and we could use the extra help. Besides, it's not like you have much of a chance here."`);
    room.addStory(`The other four survivors are still eyeing you suspiciously, weapons at the ready. They don't seem like they plan on being very welcoming.`);
    room.addStory(`Meanwhile, [c:var(--character)]Idelle [c:]is still waiting for your answer, hand outstretched towards you.`);
    choice1 = room.createChoice(`Go with Idelle, your life depends on it.`);
    choice1.addAction({type: 'changeRoom', parameters: ['e-taskList']});
    choice2 = room.createChoice(`You don't know these people. Stay behind.`);
    choice2.addAction({type: 'changeRoom', parameters: ['b-return']});

    room = createRoom(`e-taskList`, {name: 'escape.jpeg', transition: {out: '', in: ''}});
    room.addStory(`You take a deep breath and step forward, shaking [c:var(--character)]Idelle's [c:]hand.`);
    room.addStory(`She smiles while the crew lower their weapons.`);
    room.addStory(`"Welcome aboard, Gali."`);
    room.addStory(`"Now then—"`);
    room.addStory(`[c:var(--character)]Idelle [c:]gestures to the ship.`);
    room.addStory(`"You can start by helping us gather supplies. We need to stock up before we leave, and there's still a bit of...[fst:italic]renovation,[fst:] we'll call it...to do."`);
    room.addStory(`You must gather the following items:`);
    room.addStory(`- 1 FUEL CANISTER`);
    room.addStory(`- 1 MICROCHIP`);
    room.addStory(`- 5 SCRAP METAL`);
    room.addStory(`- 15 FOOD PACKS`);
    room.addStory(`- MEDICAL KITS`);
    room.addStory(`[c:var(--character)]Idelle [c:]drags some kind of...thing out of the ship, pushing what appears to be a big hunk of metal towards you.`);
    room.addStory(`"Here. Call it a welcome gift."`);
    room.addStory(`Explore the wasteland and gather supplies for the ship.`);

}

// endings
function generateEndings() {
    let ending = createEnding('Example Ending', { transition: { out: '', in: '' } });
    ending.addStory('Yay! You reached the end!', { waitDelay: 500, waits: false });

    ending = createEnding('stayed behind');
    ending.addStory('[c:#bf1b1b][an:text-shiver .25s ease-in-out infinite alternate]Your loss,[:] I guess.');
    ending.addStory(`You didn't live long enough to tell the story.`, { waits: false });

    ending = createEnding('default death');
    ending.addStory('[c:#bf1b1b][an:text-shiver .25s ease-in-out infinite alternate]You Died.', { waits: false });

    ending = createEnding('slain by enemy');
    ending.addStory('You got killed by an enemy. [c:#bf1b1b][an:text-shiver .25s ease-in-out infinite alternate]How unfortunate...', { waits: false });

    ending = createEnding('squeegee death');
    ending.addStory('You got killed by a squeegee? How???', { waits: false });

    ending = createEnding('cryopod');
    ending.addStory(`How sad. The very thing that once kept you safe [c:#bf1b1b][an:text-shiver .25s ease-in-out infinite alternate]has now led to your demise.`, {waits: false});
}

// preloads images
function preloadImages() {
    preloadImage('imgs/backgrounds/destruction.jpeg');
    preloadImage('imgs/backgrounds/escape.jpeg');
    preloadImage('imgs/backgrounds/neutral.jpeg');
    preloadImage('imgs/backgrounds/savior.jpeg');
}

function preloadImage(src) {
    let img = new Image();
    img.src = src;
}


window.addEventListener('DOMContentLoaded', () => {
    init();
})
