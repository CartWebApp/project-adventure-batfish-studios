
import {game, createRoom, RoomGrid, Room, createQueuelist, StoryObject, Requirement, Choice, Action } from '../../scripts/GameLogic.js';
import { Enemy } from '../../scripts/Enemies.js';
export let roomGenerators = [generate];

function generate() {
    let room = new Room(); // fill this out
    room.addAction({type: 'changeBG', parameters: ['transparent.png', {}, 'background-image-2']})
    room.addAction({type: 'styleBG', parameters: ['', 'background-image-2']});
    room.addAction({type: 'changeParticleAnimation', parameters: ['none']});
}