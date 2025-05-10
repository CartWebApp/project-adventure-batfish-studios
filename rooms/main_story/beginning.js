
import {game, createRoom, RoomGrid, Room, createQueuelist, StoryObject, Requirement, Choice, Action } from '../../scripts/GameLogic.js';
import { Enemy } from '../../scripts/Enemies.js';
export let roomGenerators = [generate];

function generate() {
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
    room.addAction({ type: 'changeBG', parameters: ['neutral.jpeg', { out: '', in: '' }] });
    room.addAction({ type: 'styleBG', parameters: ['[bdfi:blur(64px) brightness(.5)]', 'background-image-3']});
    room.addAction({ type: 'styleBG', parameters: ['[an:blur-in 2s ease-out,fade-in 2s ease-out][fi:][op:]'] });
    room.addAction({type: 'changeParticleAnimation', parameters: ['fog', 1.5, 1], delay: 200});
    room.addStory(`...until [fw:bold][an:text-glow 1s ease infinite alternate][c: red]now.`, { speed: 100, waits: false, waitDelay: 1000 });
    room.addAction({type: 'changeBG', parameters: ['destruction.jpeg', {}, 'background-image-2']})
    room.addAction({type: 'styleBG', parameters: ['[an:blink-weak 1500ms ease-in-out infinite alternate]', 'background-image-2']});
    room.addStory(`Your hearing is the first of your senses to return. Alarms blare in your ears, followed by the whoosh of air and a soft click.`);
    room.addAction({ type: 'styleBG', parameters: ['[an:bd-blur-fade-in 3000ms ease]', 'background-image-3']});
    room.addAction({type: 'changeParticleAnimation', parameters: ['none', undefined, undefined, 3000], delay: 3000});
    room.addStory(`Next comes your sight. Once the steam clears, the cryopod door creaks open to the now run-down lab. Red lights are flashing through the room, presumably the whole building as well.`);
    room.addStory(`Stepping out of the pod, it appears that yours was the only one to be well-maintained. The other two pods are rusty and broken, with the glass shattered and labels long faded.`);
    room.addStory(`In fact, you can barely make out your own name on the scratchy, old label.`);
    room.addStory(`[c:var(--Gali)]"Gali."`, { waits: false, waitDelay: 1000, speed: 50 });
    room.addStory(`There doesn't seem to be much left to do or see. Anything that once was is long gone.`, { waits: false });
    choice1 = room.createChoice("Leave the lab.");
    choice1.addAction({ type: 'changeRoom', parameters: ['b-3-hallways'] });
    choice2 = room.createChoice(`Go back to sleep.`, {persistant: true});
    choice2.addAction({ type: 'writeText', parameters: ['[c:yellow]The cryopod zaps you, clearly malfunctioning', {elementID: 'action-output', speed: -1, waits: false}]});
    choice2.addAction({type: 'changeHP', parameters: [{min:-15, max:-10, cause:'cryopod'}]});

    room = createRoom('b-3-hallways', { name: '', transition: { out: '', in: '' } }); // beginning-3
    room.addStory(`After just a bit of effort, the doors (usually automatic, you remember) give way, leading you to three different corridors.`);
    room.addStory(`Unfortunately, your memory of the layout is hazy at best. To be fair, you HAD been quite nervous at the time, keeping your eyes lowered throughout the walk. If only you had paid more attention...`);
    room.addStory(`[c:var(--escape)]Left, [c:var(--destruction)]right, [c:]or [c:var(--savior)]straight ahead?`);
    choice1 = room.createChoice("Go left.", {customID: 'escape'});
    choice1.addAction({ type: 'changeRoom', parameters: ['e-start'] }); //escape route
    choice2 = room.createChoice("Go right.", {customID: 'destruction'});
    choice2.addAction({ type: 'changeRoom', parameters: ['d-start'] }); //destruction route
    let choice3 = room.createChoice("Go straight.", {customID: 'savior'});
    choice3.addAction({ type: 'changeRoom', parameters: ['s-start'] }); //savior route

    room = createRoom(`b-return`, { name: 'neutral.jpeg' }); // changed mind at some point
    room.addAction({type: 'changeBG', parameters: ['destruction.jpeg', {}, 'background-image-2']})
    room.addAction({type: 'styleBG', parameters: ['[an:blink-weak 1500ms ease-in-out infinite alternate]', 'background-image-2']});
    room.addStory(`Returning to the lab, you find that the way back to your cryopod is now blocked off. The ceiling has collapsed, and the only way back out is through one of the other hallways.`);
    room.addStory(`It's just a matter of which one you pick.`);
    choice1 = room.createChoice("Go left.");
    choice1.addAction({ type: 'changeRoom', parameters: ['e-start'] });
    choice1.addRequirement({ mode: 'show', type: 'madeChoice', inverse: true, parameters: ['escape']});
    choice2 = room.createChoice("Go right.");
    choice2.addAction({ type: 'changeRoom', parameters: ['d-start'] });
    choice2.addRequirement({ mode: 'show', type: 'madeChoice', inverse: true, parameters: ['destruction']});
    choice3 = room.createChoice("Go straight.");
    choice3.addAction({ type: 'changeRoom', parameters: ['s-start'] });
    choice3.addRequirement({ mode: 'show', type: 'madeChoice', inverse: true, parameters: ['savior']});
}