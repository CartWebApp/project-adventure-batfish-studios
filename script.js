
// imports Reactor class for reactive values
import { Reactor } from './scripts/Reactor.js';
import { CanvasHandler } from './scripts/CanvasOverlay.js';
import { Consumable, Item } from './scripts/Item.js';

// imports general use functions and sets their namespace to this window
import * as fnExports from './scripts/Functions.js';
Object.entries(fnExports).forEach(([name, exported]) => window[name] = exported);

let devMode = false;

let player;
let textController; // makes text writing cancellable
let textControllerSignal;
let textCancelled = false;
let game;
let history;
let itemData;
let particleHandler;

const parsableStyles = [
    {name: 'reset', identifier: ''}, // parses for full style resets (removes all styles). Syntax is [:]
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
        this.rooms = {};
        this.currentRoom = '';
        this.isGameLoop = true;
        this.currentEnding = 'unset';
        this.endings = {}; // holds the possible ending names and text
        this.leaveChoices = false; // choices get left if this is true
        this.startingRoom = 'b-start'; // [ 'Example Hub' ][ 'b-start' ]
        this.runNumber = -1;
    }

    // Gives an item to the player's inventory
    getItem(itemName, min=1, max=0, style = '', customMessage = '') {
        max = max || min;
        let count = random(min, max);
        let messages = [];
        style = style || itemData?.[itemName]?.style || '[c:var(--item-color)]';
        let item;
        if (!(itemName in itemData)) {
            item = new Item({name: itemName, count, type: 'generic', description: 'An item', style: style});
        } else if (itemData[itemName].type === 'generic') {
            item = new Item({count, style, ...itemData[itemName]});
        } else if (itemData[itemName].type === 'consumable') {
            item = new Consumable({count, style, ...itemData[itemName]});
        }
        player.addItem(item);
        if (count > 1) {
            messages.push(customMessage || `Obtained [${style + itemName}[:]] X ${count}`);
        } else {
            messages.push(customMessage || `Obtained [${style + itemName}[:]]`);
        }
        return { messages };
    }

    // leaves the current choice block
    leaveChoice() {
        game.leaveChoices = true;
    }

    // changes the players health
    changeHP(min, max, cause='default', customMessage = '') {
        max = max ?? min;
        let amount = random(min, max)
        let messages = [];
        player.changeHP(amount);
        if (player.hp <= 0) {
            game.currentEnding = game.endings[cause] ? cause : 'default death';
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
    if (!game.rooms[room]) {
        typeText('This room does not exist', {element: document.getElementById('action-output')});
        return;
    }
        history.addRoom(room);
        game.currentRoom = game.rooms[room];
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
    async writeText(text, options, speed, variance, animation, waits, waitDelay, skippable, maxUses, elementID = 'story', clearsText = false) {
        elementID = options.elementID ?? elementID;
        let textObj = new StoryObject(text, options, speed, variance, animation, skippable, waits, waitDelay, maxUses);
        if (clearsText) clearText(document.getElementById(elementID));
        await typeText(textObj.text,{}, document.getElementById(elementID), textObj.speed, textObj.variance, true, document.getElementById('dialogue-box'), textObj.animation, textControllerSignal, textObj.waits, textObj.waitDelay)
    }

    // has a given chance to return true
    chanceRoll(chance) {
        return chance >= random(0, 100, 10);
    }

    // a chance to initiate combat
    async encounter(enemies, rewards, groupName) {
        let battle = new Battle({enemies, rewards, groupName})
        await battle.encounter(game.runNumber);
    }

    // // a chance to initiate combat
    //  async randomEncounter(enemyPool, rewardPool, groupName) {
    //     let battle = new Battle({enemies, rewards, groupName})
    //     await battle.encounter(runNumber);
    //     [
    //         {
    //             enemy: new Enemy('enemy 1', 10, 10, 10),
    //             weight: 10
    //         }, 
    //         {
    //             team: [
    //             new Enemy('enemy 1', 10, 10, 10),
    //             new Enemy('enemy 2', 10, 10, 10)
    //             ],
    //             weight: 10
    //         }
    //     ]
    // }

    // initiates an ending
    async ending(endType) {
        game.isGameLoop = false;
        game.currentEnding = game.endings[endType];
        if (!history.endings.includes(endType)){
            game.currentEnding.createChoice('Restart')
                .addAction({ type: 'restart'});
        }
        history.addEnding(endType);
        clearDialogueText();
        for (const item of game.currentEnding.queuelist) {
            if (item.type === 'story') {
                clearText(document.getElementById('story'));
                await showStory(item.value);
                clearText(document.getElementById('action-output'));
            } else if (item.type === 'choicelist') {
                let selectedChoices = [];
                while (getShownChoices(item.value, selectedChoices).length > 0) {
                    showChoices(item.value, document.getElementById('choices'), selectedChoices);
                    let selectedChoice = await tryChoices(document.getElementById('choices'));
                    selectedChoices.push(selectedChoice);
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
        game.isGameLoop = false;
        history.resets += 1;
        game.runNumber += 1;
        history.softReset();
        document.getElementById('history-content').innerHTML = '';
        await sleep(10);
        this.start();
    }

    // begins the game
    async start() {
        player = new Player();
        if (devMode) {
            game.getItem('Super Health Maximiser', 10);
            game.getItem('Super Strength Maximiser', 10);
            game.getItem('Super Agility Maximiser', 10);
        }
        game.changeParticleAnimation('none', 1, 1);
        generateAllRooms();
        game.currentRoom = game.rooms[game.startingRoom];
        document.getElementById('background-image').src = 'imgs/backgrounds/transparent.png';
        clearDialogueText();
        game.isGameLoop = true;
        gameLoop();
    }

    // Returns whether the player has an item in their inventory
    hasItem(itemName, minCount = 1, customMessage = '') {
        for (const invItem of Object.values(player.inventory)) {
            if (invItem.name === itemName && invItem.count >= minCount)
                return true;
        }
        let itemStyle = itemData?.[itemName]?.style ?? '[c:var(--item-color)]';
        let message = customMessage || `You do not have [${itemStyle + itemName}[:]]`;
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

    // returns whether the player has a stat within a given range [CASE SENSITIVE]
    hasStat(statName, minStat=0, maxStat=Infinity) {
        return player[statName] >= minStat && player[statName] <= maxStat }
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
        this.textConfig = this.textConfig ?? {element: this.outputContainer, speed: 0, skipElement: this.advanceElement, skippable: true};
        this.enemies = this.enemies.map(enemy => enemy.clone());
        this.remainingEnemies = this.enemies;
    }

    async encounter(currentRunNumber) {
        let selectedChoice;
        let menuChoices = [
            new Choice('Fight', {speed: -1}),
            new Choice('Item', {speed: -1}),
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
            if (currentRunNumber != game.runNumber) return;

            // check what option is clicked, and run that function
            if (selectedChoice === 'fight') {
                let result = await this.selectEnemy('fight', 'Which enemy will you attack?');
                if (this.remainingEnemies.length === 0) break;
                if (result != 'cancelled') await this.enemyTurn();
            } else if (selectedChoice === 'inspect') {
                await this.selectEnemy('inspect', 'Which enemy will you inspect?');
            } else if (selectedChoice === 'item') {
                await this.selectItem();
            }
            if (currentRunNumber != game.runNumber) return;
        }

        // end of fight
        if (player.hp > 0) {
            // loot!
            this.getRewards();
            await awaitClick(this.advanceElement);
            clearDialogueText();
        }
    }

    // shows the items the player can use
    async selectItem() {
        clearDialogueText();
        typeText('What item would you like to use?', {...this.textConfig});
        let choices = [];
        choices.push(new Choice('Back', {speed: -1, value: 'previous', color: '[c:var(--back-color)]'}))
        for (const item of Object.values(player.inventory)) {
            if (item.type != 'consumable') continue;
            choices.push(new Choice(item.name, {speed: -1, value: item.name, color: 'var(--item-color)'}));
        }
        showChoices(choices, this.inputContainer);
        let selectedChoice = await tryChoices(this.inputContainer);
        if (selectedChoice.value === 'previous') return;
        let selectedItem = player.inventory[selectedChoice.value];
        if (!selectedItem) return;
        let result = selectedItem.use(player);
        clearDialogueText();
        for (const message of result) {
            typeText(message, {...this.textConfig});
        }
        await typeText('', {...this.textConfig, waits: true})
    }
    
    // shows the remaining enemies to select
    async selectEnemy(action, text='Which enemy?') {
        clearDialogueText();
        typeText(text, {...this.textConfig});
        let selectedEnemy;
        let choices = [];
        choices.push(new Choice('Back', {speed: -1, value: 'previous', color: '[c:var(--back-color)]'}))
        for (const enemy of this.remainingEnemies) {
            choices.push(new Choice(enemy.name, {speed: -1, value: enemy, color: 'orange'}));
        }
        showChoices(choices, this.inputContainer);
        let selectedChoice = await tryChoices(this.inputContainer);
        if (selectedChoice.value === 'previous') return 'cancelled';
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
        typeText(`You delt [class:health]♥${finalAttack}[:] damage to [c:var(--enemy-name)]${enemy.name}.`, {...this.textConfig});
        await typeText(`Remaining enemy health: [class:health]♥${enemy.hp}`, {...this.textConfig, waits: true});
    }

    async enemyTurn() {
        clearDialogueText();

        // select random enemy from alive enemies
        let enemy = this.remainingEnemies[random(0, this.remainingEnemies.length)];
        let baseAttack = enemy.getAttack();
        let defenceMulti = await this.timedDefense(enemy);
        let enemyAttack = Math.round(baseAttack / defenceMulti);
        game.changeHP(-enemyAttack, -enemyAttack, 'slain by enemy')
        typeText(`[c:var(--enemy-name)]${enemy.name}[:] delt [class:health]♥${enemyAttack}[:] damage.`, {...this.textConfig});
        await typeText(`Remaining health: [class:health]♥${player.hp}`, {...this.textConfig, waits: true});
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
        let multi = 2 - (offset * 1.4) ** .5;
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

        await Promise.race([animation.finished, awaitEvent(this.advanceElement, 'click')])
        
        let offset = Math.abs(1 - getComputedStyle(indicator).scale)
        indicator.style.scale = getComputedStyle(indicator).scale;
        animation.cancel();

        if (offset < 1) {
            animation = this.advanceElement.animate([
                {translate: '-15px -5px'},
                {translate: '15px 5px'},
                {translate: '15px -5px'},
                {translate: '15px -5px'},
                {translate: '-15px -5px'}
            ], {
                duration: 70,
                iterations: 3
            })
            await animation.finished;
        }
        await sleep(200);
        target.remove();
        return offset;
    }

    // displays an enemies info
    async inspectEnemy(enemy) {
        clearDialogueText();
        typeText(`Name: [c:var(--enemy-name)]${enemy.name}`, {...this.textConfig});
        if (enemy.desc) typeText(`Description: [c:#eeeeee]${enemy.desc}`, {...this.textConfig});
        typeText(`[class:health]HP: ♥${enemy.hp} / ♥${enemy.maxHP}`, {...this.textConfig});
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
class Player extends Character {
    constructor(hp=100, strength=10, agility=10) {
        super('Player', hp, strength, agility);
        this._inventory = new Reactor({});
        this._maxHP.bindQuery('#stat-maxHP', "var(--element-change-animation)");
        this._hp.bindQuery('#stat-hp', "var(--element-change-animation)");
        this._strength.bindQuery('#stat-strength', "var(--element-change-animation)");
        this._agility.bindQuery('#stat-agility', "var(--element-change-animation)");
        this._inventory.subscribe(() => this.refreshInventory(this));
        this.usedItems = new Set();
        this.selectedItem;
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
    addItem(item) {
        let newInv = this._inventory.value;
        if (!newInv[item.name]) {
            newInv[item.name] = item
        } else {
            newInv[item.name].count += item.count;
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
    refreshInventory(player) {
        const inventory = document.getElementById('inventory');
        inventory.innerHTML = '';

        if (!player.inventory[player.selectedItem]) {
            document.getElementById('item-description').innerHTML = '';
            document.getElementById('item-actions').innerHTML = '';
        }

         // TODO
        // if item is in inv but not in oldInv, add the element
        // if item is not in inv but is in oldInv, remove the element
        // find the element with the item name
        // for (const invItem of object) {
            
        // }

        // repopulates inventory gui
        for (const item of Object.values(player.inventory)) {
            const itemElement = document.createElement('p');
            itemElement.className = 'item-container flex wrap';
            itemElement.itemName = item.name;
            const nameElement = document.createElement('output');
            nameElement.className = 'item-name';
            const formattedText = formatText(item.style + ' ' + item.name);
            formattedText.className = 'flex wrap';
            nameElement.appendChild(formattedText);
            const countElement = document.createElement('output');
            itemElement.appendChild(countElement);
            countElement.outerHTML = `[<output class="item-count">${item.count}</output>]`;
            itemElement.appendChild(nameElement);
            inventory.appendChild(itemElement);

            itemElement.addEventListener('click', (e)=> {
                this.selectItem(item)
            })
        }
    }

    // shows an item's description and available actions in the inventory
    selectItem(item) {
        this.selectedItem = item;
        let descriptionElement = document.getElementById('item-description');
        let actionsElement = document.getElementById('item-actions')

        descriptionElement.innerHTML = '';
        actionsElement.innerHTML = '';
        
        let formattedText = formatText(`${item.style + item.name}`);
        formattedText.className = 'flex wrap';
        formattedText.style.fontSize = '1.5rem';
        document.getElementById('item-description').appendChild(formattedText);

        formattedText = formatText(item.description);
        formattedText.className = 'flex wrap';
        document.getElementById('item-description').appendChild(formattedText);

        if (item.type === 'consumable') {
            let useButton = document.createElement('button');
            useButton.type = 'button';
            useButton.className = 'choice';
            useButton.textContent = 'Use';

            if (this.usedItems.has(item.name) || item.hideEffects === false) {
                for (const effect of item.getEffects()) {
                    let effectDesc = formatText(effect);
                    effectDesc.className = 'flex wrap';
                    descriptionElement.appendChild(effectDesc);
                }
            } else {
                let effectDesc = formatText(`[[c:yellow]Use to unlock effect description[:]]`);
                effectDesc.className = 'flex wrap';
                descriptionElement.appendChild(effectDesc);
            }

            actionsElement.appendChild(useButton);
            useButton.addEventListener(('click'), ()=> {
                item.use(this);
                if (item.count > 0) {
                    this.selectItem(item)
                } else {
                    descriptionElement.innerHTML = '';
                    actionsElement.innerHTML = '';
                    for (const effect of item.getEffects()) {
                        let effectDesc = formatText(effect);
                        effectDesc.className = 'flex wrap';
                        descriptionElement.appendChild(effectDesc);
                    }
                }
            })
        }
        
    }

}

class Enemy extends Character {
    constructor(name, hp, strength, agility, desc) {
        super(name, hp, strength, agility, desc)
    }
}

/**
 * @typedef {Object} TextObjectConfig
 * @property {Number} speed - Delay in ms between each added character
 * @property {Number} variance - Random added delay between 0 and n
 * @property {String} animation - Animation for each character when getting added
 * @property {Boolean} skippable - Whether clicking the skip element can make it type faster
 */


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

    addRequirement(options, mode, type, parameters, inverse) {
        mode = options.mode ?? mode;
        type = options.type ?? type;
        inverse = options.inverse ?? inverse; // makes it required to NOT meet the requirement
        parameters = options.parameters ?? parameters ?? [];
        this.requirements.push(new Requirement({}, mode, type, parameters, inverse ));
        return this;
    }
}

class StoryObject extends TextObject {
    constructor(text, options, speed = 20, variance = 5, animation = 'default', waits = true, waitDelay = 0, skippable = true, maxUses = Infinity) {
        super(text, options, speed, variance, animation, skippable, waits, waitDelay);
        this.maxUses = this.maxUses ?? maxUses;
        this.usesLeft = this.maxUses;
    }
}

class Requirement {
    constructor(options, mode, type, parameters=[], inverse = false) {
        Object.assign(this, options);
        this.type = this.type ?? type;
        this.mode = this.mode ?? mode;
        this.parameters = this.parameters ?? parameters;
        this.inverse = this.inverse ?? inverse;
    }
}

class Action {
    constructor(type, parameters=[], waits=false, chance=100, maxUses=Infinity) {
        this.type = type;
        this.parameters = parameters;
        this.waits = waits;
        this.chance = chance;
        this.requirements = [];
        this.maxUses = maxUses;
        this.usesLeft = maxUses;
    }

    addRequirement(options, mode, type, parameters, inverse) {
        mode = options.mode ?? mode ?? 'use';
        type = options.type ?? type;
        inverse = options.inverse ?? inverse;
        parameters = options.parameters ?? parameters ?? [];
        this.requirements.push(new Requirement({}, mode, type, parameters, inverse ));
        return this;
    }
}


class Choice extends TextObject {

    /**
     * @typedef {Object} ChoiceConfig_
     * @property {Number} maxUses - The max number of times this choice can be selected in a run
     * @property {Room} room - The room that this choice is a part of
     * @property {String} id - Auto generated id
     * @property {String} customID - Custom id for reference use
     * @property {*} value - idk I don't remember
     * @property {String} color - The color of the choice
     * @property {Array} classList - Classes for the choice element
     * @property {Boolean} persistant - Whether the choice can be selected multiple times per room entrance
     * @typedef {TextObjectConfig & ChoiceConfig_} ChoiceConfig
     */

    /**
     * 
     * @param {string} text - The text that shows up on the choice element
     * @param {ChoiceConfig} options - Various configuration options
     */

    constructor(text, options={}) {
        let defaultParams = {
            maxUses:Infinity, speed:4, variance:1, animation:'default', skippable:true, room:undefined, id:'', customID:'', value:'', color:'', classList:[], persistant:false
        }
        let props = {}
        Object.assign(props, defaultParams, options);
        super(text, props, props.speed, props.variance, props.animation, props.skippable, true, 0);
        Object.assign(this, props);
        this.usesLeft = this.maxUses;
        this.actions = [];
        this.requirements = [];
    }

    addAction(options, type, parameters, waits, chance, maxUses) {
        type = options.type ?? type;
        parameters = options.parameters ?? parameters;
        waits = options.waits ?? false;
        chance = options.chance ?? chance;
        maxUses = options.maxUses ?? maxUses;
        this.actions.push(new Action(type, parameters, waits, chance, maxUses));
        return this; 
    }

    addRequirement(options, mode, type, parameters, inverse = false) {
        mode = options.mode ?? mode;
        type = options.type ?? type;
        inverse = options.inverse ?? inverse; // makes it required to NOT meet the requirement
        parameters = options.parameters ?? parameters ?? [];
        this.requirements.push(new Requirement({}, mode, type, parameters, inverse));
        return this;
    }

    hide() {
        this.hidden = true;
    }

}

class Room {
    constructor(name, bg) {
        this.name = name ?? '';
        this.bg = bg ?? {};
        this.bg.transition = this.bg.transition ?? { out: '[an:fade-out .5s ease]', in: '[an:fade-in .5s ease]', waitsOut: true, waitsIn: false }
        this.bg.transition.waitsOut = this.bg.transition.waitsOut ?? true;
        this.choices = [];
        this.storyParts = []; // gets displayed when entering a room
        this.actions = [];
        this.queuelist = []; // holds the order that everything in the room should happen
        if (this.bg) { this.addAction({ type: 'changeBG', parameters: [this.bg.name, this.bg.transition] }) }
    }

    // returns a copy of this room, optionally with its own name.
    copy(name) {
        name = name ?? this.name;
        let copiedRoom = new Room(name, this.bg);
        Object.assign(copiedRoom.queuelist, this.queuelist);
        Object.assign(copiedRoom.choices, this.choices);
        Object.assign(copiedRoom.actions, this.actions);
        Object.assign(copiedRoom.storyParts, this.storyParts);
        return copiedRoom;
    }

    // adds a choice to the room
    addChoice(choice) {
        this.choices.push(choice);
        const lastInQueue = this.queuelist[this.queuelist.length - 1];
        if (lastInQueue && lastInQueue.type === 'choicelist') {
            lastInQueue.value.push(choice);
        } else {
            this.queuelist.push({ type: 'choicelist', value: [choice]});
        }
    }

    /**@param {ChoiceParameters} options - Various configuration options */

    // creates a choice and automatically adds it to the room
    createChoice(text, options={}) {
        const id = this.getChoiceId(this.choices.length + 1);
        options.room = this;
        options.id = id;
        const choice = new Choice(text, options);
        this.addChoice(choice);
        return choice;
    }

    // returns the id of a choice given the choice number
    getChoiceId(choiceNumber) {
        return `${this.name}-${choiceNumber}`;
    }

    // adds a story line to the room
    addStory(text, options, speed, variance, animation, waits, waitDelay, skippable, maxUses) {
        let storyObject = new StoryObject(text, options, speed, variance, animation, skippable, waits, waitDelay, maxUses);
        this.storyParts.push(storyObject);
        this.queuelist.push({ type: 'story', value: storyObject });
        return storyObject;
    }

    // adds an action for a room
    addAction(options, type, parameters, waits, chance, maxUses) {
        type = options.type ?? type;
        parameters = options.parameters ?? parameters;
        waits = options.waits ?? waits ?? false;
        chance = options.chance ?? chance
        maxUses = options.maxUses ?? maxUses
        const action = new Action(type, parameters, waits, chance, maxUses);
        this.actions.push(action);

        const lastInQueue = this.queuelist[this.queuelist.length - 1]
        if (lastInQueue && lastInQueue.type === 'actionlist') {
            lastInQueue.value.push(action)
        } else {
            this.queuelist.push({ type: 'actionlist', value: [action] });
        }
        return this
    }

    // appends a queuelist to the rooms queuelist
    addQueuelist(queuelist, timing='end') {
        if (timing === 'start') {
            this.queuelist = [...queuelist, ...this.queuelist];
        } else if (timing = 'end') {
            this.queuelist = [...this.queuelist, ...queuelist];
        }
    }
}

// generates rooms in a grid pattern
class RoomGrid {
    constructor(options, name='', width=3, height=3, entrance=[0,0], showCoordinates=true) {
        Object.assign(this, options);
        if (!this.name) this.name = name;
        if (!this.width) this.width = width;
        if (!this.height) this.height = height;
        if (!this.entrance) this.entrance = entrance;
        if (typeof this.showCoordinates != 'boolean') this.showCoordinates = showCoordinates;
        this.grid = [];
        this.emptyTemplate = new Room();
        this.startQueuelist = [];
        this.endQueuelist = [];
        this.randomRooms = [];
        this.filledRooms = {};
        this.unusedCoords = [];
        this.iterateGrid((x, y)=> {
            this.unusedCoords.push([x, y]);
        })
    }

    // iterates a function through each grid cell (x,y coord)
    iterateGrid(fn) {
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                fn(x, y)
            }
        }
    }

    // generates a room(s) at a given coordinate or at random
    generateRoom(coords, bg, count=1) {
        let room;
        if (coords) {
            room = new Room(`${this.name}-${coords[0]}-${coords[1]}`, bg)
            this.filledRooms[coords[0] + '-' + coords[1]] = room;
            if (looseIndexOf(this.unusedCoords, coords) >= 0) {
                this.unusedCoords.splice(looseIndexOf(this.unusedCoords, coords), 1);
            }
        } else {
            room = new Room(``, bg)
            this.randomRooms.push({room, count})
        }
        return room;

    }

    // sets the template for empty rooms
    setDefaultRoom(room) {
        this.emptyTemplate = room;
    }

    // sets a queuelist that runs every time a room gets explored
    // one use is to set a leave condition by using actions that are not run unless certain conditions are met
    addQueuelist(timing, queuelist, requirements) {
        timing = timing ?? 'end'
        for (const queueItem of queuelist) {
            for (const requirement of requirements) {
                if (queueItem.type === 'story') {
                    queueItem.value.addRequirement(requirement);
                } else if (queueItem.type === 'actionlist') {
                    for (const action of queueItem.value) {
                        action.addRequirement(requirement);
                    }
                }
                else if (queueItem.type === 'choicelist') {
                    for (const choice of queueItem.value) {
                        choice.addRequirement(requirement);
                    }
                }
            }
        }

        if (timing === 'start') {
            this.startQueuelist.push(...queuelist)
        } else if (timing === 'end') {
            this.endQueuelist.push(...queuelist)
        }
    }

    generateDefaultRoom(coords) {
        let room = this.emptyTemplate.copy(`${this.name}-${coords[0]}-${coords[1]}`)
        return room;
    }

    // populates the grid with rooms
    populateGrid() {
        for (const rooms of this.randomRooms) {
            for (let i = 0; i < rooms.count; i++) {
                if (this.unusedCoords.length === 0) break;
                let room = rooms.room;
                let roomCoords = this.unusedCoords[random(0,this.unusedCoords.length - 1)];
                if (looseIndexOf(this.unusedCoords, roomCoords) >= 0) {
                    this.unusedCoords.splice(looseIndexOf(this.unusedCoords, roomCoords), 1);
                }
                let newRoom = room.copy(`${this.name}-${roomCoords[0]}-${roomCoords[1]}`);
                this.filledRooms[roomCoords[0] + '-' + roomCoords[1]] = newRoom;
            }
            if (this.unusedCoords.length === 0) break;
        }

        for (let x = 0; x < this.width; x++) {
            this.grid.push([]);
        }

        this.iterateGrid((x, y)=> {
            // adds predefined room or generated room to the grid
            let room;
            if (this.filledRooms[`${x}-${y}`]) {
                room = this.filledRooms[`${x}-${y}`];
            } else {
                room = this.generateDefaultRoom([x, y]);
            }
            this.grid[x].push(room);
        })

    }

    // connects the rooms by adding direction choices and injects queues to rooms
    connectRooms() {
        this.iterateGrid((x, y)=> {
            let room = this.grid[x][y];
            if (this.startQueuelist.length > 0) room.addQueuelist(this.startQueuelist, 'start');
            if (this.endQueuelist.length > 0) room.addQueuelist(this.endQueuelist, 'end');

            if (this.showCoordinates) {
                room.addStory(`Coordinates: [[c:yellow]${x}[:], [c:yellow]${y}[:]]`, {waits: false, speed: -1});
            }

            // adds move choice if there is a room in the target spot
            if (this.grid?.[x-1]?.[y]) {
                let westRoom = this.grid[x-1][y];
                room.createChoice(`Go West.`)
                    .addAction({type: 'changeRoom', parameters: [westRoom.name]});
            } else {
                room.createChoice(`Go West.`, {classList: ['disabled']});
            }
            if (this.grid?.[x]?.[y-1]) {
                let northRoom = this.grid[x][y-1];
                room.createChoice(`Go North.`)
                    .addAction({type: 'changeRoom', parameters: [northRoom.name]});
            } else {
                room.createChoice(`Go North.`, {classList: ['disabled']});
            }
            if (this.grid?.[x]?.[y+1]) {
                let southRoom = this.grid[x][y+1];
                room.createChoice(`Go South.`)
                    .addAction({type: 'changeRoom', parameters: [southRoom.name]});
            } else {
                room.createChoice(`Go South.`, {classList: ['disabled']});
            }
            if (this.grid?.[x+1]?.[y]) {
                let eastRoom = this.grid[x+1][y];
                room.createChoice(`Go East.`)
                    .addAction({type: 'changeRoom', parameters: [eastRoom.name]});
            } else {
                room.createChoice(`Go East.`, {classList: ['disabled']});
            }
        })
    }

    // adds the rooms to the global rooms variable
    deployRooms() {
        this.iterateGrid((x, y)=> {
            let room = this.grid[x][y];
            game.rooms[room.name] = room;
        })

        game.rooms[`${this.name}-start`] = this.grid[this.entrance[0]][this.entrance[1]]
    }

    // generates the grid. DO NOT CALL MORE THAN ONCE
    generateGrid() {
        this.populateGrid();
        this.connectRooms();
        this.deployRooms();
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

// creates a queueList given a list of stories, actions, and choices
function createQueuelist(itemList) {
    let queuelist = [];
    for (const item of itemList) {
        if (item.constructor.name === 'StoryObject') {
            queuelist.push({ type: 'story', value: item });
        } else if (item.constructor.name === 'Choice') {
            const lastInQueue = queuelist[queuelist.length - 1]
            if (lastInQueue && lastInQueue.type === 'choicelist') {
                lastInQueue.value.push(item.value)
            } else {
                queuelist.push({ type: 'choicelist', value: [item]});
            }
        } else if (item.constructor.name === 'Action') {
            const lastInQueue = queuelist[queuelist.length - 1]
            if (lastInQueue && lastInQueue.type === 'actionlist') {
                lastInQueue.value.push(item.value)
            } else {
                queuelist.push({ type: 'actionlist', value: [item] });
            }
        }
    }
    return queuelist;
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
        timing.delay = duration / count * i / 1;
            let animation = imageElement.animate(keyframes, timing);
            animation.startTime = -duration;
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
    game.rooms[newRoom.name] = newRoom;
    return newRoom;
}

// creates an ending and adds it to endings
function createEnding(name, bg) {
    const newEnding = new Ending(name, bg);
    game.endings[newEnding.name] = newEnding;
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
        if (!match) continue;
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
    skipElement = options.skipElement ?? skipElement ?? document.getElementById('dialogue-box');
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
            if (speed >= 0) {
                try {
                    await cancelableSleep(speed + random(0, variance), signal);
                } catch (error) {
                    let test = null;
                }
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
    if (story.usesLeft <= 0) return;
    if (!checkRequirements(story, 'show').metRequirements) return;
    const dialogueBox = document.getElementById('dialogue-box');
    const storyElement = document.getElementById('story');
    clearText(storyElement);
    await typeText(story.text,{}, storyElement, story.speed, story.variance, true, dialogueBox, story.animation, textControllerSignal, story.waits, story.waitDelay);
    const cleanText = parseStyles(story.text, 'This returns the clean text because nothing matches this.').text;
    history.addStory(cleanText);
    clearText(document.getElementById('action-output'));
    story.usesLeft -= 1;
}

// returns the choices that are displayed
function getShownChoices(choices, selectedChoices) {
    let shownChoices = []
    for (const choice of choices) {
        if (choice.hidden) continue;
        if (!checkRequirements(choice, 'show').metRequirements) continue;
        if (choice.usesLeft <= 0) continue;
        if (!choice.persistant && selectedChoices.indexOf(choice) != -1) continue;
        shownChoices.push(choice);
    }
    return shownChoices;
}

// diplays each choice to the dialogue box
async function showChoices(choices, container, selectedChoices=[]) {
    const dialogueBox = document.getElementById('dialogue-box');
    const choiceContainer = container ?? document.getElementById('choices');
    let choiceElements = [];
    let choiceTexts = [];

    let shownChoices = getShownChoices(choices, selectedChoices);

    for (let i = 0; i < shownChoices.length; i++) {
        const choice = shownChoices[i];
        let choiceElement = document.createElement('button');
        choiceElement.className = 'choice';
        for (const className of choice.classList) {
            choiceElement.classList.add(className);
        }
        choiceElement.style.color = choice.color;
        choiceElement.id = `choice-${i}`;
        choiceElement.object = choice;
        choiceContainer.appendChild(choiceElement);
        choiceElements.push(choiceElement);
        choiceTexts.push(choice.text);
        typeText(choice.text,{}, choiceElement, choice.speed, choice.variance, true, dialogueBox, choice.animation, textControllerSignal);
    }
}

// returns weather all the requirments are met to do something
function checkRequirements(object, mode = 'use') {
    let metRequirements = true;
    let messages = [];
    let result;
    for (const requirement of object.requirements) {
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
    let clickableChoices = []
    for (const choiceElement of choiceContainer.children) {
        if (choiceElement.classList.contains('disabled')) continue;
        clickableChoices.push(choiceElement);
        choiceElement.addEventListener('click', () => { selectedChoice = choiceElement.object })
    }
    await awaitClickList(clickableChoices);
    return selectedChoice;
}

// tries to run an action
async function attemptAction(action) {
    if (action.usesLeft <= 0) return;
    if (!game.chanceRoll(action.chance)) return;
    if (!checkRequirements(action, 'use').metRequirements) return;
    action.usesLeft -= 1;
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
    let currentRunNumber = game.runNumber;
    if (Object.prototype.toString.call(actions) != '[object Array]') actions = [actions];
    for (const action of actions) {
        if (currentRunNumber != game.runNumber) return;
        let actionResult = await attemptAction(action);
        if (actionResult && actionResult?.messages) {
            for (const message of actionResult.messages) {
                typeText(message,{}, document.getElementById('action-output'));
                const cleanText = parseStyles(message, 'This returns the clean text because nothing matches this.').text;
                history.addAction(cleanText);
            }
            if (action.waits) {
                await awaitClick(document.getElementById('dialogue-box'));
            }
        }
    }
}

// loops until a choice is selected that has all requirements met
async function tryChoices(choiceContainer, selectedChoices) {
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
    selectedChoice.usesLeft -= 1;
    return selectedChoice;
}

// repeats every room
async function gameLoop() {
    game.currentRoom = game.rooms[game.startingRoom];
    let currentRunNumber = game.runNumber;
    const choiceContainer = document.getElementById('choices');
    while (game.isGameLoop) {
        let thisRoom = game.currentRoom;
        for (const item of game.currentRoom.queuelist) {
            if (currentRunNumber != game.runNumber) return;
            if (player.hp <= 0) {
                game.ending(game.currentEnding);
                return;
            }
            if (item.type === 'story') {
                await showStory(item.value);
            } else if (item.type === 'choicelist') {
                let selectedChoices = [];
                game.leaveChoices = false;
                while (game.isGameLoop && getShownChoices(item.value, selectedChoices).length > 0 && thisRoom === game.currentRoom && !game.leaveChoices) {
                    game.leaveChoices = false;
                    if (player.hp <= 0) {
                        game.ending(game.currentEnding);
                        return;
                    }
                    showChoices(item.value, choiceContainer, selectedChoices);
                    let selectedChoice = await tryChoices(choiceContainer);
                    selectedChoices.push(selectedChoice);
                    clearText(document.getElementById('action-output'))
                    clearText(document.getElementById('choices'))
                    await attemptActionsWithText(selectedChoice.actions);
                }
            } else if (item.type === 'actionlist') {
                await attemptActionsWithText(item.value);
            }
            if (thisRoom != game.currentRoom || !game.isGameLoop) { break }
        }
        if (player.hp <= 0) {
            game.ending(game.currentEnding);
            return;
        }
        if (currentRunNumber != game.runNumber) return;
        else if (thisRoom === game.currentRoom) {
            await showStory(new StoryObject('You have hit a dead end. Please add an ending or a way to change rooms here.', { waits: true, waitDelay: 30000 }));
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

    document.getElementById('enter-example-rooms').addEventListener('click', ()=> {
        game.startingRoom = 'Example Hub';
        game.restart();
        document.getElementById('menu-toggle').click();
    })
}

// creates multi-layer buffers
function multiBuffer(elementID=undefined, iterations=1,count = 8, duration = 2000, animatedNumber = 1, image = 'icons/circle_white.png', imageSize = 16, radius = 120, keyframes = null, modifiers = null) {

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
    multiBuffer('loading-buffer', 1, 10, 3000, 1, undefined, 30, 228, [
        { opacity: 1},
        { opacity: 0, offset: 1 },
    ], [{},{}]);
    // multiBuffer('loading-buffer', 1, 128, 50000, 64, 'backgrounds/destruction.jpeg', 20, 128, [
    //     { opacity: 1, scale: 1, filter: 'invert(0)' },
    //     { opacity: 0, scale: .5, offset: 1, filter: 'invert(0)' },
    // ], [{},{scale: (base, index)=>base + index*1 * (1 + index % 2 * -2)}]);
    // multiBuffer('loading-buffer', 1, 128, 20000, 32, 'icons/x.svg', 20, 128, [
    //     { opacity: 1, scale: 1, filter: 'invert(0)' },
    //     { opacity: 0, scale: .5, offset: 1, filter: 'invert(0)' },
    // ], [{},{scale: (base, index)=>base + index*1 * (1 + index % 2 * -2)}]);
    multiBuffer('loading-buffer', 4, 10, 3000, 3, undefined, 10, 60, [
        { opacity: 1, scale: 1, filter: 'invert(1)' },
        { opacity: 0, scale: .5, offset: 1, filter: 'invert(0)' },
    ], [{},{scale: (base, index)=>base + index*1 * (1 + index % 2 * -2)}]);
    preloadImages();
    itemData = await fnExports.parseJSON('items.json');
    particleHandler = new CanvasHandler(document.getElementById('particle-canvas'), undefined, 1, 1)
    createEventListeners();
    history = new History();
    game = new Game();
    generateAllRooms();
    generateEndings();
    if (!devMode) await sleep(1500);
    document.getElementById('loading-screen').classList.add('hidden');
    game.start();
    await fnExports.awaitEvent(document.getElementById('loading-screen'));
    document.getElementById('loading-buffer').innerHTML = '';
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
    room.createChoice('Grid Testing')
        .addAction({type: 'changeRoom', parameters: ['Example Grid Hub']});
    room.createChoice('Items')
        .addAction({type: 'changeRoom', parameters: ['Example Room Items']});
    room.createChoice('Teleporter')
        .addAction({type: 'changeRoom', parameters: ['Example Teleporter Hub']});

    // teleporter hub
    room = createRoom('Example Teleporter Hub')
    room.createChoice('Back', {color: '[c:var(--back-color)]'})
        .addAction({type: 'changeRoom', parameters: ['Example Hub']});
    room.createChoice('Main Story')
        .addAction({type: ()=> {
            game.startingRoom = 'b-start';
            game.restart();
        }});
    room.createChoice('Escape Wasteland')
        .addAction({type: ()=> {
            game.startingRoom = 'e-wasteland-start';
            game.restart();
        }});

    room = createRoom('Example Room Items');
    room.createChoice('Back', {color: '[c:var(--back-color)]'})
        .addAction({type: 'changeRoom', parameters: ['Example Hub']});
    room.createChoice('Get item', {persistant: true})
        .addAction({type: ()=> {
            game.getItem(randomString('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUFVXYZ', 12))
        }, parameters: []});
    room.createChoice('Get long item', {persistant: true})
        .addAction({type: ()=> {
            game.getItem(randomString('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUFVXYZ', 400))
        }, parameters: []});
        room.createChoice('Get long item + spaces', {persistant: true})
        .addAction({type: ()=> {
            game.getItem(randomString('     abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUFVXYZ', 400))
        }, parameters: []});
    room.createChoice('Get many item', {persistant: true})
        .addAction({type: ()=> {
            game.getItem(randomString('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUFVXYZ', 12), 10e100)
        }, parameters: []});
    room.createChoice('Get wacky item', {persistant: true})
        .addAction({type: ()=> {
            game.getItem(randomString(' 1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUFVXYZ~!@#$%^&*()_+=-[]}{\\|";:/?.>,<~', 50), 1)
        }, parameters: []});
    

    room = createRoom('Example Room', { name: 'neutral.jpeg' });
    room.addStory(`This is a [an:text-blur 1s ease][c:red]test[c:] story`);
    room.addStory(`This is a [an:text-glow 1s ease infinite alternate][c:red]test[c:] [fi:blur(1px)]story[fi:] [c:#00ff00][ff:'Doto'][fs:24px]continued[:]!`, { speed: 100, variance: 33, animation: 'impact' });
    room.addStory(`[ts:2px 2px 2px white][c:#c5c5c5]Lorem [rt:90deg]ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et [rt:180deg]dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure [rt:270deg]dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui [rt:]officia deserunt mollit anim id est laborum.`, { speed: 10, variance: 3, animation: 'funky' });
    let choice1 = room.createChoice('Pick up item', {maxUses: 1} );
    choice1.addAction({ type: 'getItem', parameters: ['Example Item', 1, 10]});
    room.addStory(`This text only shows if you got at least 8 Example Items!`)
        .addRequirement({ mode: 'show', type: 'hasItem', parameters: ['Example Item', 8] });
    room.addStory(`Woah`, { speed: 500, variance: 100, animation: 'shaky' });
    room.addStory(`[c:rgb(0,255,255)]Cooleo![c:] This is a neat blur effect! I like it so much, I think I will put [c:yellow][fs:24px]more[:] text!`, { speed: 100, variance: 10, animation: 'blur' });
    room.addStory(`Or maybe try [c:rgb(136, 255, 0)]a[c:rgb(0, 255, 98)]l[c:rgb(136, 255, 0)]t[c:rgb(0, 255, 98)]e[c:rgb(136, 255, 0)]r[c:rgb(0, 255, 98)]n[c:rgb(136, 255, 0)]a[c:rgb(0, 255, 98)]t[c:rgb(136, 255, 0)]i[c:rgb(0, 255, 98)]n[c:rgb(136, 255, 0)]g[c:] text? This can do that too! Lets see how this looks like when it's long: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`, { speed: 50, variance: 10, animation: 'fade-alternate' });
    room.addStory("Let's have some choices now!", { waits: false, waitDelay: 0 });
    let choice2 = room.createChoice('Open door');
    choice2.addAction({ type: 'changeRoom', parameters: ['Example Room 2'] });
    choice2.addAction({ type: 'removeItem', parameters: ['Example Expendable Key'] });
    choice2.addRequirement({ mode: 'use', type: 'hasItem', parameters: ['Example Reusable Key'] });
    choice2.addRequirement({ mode: 'use', type: 'hasItem', parameters: ['Example Expendable Key'] });
    let choice3 = room.createChoice('Pick up key', {maxUses: 1});
    choice3.addAction({ type: 'getItem', parameters: ['Example Reusable Key', 1, 1, '[class:text-glow green]', "yoyo, you got ye an [[class:text-glow green]Example Reusable Key[class:]] yo! Also, this is a [an:text-glow 1s ease infinite alternate][c:cyan]custom action message!"] });
    choice3.addRequirement({ mode: 'show', type: 'madeChoice', inverse: true, parameters: [choice3.id] });
    let choice4 = room.createChoice('Pick up another key');
    choice4.addAction({ type: 'getItem', parameters: ['Example Expendable Key'] });
    choice4.addRequirement({ mode: 'show', type: 'madeChoice', parameters: [choice3.id] });
    choice4.addRequirement({ mode: 'show', type: 'hasItem', inverse: true, parameters: ['Example Expendable Key'] });
    // choice5, with different syntax (not using a variable)
    room.createChoice('Touch spike', { maxUses: 1 })
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
    room.createChoice('Return to hub', {classList: ['rainbow-overlay'], color: 'yellow'})
        .addAction({type: 'changeRoom', parameters: ['Example Hub']});
    

    // particle testing
    room = createRoom('Example Room Particles', { name: 'neutral.jpeg' });
    room.addAction({type: 'changeParticleAnimation', parameters: ['fog', 1, 1]});
    room.addStory('Lets try out some particles!', {waits: false});
    room.createChoice('Speed Up', {persistant: true})
    .addAction({type: 'changeParticleSpeed', parameters: [.5]});
    room.createChoice('Slow Down', {persistant: true})
    .addAction({type: 'changeParticleSpeed', parameters: [-.5]});
    room.createChoice('Strengthen', {persistant: true})
    .addAction({type: 'changeParticleStrength', parameters: [.5]});
    room.createChoice('Weaken', {persistant: true})
    .addAction({type: 'changeParticleStrength', parameters: [-.5]});
    let ashes = room.createChoice('Next Animation')
    ashes.addAction({type: 'changeParticleAnimation', parameters: ['ashes', 1, 1]});
    let smoke = room.createChoice('Next Animation')
    smoke.addAction({type: 'changeParticleAnimation', parameters: ['smoke top', 1, 1]});
    smoke.addRequirement({ mode: 'show', type: 'madeChoice', parameters: [ashes.id] })
    room.createChoice('Return to hub', {classList: ['rainbow-overlay'], color: 'yellow'})
        .addAction({type: 'changeRoom', parameters: ['Example Hub']})
        .addAction({type: 'changeParticleAnimation', parameters: ['adawda', 1, 1]})
        .addRequirement({ mode: 'show', type: 'madeChoice', parameters: [smoke.id] })


    // battle testing
    room = createRoom('Example Room Battle', { name: 'neutral.jpeg' });
    room.addAction({ type: 'getItem', parameters: ['Lume Fruit', 2, 3], waits: true});
    room.addAction({type: 'encounter', parameters: [
    [
        new Enemy('Example Enemy', 10, 2, 5),
        new Enemy('Example Enemy 2', 20, 6, 10, 'This guy has a description, [c:green]Neat!')
    ],
    [
        {name: 'Example Reward', min: 1, max: 5},
        {name: 'Example Reward 2', min: 1, max: 5}
    ], 'a couple of example enemies'], waits: true, chance: 100})
    room.addAction({type: 'encounter', parameters: [[
        new Enemy('Weak Enemy', 10, 2, 2),
        new Enemy('OP Enemy', 200, 100, 100, `You [fst:italic]really[:] don't want to mess with this guy`),
        new Enemy('Enemy 3', 5, 1, 1),
        new Enemy('Enemy 4', 5, 1, 2),
        new Enemy('Enemy 5', 5, 1, 4),
        new Enemy('Enemy 6', 5, 1, 6),
        new Enemy('Enemy 7', 5, 1, 8)
    ], [
        {name: 'Wacky Thing', min: 1, max: 1},
        {name: 'Super Syrum', min: 1, max: 1}
    ], 'The Wacky Gang'], waits: true})
    room.createChoice('Return to hub', {classList: ['rainbow-overlay'], color: 'yellow'})
        .addAction({type: 'changeRoom', parameters: ['Example Hub']});


    // grid testing
    room = createRoom('Example Grid Hub');
    room.createChoice('Back', {color: '[c:var(--back-color)]'})
        .addAction({type: 'changeRoom', parameters: ['Example Hub']});
    room.createChoice('Grid 1 x 6')
        .addAction({type: 'changeRoom', parameters: ['example-grid-1-start']});
    room.createChoice('Grid 20 x 20')
        .addAction({type: 'changeRoom', parameters: ['example-grid-2-start']});

    let grid = new RoomGrid({name: 'example-grid-1', width: 1, height: 6, showCoordinates: true})
    room = grid.generateRoom([0, 2]);
    room.addStory('This story should show twice.', {maxUses: 2})
    grid.generateGrid();

    grid = new RoomGrid({name: 'example-grid-2', width: 20, height: 20, showCoordinates: true, entrance: [10, 10]})
    grid.setDefaultRoom(new Room('', {name: 'neutral.jpeg'}))
    grid.addQueuelist('start', createQueuelist([
        new StoryObject(`This text should have a 5% chance of appearing at the start of any room`),
    ]), [
        new Requirement({mode: 'show', type: 'chanceRoll', parameters: [5]})
    ])
    grid.addQueuelist('end', createQueuelist([
        new StoryObject(`This text should have a 10% chance of at the end of any room`),
    ]), [
        new Requirement({mode: 'show', type: 'chanceRoll', parameters: [10]})
    ])
    room = grid.generateRoom(null, {name: 'transparent.png'}, 50);
    room.addStory('This room instance was randomly placed');
    room = grid.generateRoom([0,0], {name: 'savior.jpeg'});
    room.addStory('You found the exit!', {waits: false});
    room.createChoice('Return to hub', {classList: ['rainbow-overlay'], color: 'yellow'})
        .addAction({type: 'changeRoom', parameters: ['Example Hub']});
    room.createChoice('Stay')
        .addAction({type: 'leaveChoice', parameters: []});
    grid.generateGrid();
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
    room.addStory(`[c:var(--Gali)]"Gali."`, { waits: false, waitDelay: 1000, speed: 50 });
    room.addStory(`There doesn't seem to be much left to do or see. Anything that once was is long gone.`, { waits: false });
    choice1 = room.createChoice("Leave the lab.");
    choice1.addAction({ type: 'changeRoom', parameters: ['b-3-hallways'] });
    choice2 = room.createChoice(`Go back to sleep.`);
    choice2.addAction({ type: 'writeText', parameters: ['[c:yellow]The cryopod zaps you, clearly malfunctioning', {elementID: 'action-output', waits: false, speed: -1}] });
    choice2.addAction({type: 'changeHP', parameters: [-10, -15, 'cryopod']});

    room = createRoom('b-3-hallways', { name: '', transition: { out: '', in: '' } }); // beginning-3
    room.addStory(`After just a bit of effort, the doors (usually automatic, you remember) give way, leading you to three different corridors.`);
    room.addStory(`Unfortunately, your memory of the layout is hazy at best. To be fair, you HAD been quite nervous at the time, keeping your eyes lowered throughout the walk. If only you had paid more attention...`);
    room.addStory(`[c:var(--escape)]Left, [c:var(--destruction)]right, [c:]or [c:var(--savior)]straight ahead?`);
    choice1 = room.createChoice("Go left.");
    choice1.addAction({ type: 'changeRoom', parameters: ['e-start'] }); //escape route
    choice2 = room.createChoice("Go right.", {classList: ['disabled']});
    choice2.addAction({ type: 'changeRoom', parameters: ['d-start'] }); //destruction route
    let choice3 = room.createChoice("Go straight.", {classList: ['disabled']});
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
    room.addStory(`[c:var(--dialogue)][fst:italic][fs:30px]"You."`, {speed: 350, waits: false, waitDelay:1500});
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
    room.addStory(`...So you were [an:text-funky][c:var(--destruction)]abandoned, [an:][c:]it seems.`, {speed: 70, waits: false, waitDelay:1500});
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
    room.addStory(`[c:var(--character)]Idelle [c:]hums to herself, examining the wreckage of the lab behind you.`);
    room.addStory(`[c:var(--dialogue)]"You know, this place is gonna blow to bits any day now.`);
    room.addStory(`"It won't do you any good if you stay here."`);
    room.addStory(`"After all, just look at the state of the lab now. Who knows what could have happened if your pod hadn't opened now?"`);
    room.addStory(`Glancing over your shoulder, the lab appears to be in a much worse state than you'd thought from the inside. As if on cue...`);
    room.addStory(`[c:var(--actions)](CRASH!)`);
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
    room.addStory(`- 10 FOOD PACKS`);
    room.addStory(`- MEDICAL KITS`);
    room.addStory(`[c:var(--character)]Idelle [c:]drags some kind of...thing out of the ship, pushing what appears to be a big hunk of metal towards you.`);
    room.addStory(`"Here. Call it a welcome gift."`);
    room.addStory(`"We found this a while back, but it doesn't seem to be doing much for us. You can have it."`);
    room.addStory(`Suddenly, the thing starts to shudder, and a loud whirring noise fills the air.`);
    room.addStory(`It gives a quiet chirp as a metal plate slides open, revealing a small screen with two little, glowing eyes.`);
    room.addStory(`"Oh, uh...`);
    room.addStory(`That's not supposed to happen."`);
    room.addStory(`The little machine chirps again, and the screen lights up, displaying a small, pixelated face.`);
    room.addStory(`"Wait a minute, I know what this is!"`);
    room.addStory(`[c:var(--character)]Idelle [c:]excitedly exclaims, beaming as she points at the machine.`);
    room.addStory(`"These things are ancient! They had all sorts of these little guys running around back in the day, remember?"`);
    room.addStory(`You shake your head. This is unlike anything you've ever seen before.`);
    room.addStory(`Realizing her error, [c:var(--character)]Idelle [c:]frowns, looking a little embarrassed.`);
    room.addStory(`"Right, right. You were frozen for a while, huh?"`);
    room.addStory(`She clears her throat, trying to regain her composure.`);
    room.addStory(`"This is a little helper bot! It can help you with all sorts of things, like finding items and keeping track of your inventory."`);
    room.addStory(`"Weird that it's still working, though. I thought they all broke down ages ago."`);
    room.addStory(`After a moment, she grins awkwardly.`);
    room.addStory(`"Not that I was just gonna hand it off to you to deal with or anything. I just thought it was a...neat little thing."`);
    room.addStory(`Upon inspection, the little machine appears to be a small, round ball with a screen on it. It has two little arms and legs, and a tiny little face that looks like it's made out of pixels.`);
    room.addStory(`For a moment, the screen reads in little, pixelated letters:`);
    room.addStory(`[c:var(--dialogue)]"HELLO! MY NAME IS OTTO :-]"`);
    room.addStory(`Then, the screen flickers and goes blank.`);
    room.addStory(`[c:var(--character)]Idelle [c:]shrugs with a smile.`);
    room.addStory(`"I guess it likes you."`);
    room.addStory(`"Now, if you don't mind, I have a few things to take care of. come back to the ship when you've found everything."`);
    room.addStory(`The wasteland is a desolate, barren dust bowl. The ground is cracked and dry, and the air is thick with dust and debris. Your mouth tastes more and more like metal the longer you stand out here.`);
    choice1 = room.createChoice(`Explore the wasteland and gather supplies for the ship.`);
    choice1.addAction({type: 'changeRoom', parameters: ['e-wasteland-start']});

    let wastelandGrid = new RoomGrid({name: 'e-wasteland', width: 5, height: 5, entrance: [2, 2]});
    let defaultRoom = new Room('', {name: 'escape.jpeg'});
    // defaultRoom.addStory('The land is barren');
    wastelandGrid.setDefaultRoom(defaultRoom)
    wastelandGrid.addQueuelist('end', createQueuelist([
        new StoryObject(`[an:text-shiver .15s ease-in-out infinite alternate]You've found everything!`),
        new Choice(`See Idelle.`)
            .addAction({type: 'changeRoom', parameters: ['e-finalTask']})
    ]), [
        new Requirement({ mode: 'show', type: 'hasItem', parameters: ['Scrap Metal', 5] }),
        new Requirement({ mode: 'show', type: 'hasItem', parameters: ['Food Pack', 10] }),
        new Requirement({ mode: 'show', type: 'hasItem', parameters: ['Fuel Canister', 1] }),
        new Requirement({ mode: 'show', type: 'hasItem', parameters: ['Microchip', 1] })
    ])

    room = wastelandGrid.generateRoom([0,2], {name: 'destruction.jpeg'});
    room.addAction({type: 'encounter', parameters: [[
        new Enemy('Average Joe', 15, 10, 10, `Jack of all trades, master of none.`)
    ],
    [
        {name: 'Food Pack', min: 1, max: 4},
        {name: 'Participation Trophy', min: 1, max: 1},
    ], 'an abnormality!'], waits: true});

    room = wastelandGrid.generateRoom([0,4], {name: 'escape.jpeg'});
    room.addAction({type: `getItem`, parameters: [`Food Pack`, 1, 3]});

    room = wastelandGrid.generateRoom([1,0], {name: 'escape.jpeg'});
    room.addAction({type: `getItem`, parameters: [`Microchip`, 1, 1], waits: true, maxUses: 1});

    room = wastelandGrid.generateRoom([1,1], {name: 'escape.jpeg'});
    room.addStory(`[c:var(--dialogue)][OTTO RECOMMENDS YOU DO NOT GO EAST.]`);

    room = wastelandGrid.generateRoom([1,3], {name: 'escape.jpeg'});
    room.addStory(`[c:var(--dialogue)][OTTO RECOMMENDS YOU DO NOT GO SOUTH.]`);
    room = wastelandGrid.generateRoom([1,4], {name: 'destruction.jpeg'});
    room.addAction({type: 'encounter', parameters: [[
        new Enemy('FishBat', 20, 20, 5, `Not to be confused with a batfish.`),
    ],
    [
        {name: 'Food Pack', min: 1, max: 4}
    ], 'an abnormality!'], waits: true});

    room = wastelandGrid.generateRoom([2,0], {name: 'escape.jpeg'});
    room.addStory(`[c:var(--dialogue)][OTTO RECOMMENDS YOU DO NOT GO SOUTH.]`);

    room = wastelandGrid.generateRoom([2,1], {name: 'destruction.jpeg'});
    room.addAction({type: 'encounter', parameters: [[
        new Enemy('Rootwraith', 8, 20, 20, `A horrid mass of roots and vines.`),
        new Enemy('Blightfruit Beast', 30, 2, 2, `A large, mutated fruit with a gaping maw.`)
    ],
    [
        {name: 'Food Pack', min: 1, max: 4},
        {name: 'Opinionated Seedling', min: 1, max: 1},
    ], 'some bad apples!'], waits: true});

    room = wastelandGrid.generateRoom([2,2], {name: 'escape.jpeg'});
    room.addStory('[c:var(--dialogue)][OTTO RECOMMENDS YOU DO NOT GO NORTH.]');

    room = wastelandGrid.generateRoom([2,3], {name: 'escape.jpeg'});
    room.addAction({type: 'getItem', parameters: ['Scrap Metal', 1, 1,], waits: true, maxUses: 5});

    room = wastelandGrid.generateRoom([2,4], {name: 'escape.jpeg'});
    room.addStory(`[c:var(--dialogue)][OTTO RECOMMENDS YOU DO NOT GO WEST.]`);

    room = wastelandGrid.generateRoom([3,1], {name: 'escape.jpeg'});
    room.addStory(`[c:var(--dialogue)][OTTO RECOMMENDS YOU DO NOT GO WEST.]`);

    room = wastelandGrid.generateRoom([3,3], {name: 'destruction.jpeg'});
    room.addAction({type: 'encounter', parameters: [[
        new Enemy('Heavily Armed Turtle 1', 15, 12, 12, `A mutant turtle with a pair of swords.`),
        new Enemy('Heavily Armed Turtle 2', 15, 12, 12, `A mutant turtle with a pair of small blades.`),
        new Enemy('Heavily Armed Turtle 3', 15, 12, 12, `A mutant turtle with some sick nunchucks.`),
        new Enemy('Heavily Armed Turtle 4', 15, 12, 12, `A mutant turtle with a big stick.`)
    ],
    [
        {name: 'Food Pack', min: 1, max: 7},
        {name: 'Slice of Brotherhood', min: 1, max: 1}
    ], 'a clan of mutants!'], waits: true});

    room = wastelandGrid.generateRoom([4,0], {name: 'destruction.jpeg'});
    room.addAction({type: 'encounter', parameters: [[
        new Enemy('Blatto', 30, 20, 20, `A giant cockroach with a bad attitude.`),
        new Enemy('Joyama', 20, 15, 15, `A large, spider-like creature with a nasty bite.`)
    ],
    [
        {name: 'Food Pack', min: 1, max: 3},
        {name: 'Questionable Mixtape', min: 1, max: 1}
    ], 'an infestation!'], waits: true});

    room = wastelandGrid.generateRoom([4,1], {name: 'escape.jpeg'});
    room.addAction({type: 'getItem', parameters: ['Fuel Canister', 1, 1], waits: true, maxUses: 1});

    room = wastelandGrid.generateRoom([4,3], {name: 'escape.jpeg'});
    room.addAction({type: 'getItem', parameters: ['Food Pack', 1, 4]});

    wastelandGrid.generateGrid(); // only use once, and after you add all the rooms you want

    room = createRoom(`e-finalTask`, {name: 'escape.jpeg'});
    room.addStory(`Hauling all of this stuff back to Idelle is kind of a pain, but you know it's worth it. You can finally get out of this place!`);
    room.addStory(`You make your way back to the ship, where [c:var(--character)]Idelle [c:]is waiting for you. She looks relieved to see you.`);
    room.addStory(`[c:var(--dialogue)]"You made it back! Took you long enough, I was starting to worry."`);
    room.addStory(`[c:var(--character)]Idelle [c:]looks over the pile of supplies you brought back with you.`);
    room.addStory(`[c:var(--dialogue)]"I see you found everything I asked for. Good job!"`);
    room.addStory(`[c:var(--dialogue)]"You look like you got pretty banged up, though...here, let me handle it."`)
        .addRequirement({ mode: 'show', type: 'hasStat', parameters: ['hp', 0, 40] })
    choice1 = room.createChoice(`Use the medical supplies.`)
        .addRequirement({ mode: 'show', type: 'hasStat', parameters: ['hp', 0, 40] });
    choice1.addAction({type: 'changeHP', parameters: [100]});
    room.addStory(`[c:var(--dialogue)]"Now that you're here, there's one more thing we have to do. I've got a stash of medical supplies somewhere out here, and I need all hands on deck to get it."`);
    room.addStory(`[c:var(--character)]Idelle [c:]pulls out a map and shows you where the stash is located.`);
    room.addStory(`[c:var(--dialogue)]"It's a bit of a trek, but I think we can make it. We're [fst:italic][fst:bold]this [fst:]close to getting out of here!"`);
    room.addStory(`[c:var(--character)]Idelle [c:]pinches her pointer and her thumb, barely leaving a gap between them.`);
    room.addStory(`[c:var(--dialogue)]"Let's get moving!"`);
    choice1 = room.createChoice(`Go to the stash.`);
    choice1.addAction({type: 'changeRoom', parameters: ['e-trek']});

    room = createRoom(`e-trek`, {name: 'escape.jpeg'});
    room.addAction({type: 'changeParticleAnimation', parameters: ['ashes', 2, 2]});
    room.addStory(`Luckily, [c:var(--character)]Idelle [c:]and her crew are much more equipped to handle this than you are. You follow her lead as she guides you through the treacherous terrain.`);
    room.addStory(`Staying near [c:var(--character)]Idelle, [c:]you continue to march across the land, the wind howling in your ears.`);
    room.addStory(`You can see the faint shadow of a building in the distance, but it looks like it's going to be a while before you even come close to it..`);
    room.addStory(`For a while, you've been enjoying the comfortable silence of the journey. [c:var(--character)]Idelle [c:]eventually nudges you in the side, attempting to get your attention.`);
    room.addStory(`[c:var(--dialogue)]"So, [c:var(--Gali)]Gali, [c:var(--dialogue)]tell me about yourself. What's, um..."`);
    room.addStory(`[c:var(--character)]Idelle [c:]looks around, trying to find the right words. Understandably, it must be difficult to try to make conversation with someone stuck 75 years in the past.`);
    room.addStory(`[c:var(--dialogue)]"How are you doing? Excited to get off this ticking time bomb of a planet?"`);
    choice1 = room.createChoice(`You can't wait to leave.`);
    room.addStory(`[c:var(--character)]Idelle [c:]nods her head in agreement.`);
    room.addStory(`[c:var(--dialogue)]"I can't wait to get out of here. It's been a long time coming."`);
    room.addStory(`[c:var(--dialogue)]"I mean, I love this planet and all, but it's just not the same anymore."`);
    room.addStory(`[c:var(--character)]Idelle [c:]looks around, as if to make sure no one is listening.`);
    room.addStory(`[c:var(--dialogue)]"Between you and me, I'm pretty sure it's been trying to tell us to leave for a while now."`);
    room.addStory(`[c:var(--dialogue)]"I mean, look at this place. It's a mess."`);
    room.addStory(`She gestures to the surrounding area, which is littered with debris and wreckage. All around you, traces of fallout are floating in the air.`);
    room.addStory(`[c:var(--dialogue)]"I think it's time we finally listened to it. Don't you?"`);
    room.addStory(`You consider her words for a moment, and you can't help but agree. The planet has been through a lot, and it's time to move on.`);
    room.addStory(`[c:var(--dialogue)]"It must be nice for you, though. You've been nice and safe in your little pod, and now you get to leave while you're in tip-top shape."`);
    room.addStory(`[c:var(--dialogue)]"I mean, I guess I can't blame you for that."`);
    room.addStory(`[c:var(--dialogue)]"But I have to say, I'm a little jealous. Just look at you. You're practically glowing."`);
    room.addStory(`[c:var(--dialogue)]"And not from the radiation, either."`);
    room.addStory(`[c:var(--character)]Idelle [c:]snickers, and you can't help but feel a little flattered.`);
    choice1 = room.createChoice('Return the compliment.');
    room.addStory(`You note how [c:var(--character)Idelle's [c:]own scales seem to shimmer and sparkle when the sunlight hits her.`);
    room.addStory(`[c:var(--dialogue)]"Oh, stop it. You're just saying that because you wanna ride shotgun when we leave."`);
    room.addStory(`[c:var(--dialogue)]"Boss!"`);
    room.addStory(`One of the crew members shouts from the back of the group, interrupting your conversation.`);
    room.addStory(`[c:var(--dialogue)]"Up ahead!"`);
    room.addStory(`You look ahead and see a large building in the distance. A crude hole has been blasted into the side of it, and you can see a faint light coming from inside, as well as smoke trailing out and into the air.`);
    room.addStory(`[c:var(--character)]Idelle [c:]nods. She, along with the rest of the crew, pull their cloaks and masks over themselves as they rush to the side of the building.`);
    room.addStory(`[c:var(--dialogue)]"This is it. This is where the stash is."`);
    room.addStory(`For an abandoned building, it seems awfully...`);
    room.addStory(`...lively.`);
    room.addStory(`It sounds like there's quite the crowd inside. They sound pained. You can hear the sound of metal clanging against metal, and the occasional scream.`);
    choice1 = room.createChoice(`What is this place?`);
    room.addStory(`You utter to [c:var(--character)]Idelle [c:]as you approach the entrance, peeking inside...`);
    room.addStory(`And then your eyes widen in horror.`);
    choice1 = room.createChoice(`Is this a hospital!?`);
    room.addStory(`[c:var(--character)]Idelle [c:]shushes you, and you can see her eyes darting around the room, trying to find a way in.`);
    room.addStory(`[c:var(--dialogue)]"We need to get in there. We need to find the stash."`);
    choice1 = room.createChoice(`This sounds like stealing.`);
    room.addStory(`[c:var(--character)]Idelle [c:]rolls her eyes, motioning for two of the crew members to take the other side.`);
    room.addStory(`[c:var(--dialogue)]"It's not [fst:italic]stealing, [fst:]it's..."`);
    room.addStory(`[c:var(--dialogue)]"It's...uh..."`);
    room.addStory(`She sighs.`);
    room.addStory(`[c:var(--dialogue)]"Look. Any chances of survival they have are gone if they stay here, no matter how much they recover. They were doomed from the beginning. This just ensures that, um..."`);
    room.addStory(`[c:var(--dialogue)]"We're just making sure nothing goes to waste."`);
    room.addStory(`[c:var(--character)]Idelle [c:]places a hand on your shoulder, trying to reassure you.`);
    room.addStory(`[c:var(--dialogue)]"Trust me. I know what I'm doing."`);
    room.addStory(`[c:var(--dialogue)]"They..."`);
    room.addStory(`[c:var(--dialogue)]"...are NOT..."`);
    room.addStory(`[c:var(--dialogue)]"...going to survive. You got me?"`);
    room.addStory(`[c:var(--dialogue)]"Now, let's get in there."`);
    choice1 = room.createChoice(`Rob the hospital.`);
    choice1.addAction({type: 'changeRoom', parameters: ['e-hospital']});
    choice2 = room.createChoice('Get out of here.');
    choice2.addAction({type: 'changeRoom', parameters: ['e-ultimatum']});

    room = createRoom(`e-hospital`, {name: 'neutral.jpeg'}, {transition: {out: '', in: ''}});
    room.addAction({type: 'changeParticleAnimation', parameters: ['fog', 0.3, 0.3]})
    room.addStory(`Considering her words very carefully...`);
    room.addStory(`You sigh, deciding to follow [c:var(--character)]Idelle [c:]and her crew inside.`);
    room.addStory(`[fst:italic][c:var(--actions)]Even if a little piece of you has just died inside...`, {speed: 50});
    room.addStory(`[c:var(--character)]Idelle [c:]and her crew rush inside, and you follow suit, trying to keep up with them.`);
    room.addStory(`[c:var(--actions)]"Ugh, smells like rot in here."`);
    room.addStory(`[c:var(--actions)]"Grab that! I'll distract her!"`);
    room.addStory(`[c:var(--actions)]"Shhh!"`);
    room.addStory(`You can see the crew members are already hard at work, rummaging through the supplies and trying to find anything useful as they sneak around.`);
    room.addStory(`[c:var(--dialogue)]"[c:var(--Gali)]Gali, [c:var(--dialogue)]head towards the closet over there.`);
    room.addStory(`[c:var(--dialogue)]"Be careful. The place is swarming with mutant folk."`);
    choice1 = room.createChoice(`Gather supplies.`);
    choice1.addAction({type: 'changeRoom', parameters: ['e-finale']}); // change to hospital-2-2 later

    // room = createRoom(`hospital-2-2`, {name: 'neutral.jpeg'});
    // room.addStory(`You are currently at (2,2).`);
    // choice1 = room.createChoice(`Go North.`, {maxUses: Infinity});
    // choice1.addAction({type: 'changeRoom', parameters: ['hospital-2-3']});
    // choice2 = room.createChoice(`Go East.`, {maxUses: Infinity});
    // choice2.addAction({type: 'changeRoom', parameters: ['hospital-3-2']});
    // choice3 = room.createChoice(`Go South.`, {maxUses: Infinity});
    // choice3.addAction({type: 'changeRoom', parameters: ['hospital-2-1']});
    // choice4 = room.createChoice(`Go West.`, {maxUses: Infinity});

    // room = createRoom(`hospital-2-3`, {name: 'neutral.jpeg'});
    // room.addStory(`You are currently at (2,3).`);
    // choice1 = room.createChoice(``)

    room = createRoom(`e-finale`, {name: 'escape.jpeg'});
    room.addAction({type: 'changeParticleAnimation', parameters: ['ashes', 2, 2]});
    room.addStory(`There's a subtle weight on your shoulders, and it isn't from the satchel you're carrying.`);
    room.addStory(`Everyone else seems to be in high spirits. You can hear them laughing and joking around, but you can't help but feel a little uneasy.`);
    room.addStory(`Catching [c:var(--character)]Idelle's [c:]eye, you don't have much of a chance to dwell on it. She continues to haul her own supplies with her, and she looks like she's having a blast.`);
    room.addStory(`[c:var(--dialogue)]"I can't believe we actually did it! We're gonna get out of here!"`);
    room.addStory(`The shine in her eyes fades a little, and she looks down at the ground.`);
    room.addStory(`[c:var(--dialogue)]"We..."`);
    room.addStory(`[c:var(--dialogue)]"We're going home."`);
    room.addAction({ type: 'changeBG', parameters: ['destruction.jpeg', { out: '', in: '' }] });
    room.addAction({ type: 'styleBG', parameters: ['[an:blur-in 2s ease-out,fade-in 2s ease-out][fi:][op:]'] });
    room.addStory(`[c:var(--actions)](BANG!)`);
    room.addStory(`[c:var(--dialogue)][fst:italic]"AUGH!"`);
    room.addAction({type: 'styleBG', parameters: '[an: shake 70ms 9 linear alternate][sc:1.2]'});
    room.addStory(`[c:var(--actions)](Thud!)`);
    room.addStory(`IDELLE!?`);
    room.addAction({type: 'encounter', parameters: [[
        new Enemy('Blatto Lackey 1', 20, 8, 8, `A tall, lanky fellow. All brain, no brawn.`),
        new Enemy('Palmetto', 40, 15, 15, `A rootin', tootin', mutasnt shootin' cockroach. No...a glockroach.`),
        new Enemy('Blatto Lackey 2', 20, 8, 8, `A short, dumpy fellow. All brawn, no brain.`),
    ],
    [
        {name: 'Unnecessary Trauma', min: 1, max: 1},
        {name: 'The Glockinator', min: 3, max: 3}
    ], 'the Six-Legged Syndicate!'], waits: true});

    room.addStory(`You quickly rush to [c:var(--character)]Idelle's [c:]aide as the others chase the bandits away.`);
    room.addStory(`[c:var(--destruction)]...This isn't good at all.`);
    room.addStory(`[fs:8px][c:var(--dialogue)]"Go..."`);
    room.addStory(`She coughs out, her own grip on you loosening.`);
    room.addStory(`[c:var(--dialogue)][fs:8px]"My keys...take my keys..."`);
    room.addStory(`[c:var(--dialogue)]"...Save them, [c:var(--Gali)]Gali.[c:var(--dialogue)]"`)
    room.addStory(`You hold [c:var(--character)]Idelle [c:]until the glow from her scales fades away.`);
    room.addStory(`Rummaging through her pockets, you manage to pick up the ship's activation keycard. Nodding towards the others, they start to head towards the ship.`);
    room.addStory(`Looking down at [c:var(--character)]Idelle [c:]one last time, you sigh, trying to ignore the burn in your eyes as you lay her cloack over her.`);
    choice1 = room.createChoice('Head to the ship.');
    choice1.addAction({type: 'ending', parameters: ['escape']});

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

    ending = createEnding('escape');
    ending.addStory(`It's a shame what's happened to that poor woman.`);
    ending.addStory(`You're left without a leader. A mentor.`);
    ending.addStory('...A friend.');
    ending.addStory(`But hey! At least you made it out [c:var(--escape)][an:text-shiver .30s ease-in-out infinite alternate]alive...`);
    ending.addStory(`You drive off into the cosmos, letting Virema fade into nothing more than a distant memory.`, {waits: false});
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
