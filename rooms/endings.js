
import {game, createRoom, RoomGrid, Room, createQueuelist, StoryObject, Requirement, createEnding } from '../../scripts/GameLogic.js';
import { Enemy } from '../../scripts/Enemies.js';
export let roomGenerators = [generate];

function generate() {
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