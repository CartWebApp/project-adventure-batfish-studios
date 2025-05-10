
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

    ending = createEnding('destruction');
    ending.addStory(`Well, congratulations to you.`);
    ending.addStory(`You have singlehandedly turned into one of the most powerful beings on the planet.`);
    ending.addStory(`With the help of your...dear friend, you've managed to pillage your way through the world.`);
    ending.addStory(`But eventually, [c:var(--destruction)][an:text-shiver .30s ease-in-out infinite alternate]all good things must come to an end.`);
    ending.addStory(`With nobody left to stop you, there is no other choice but for you and your mates to pick each other off one by one.`);
    ending.addStory(`You emerge victorious, obviously...`);
    ending.addStory(`Which leaves you with nothing. Nobody. Just you and your thoughts.`);
    ending.addStory(`You're left with nothing but the memories of your crimes, waiting to wither away into nothingness.`, {waits: false});
}