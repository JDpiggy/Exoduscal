document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const startScreen = document.getElementById('startScreen');
    const summitScreen = document.getElementById('summitScreen');
    const startButton = document.getElementById('startButton');
    const playAgainButton = document.getElementById('playAgainButton');
    const loadingMessage = document.getElementById('loadingMessage');

    const timerDisplay = document.getElementById('timerDisplay');
    const eventDisplay = document.getElementById('eventDisplay');
    const finalTimeDisplay = document.getElementById('finalTimeDisplay');

    const dialogueBox = document.getElementById('dialogueBox');
    const dialogueText = document.getElementById('dialogueText');
    const dialogueButton = document.getElementById('dialogueButton');

    const puzzleOverlay = document.getElementById('puzzleOverlay');
    const puzzleInstructions = document.getElementById('puzzleInstructions');
    const puzzleSequenceDisplay = document.getElementById('puzzleSequenceDisplay');
    const playerInputDisplay = document.getElementById('playerInputDisplay');

    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 600;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    let gameState = 'startScreen'; // startScreen, playing, puzzle, dialogue, summit
    let gameTime = 0;
    let timerInterval;

    // Assets
    const ASSET_PATHS = {
        playerIdle: 'assets/images/player_idle.png',
        ledgeRock: 'assets/images/ledge_rock.png',
        summitFlag: 'assets/images/summit_flag.png',
        skyBackground: 'assets/images/mountain_bg_sky.png',
        npcGuide: 'assets/images/npc_guide.png',
        itemRope: 'assets/images/item_rope.png',
        itemEnergyBar: 'assets/images/item_energy_bar.png',
        arrowUp: 'assets/images/arrow_up.png',
        arrowDown: 'assets/images/arrow_down.png',
        arrowLeft: 'assets/images/arrow_left.png',
        arrowRight: 'assets/images/arrow_right.png',
        iconSnowflake: 'assets/images/icon_snowflake.png',
        iconSun: 'assets/images/icon_sun.png',
    };
    const assets = {};
    let assetsLoaded = 0;
    const totalAssets = Object.keys(ASSET_PATHS).length;

    function loadAssets() {
        startButton.disabled = true;
        for (const key in ASSET_PATHS) {
            assets[key] = new Image();
            assets[key].src = ASSET_PATHS[key];
            assets[key].onload = () => {
                assetsLoaded++;
                loadingMessage.textContent = `Loading assets... (${assetsLoaded}/${totalAssets})`;
                if (assetsLoaded === totalAssets) {
                    loadingMessage.textContent = 'Assets Loaded!';
                    startButton.disabled = false;
                    console.log("All assets loaded!");
                }
            };
            assets[key].onerror = () => {
                console.error(`Failed to load asset: ${ASSET_PATHS[key]}`);
                loadingMessage.textContent = `Error loading: ${key}. Check console.`;
            };
        }
    }

    // Player
    const player = {
        x: 50,
        y: CANVAS_HEIGHT - 50 - 48, // player height
        width: 32,
        height: 48,
        speed: 3,
        climbSpeedModifier: 1, // For weather effects
        jumpStrength: 10,
        dy: 0,
        gravity: 0.4,
        onGround: false,
        hasRope: false,
        energy: 100, // Example
        image: null // Set after loading
    };

    // Camera
    let cameraY = 0;
    const SUMMIT_ALTITUDE = -1500; // How "high" the summit is (negative because y decreases upwards)

    // Ledges, NPCs, Puzzles (Define these based on altitude)
    // Altitude is relative to player's starting y. Higher = smaller y.
    const gameElements = [
        // Ground
        { type: 'ledge', x: 0, y: CANVAS_HEIGHT - 50, width: CANVAS_WIDTH, height: 50 },

        // Initial Ledges
        { type: 'ledge', x: 100, y: CANVAS_HEIGHT - 150, width: 150, height: 20 },
        { type: 'ledge', x: 300, y: CANVAS_HEIGHT - 250, width: 200, height: 20 },
        { type: 'ledge', x: 50, y: CANVAS_HEIGHT - 380, width: 180, height: 20 },

        // NPC
        {
            type: 'npc', x: 400, y: CANVAS_HEIGHT - 480,
            id: 'guide1',
            dialogue: [
                "Welcome, climber! The path ahead is tricky.",
                "Take this rope. It might help you with a wide gap later!",
                "Be wary of the changing weather."
            ],
            item: 'rope'
        },
        { type: 'ledge', x: 350, y: CANVAS_HEIGHT - 460, width: 150, height: 20 }, // Ledge for NPC

        // Puzzle
        {
            type: 'puzzle_trigger', x: 100, y: CANVAS_HEIGHT - 650,
            puzzleType: 'simonSays',
            id: 'puzzle1',
            instruction: "The ancient spirits demand a tribute! Repeat the sequence:",
            sequenceLength: 3,
            rewardText: "The spirits are pleased. You feel a surge of energy!"
        },
        { type: 'ledge', x: 50, y: CANVAS_HEIGHT - 630, width: 200, height: 20 }, // Ledge for puzzle

        // More ledges
        { type: 'ledge', x: 400, y: CANVAS_HEIGHT - 750, width: 250, height: 20 },
        { type: 'ledge', x: 200, y: CANVAS_HEIGHT - 900, width: 150, height: 20, requiresRope: true }, // Example of using an item
        { type: 'ledge', x: 500, y: CANVAS_HEIGHT - 1050, width: 200, height: 20 },
        { type: 'ledge', x: 100, y: CANVAS_HEIGHT - 1200, width: 300, height: 20 },
        { type: 'ledge', x: 300, y: CANVAS_HEIGHT - 1400, width: 200, height: 20 },


        // Summit element
        { type: 'summit', x: CANVAS_WIDTH / 2 - 25, y: SUMMIT_ALTITUDE + 70, width: 50, height: 70 }
    ];
    // Transform y-coordinates for gameElements to be relative to initial player Y for easier altitude calc
    gameElements.forEach(el => {
        if (el.y !== undefined) { // Summit y is already absolute altitude
            if (el.type !== 'summit') el.initialY = el.y; // Store original for reference if needed
            el.y = el.y - (CANVAS_HEIGHT - 50); // Make y relative to 0 altitude
        }
    });


    let currentNPC = null;
    let currentPuzzle = null;
    let randomEventActive = null;
    let randomEventTimer = 0;


    const keys = {
        left: false,
        right: false,
        up: false, // For climbing/jumping
        space: false
    };

    function handleKeyDown(e) {
        if (gameState === 'playing') {
            if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
            if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
            if (e.key === 'ArrowUp' || e.key === 'w') keys.up = true;
            if (e.key === ' ' && player.onGround) { // Space for Jump
                keys.space = true;
                player.dy = -player.jumpStrength;
                player.onGround = false;
            }
        } else if (gameState === 'puzzle' && currentPuzzle && currentPuzzle.type === 'simonSays' && !currentPuzzle.isShowingSequence) {
            let inputDir = null;
            if (e.key === 'ArrowUp') inputDir = 'up';
            if (e.key === 'ArrowDown') inputDir = 'down'; // Add if puzzle uses it
            if (e.key === 'ArrowLeft') inputDir = 'left';
            if (e.key === 'ArrowRight') inputDir = 'right';
            if (inputDir) {
                currentPuzzle.playerInput.push(inputDir);
                playerInputDisplay.textContent = currentPuzzle.playerInput.join(', ');
                checkSimonSaysInput();
            }
        } else if (gameState === 'dialogue' && e.key === ' ') {
            advanceDialogue();
        }
    }

    function handleKeyUp(e) {
        if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
        if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
        if (e.key === 'ArrowUp' || e.key === 'w') keys.up = false;
        if (e.key === ' ') keys.space = false;
    }

    function updatePlayer() {
        if (gameState !== 'playing') return;

        // Horizontal movement
        if (keys.left) player.x -= player.speed;
        if (keys.right) player.x += player.speed;

        // Vertical movement (gravity and jump)
        player.y += player.dy;
        player.dy += player.gravity;
        player.onGround = false; // Assume not on ground until collision check

        // Collision with ledges
        let worldPlayerY = player.y - cameraY;
        gameElements.forEach(el => {
            if (el.type === 'ledge') {
                const ledgeTop = el.y;
                const ledgeBottom = el.y + el.height;
                const ledgeLeft = el.x;
                const ledgeRight = el.x + el.width;

                // Check collision with top of ledge
                if (worldPlayerY + player.height > ledgeTop &&
                    worldPlayerY + player.height < ledgeTop + player.dy + 10 && // Allow some overlap for landing
                    player.x + player.width > ledgeLeft &&
                    player.x < ledgeRight) {

                    if (el.requiresRope && !player.hasRope) {
                         // Can't land, maybe show a message or make it slippery
                    } else {
                        player.y = ledgeTop + cameraY - player.height;
                        player.dy = 0;
                        player.onGround = true;
                    }
                }
            }
        });


        // Prevent falling off bottom of screen (for now, should be game over)
        if (player.y - cameraY > CANVAS_HEIGHT - player.height) {
            player.y = CANVAS_HEIGHT - player.height + cameraY;
            player.dy = 0;
            player.onGround = true;
        }

        // Keep player within horizontal bounds
        if (player.x < 0) player.x = 0;
        if (player.x + player.width > CANVAS_WIDTH) player.x = CANVAS_WIDTH - player.width;

        // Update camera to follow player, but only upwards
        if (player.y < cameraY + CANVAS_HEIGHT / 3) {
            cameraY = player.y - CANVAS_HEIGHT / 3;
        }
         // Max camera scroll based on summit
        if (cameraY < SUMMIT_ALTITUDE) {
            cameraY = SUMMIT_ALTITUDE;
        }


        // Check interactions
        checkInteractions();

        // Check summit
        const summit = gameElements.find(el => el.type === 'summit');
        if (summit && worldPlayerY < summit.y + summit.height &&
            player.x + player.width > summit.x && player.x < summit.x + summit.width) {
            reachSummit();
        }

        // Random Events
        handleRandomEvents();
    }

    function checkInteractions() {
        const worldPlayerY = player.y - cameraY;
        gameElements.forEach(el => {
            if (player.x < el.x + (el.width || player.width) && player.x + player.width > el.x &&
                worldPlayerY < el.y + (el.height || player.height) && worldPlayerY + player.height > el.y) {

                if (el.type === 'npc' && !el.interacted) {
                    startDialogue(el);
                    el.interacted = true; // Prevent re-triggering immediately
                } else if (el.type === 'puzzle_trigger' && !el.completed) {
                    startPuzzle(el);
                    el.completed = true; // Prevent re-triggering
                }
            }
        });
    }

    function handleRandomEvents() {
        if (randomEventActive) {
            randomEventTimer--;
            if (randomEventTimer <= 0) {
                clearRandomEvent();
            }
            return;
        }

        if (Math.random() < 0.002) { // Small chance each frame
            const eventRoll = Math.random();
            if (eventRoll < 0.4) { // Blizzard
                randomEventActive = 'blizzard';
                player.climbSpeedModifier = 0.6; // Slower
                eventDisplay.innerHTML = `<img src="${assets.iconSnowflake.src}" alt="Snowflake"> Blizzard! Climbing is harder.`;
                randomEventTimer = 300; // Duration in frames (5 seconds at 60fps)
            } else if (eventRoll < 0.7) { // Sunny Spell
                randomEventActive = 'sunny';
                player.climbSpeedModifier = 1.3; // Faster
                eventDisplay.innerHTML = `<img src="${assets.iconSun.src}" alt="Sun"> Sunny Spell! Easier climbing!`;
                randomEventTimer = 240; // 4 seconds
            } else { // Found energy bar
                randomEventActive = 'energyBar';
                player.energy = Math.min(100, player.energy + 25);
                eventDisplay.innerHTML = `Found an energy bar! Energy +25.`;
                randomEventTimer = 120; // Show message for 2 seconds
                 // No modifier change, just clear message after time
                setTimeout(clearRandomEvent, 2000);
            }
        }
    }
    function clearRandomEvent() {
        if (randomEventActive === 'blizzard' || randomEventActive === 'sunny') {
            player.climbSpeedModifier = 1;
        }
        randomEventActive = null;
        eventDisplay.innerHTML = '';
    }


    function startDialogue(npcData) {
        gameState = 'dialogue';
        currentNPC = npcData;
        currentNPC.dialogueIndex = 0;
        dialogueBox.classList.remove('hidden');
        advanceDialogue();
    }

    function advanceDialogue() {
        if (!currentNPC || currentNPC.dialogueIndex >= currentNPC.dialogue.length) {
            endDialogue();
            return;
        }
        dialogueText.textContent = currentNPC.dialogue[currentNPC.dialogueIndex];
        currentNPC.dialogueIndex++;
    }

    function endDialogue() {
        dialogueBox.classList.add('hidden');
        if (currentNPC.item) {
            givePlayerItem(currentNPC.item);
            // Optionally, show a message "You received [item]!"
            eventDisplay.textContent = `Received ${currentNPC.item}!`;
            setTimeout(() => eventDisplay.textContent = '', 2000);
        }
        currentNPC = null;
        gameState = 'playing';
    }
    dialogueButton.onclick = advanceDialogue;


    function givePlayerItem(itemType) {
        if (itemType === 'rope') player.hasRope = true;
        if (itemType === 'energyBar') player.energy = Math.min(100, player.energy + 50);
        console.log(`Player received ${itemType}`);
    }

    function startPuzzle(puzzleData) {
        gameState = 'puzzle';
        currentPuzzle = { ...puzzleData, type: puzzleData.puzzleType }; // Store type
        puzzleOverlay.classList.remove('hidden');
        puzzleInstructions.textContent = puzzleData.instruction;

        if (currentPuzzle.type === 'simonSays') {
            generateSimonSaysSequence();
            currentPuzzle.isShowingSequence = true;
            currentPuzzle.playerInput = [];
            playerInputDisplay.textContent = '';
            displaySimonSaysSequence();
        }
    }

    function generateSimonSaysSequence() {
        const directions = ['up', 'left', 'right']; // 'down' might be confusing for climbing
        currentPuzzle.sequence = [];
        for (let i = 0; i < currentPuzzle.sequenceLength; i++) {
            currentPuzzle.sequence.push(directions[Math.floor(Math.random() * directions.length)]);
        }
    }

    let sequenceDisplayTimeout;
    function displaySimonSaysSequence(index = 0) {
        clearTimeout(sequenceDisplayTimeout);
        puzzleSequenceDisplay.innerHTML = ''; // Clear previous
        if (index < currentPuzzle.sequence.length) {
            const dir = currentPuzzle.sequence[index];
            let arrowImgSrc = '';
            if (dir === 'up') arrowImgSrc = assets.arrowUp.src;
            else if (dir === 'left') arrowImgSrc = assets.arrowLeft.src;
            else if (dir === 'right') arrowImgSrc = assets.arrowRight.src;
            // else if (dir === 'down') arrowImgSrc = assets.arrowDown.src;

            puzzleSequenceDisplay.innerHTML = `<img src="${arrowImgSrc}" alt="${dir}" class="highlight">`;

            sequenceDisplayTimeout = setTimeout(() => {
                puzzleSequenceDisplay.innerHTML = `<img src="${arrowImgSrc}" alt="${dir}">`; // Remove highlight
                setTimeout(() => displaySimonSaysSequence(index + 1), 300); // Pause before next
            }, 700); // How long to show highlighted
        } else {
            puzzleSequenceDisplay.innerHTML = 'Your turn!';
            currentPuzzle.isShowingSequence = false;
        }
    }

    function checkSimonSaysInput() {
        const len = currentPuzzle.playerInput.length;
        if (currentPuzzle.playerInput[len - 1] !== currentPuzzle.sequence[len - 1]) {
            // Incorrect input
            puzzleSequenceDisplay.innerHTML = `Incorrect! Sequence was: ${currentPuzzle.sequence.map(s => `<img src="${assets['arrow'+s.charAt(0).toUpperCase() + s.slice(1)].src}" style="width:20px;height:20px;">`).join('')}. Try again penalty.`;
            gameTime += 5; // 5 second penalty
            currentPuzzle.playerInput = [];
            playerInputDisplay.textContent = '';
            setTimeout(() => { // Reset for another try or just end it. For now, end.
                puzzleSequenceDisplay.textContent = "Puzzle failed. Moving on.";
                setTimeout(endPuzzle, 1500);
            }, 2000);
            return;
        }

        if (len === currentPuzzle.sequence.length) {
            // Correct sequence
            puzzleSequenceDisplay.innerHTML = `Correct! ${currentPuzzle.rewardText || "Well done!"}`;
            if (currentPuzzle.id === 'puzzle1') player.energy = Math.min(100, player.energy + 30); // Example reward
            setTimeout(endPuzzle, 2000);
        }
    }


    function endPuzzle() {
        puzzleOverlay.classList.add('hidden');
        currentPuzzle = null;
        gameState = 'playing';
    }


    function formatTime(seconds) {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    function startGameFlow() {
        resetGame();
        startScreen.classList.add('hidden');
        summitScreen.classList.add('hidden');
        gameState = 'playing';
        timerInterval = setInterval(() => {
            if (gameState === 'playing') {
                gameTime++;
                timerDisplay.textContent = `Time: ${formatTime(gameTime)}`;
            }
        }, 1000);
        gameLoop();
    }

    function resetGame() {
        player.x = 50;
        player.y = CANVAS_HEIGHT - 50 - player.height; // Reset y relative to canvas bottom first
        player.dy = 0;
        player.onGround = false;
        player.hasRope = false;
        player.energy = 100;
        player.climbSpeedModifier = 1;

        cameraY = 0; // Reset camera
        // Re-adjust player's 'absolute' y for the new camera position
        player.y = (CANVAS_HEIGHT - 50 - player.height) + cameraY;


        gameTime = 0;
        timerDisplay.textContent = `Time: 00:00:00`;
        clearInterval(timerInterval);

        gameElements.forEach(el => { // Reset interacted/completed states
            el.interacted = false;
            el.completed = false;
        });
        clearRandomEvent();
        currentNPC = null;
        currentPuzzle = null;
    }


    function reachSummit() {
        gameState = 'summit';
        clearInterval(timerInterval);
        finalTimeDisplay.textContent = formatTime(gameTime);
        summitScreen.classList.remove('hidden');
    }

    function draw() {
        // Clear canvas
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw background (parallax scrolling)
        if (assets.skyBackground && assets.skyBackground.complete) {
            // Calculate offset for seamless vertical scrolling
            const bgHeight = assets.skyBackground.height;
            const bgWidth = assets.skyBackground.width; // Assuming it's wider or same as canvas
             // Tile if narrower, scale if wider. For simplicity, assume it's designed to tile or fit.
            const yOffset = cameraY % bgHeight;
            ctx.drawImage(assets.skyBackground, 0, yOffset, CANVAS_WIDTH, CANVAS_HEIGHT, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            if (yOffset < 0) { // Draw the part that wraps around from the bottom
                 ctx.drawImage(assets.skyBackground, 0, bgHeight + yOffset, CANVAS_WIDTH, CANVAS_HEIGHT, 0, 0, CANVAS_WIDTH, Math.abs(yOffset));
            } else if (yOffset > 0 && CANVAS_HEIGHT - yOffset > 0) { // Draw the part that wraps around from the top
                 ctx.drawImage(assets.skyBackground, 0, 0, CANVAS_WIDTH, yOffset, 0, CANVAS_HEIGHT - yOffset, CANVAS_WIDTH, yOffset);
            }
        } else {
            ctx.fillStyle = '#70c5ce'; // Fallback sky
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }


        // Draw game elements (ledges, npcs, summit flag) relative to camera
        ctx.save();
        ctx.translate(0, -cameraY);

        gameElements.forEach(el => {
            const elScreenY = el.y; // y is already world y for elements
            if (elScreenY > cameraY + CANVAS_HEIGHT || elScreenY + (el.height || 50) < cameraY) {
                return; // Don't draw if off-screen
            }

            if (el.type === 'ledge') {
                if (assets.ledgeRock && assets.ledgeRock.complete) {
                    // Tile the ledge image
                    for (let i = 0; i < el.width; i += assets.ledgeRock.width) {
                        ctx.drawImage(assets.ledgeRock, el.x + i, elScreenY, Math.min(assets.ledgeRock.width, el.width - i), el.height);
                    }
                } else {
                    ctx.fillStyle = el.requiresRope && !player.hasRope ? '#FF8888' : '#8B4513'; // Brown or red if needs rope
                    ctx.fillRect(el.x, elScreenY, el.width, el.height);
                }
                if (el.requiresRope && !player.hasRope) {
                    ctx.fillStyle = "yellow";
                    ctx.font = "12px Arial";
                    ctx.fillText("Rope needed!", el.x, elScreenY - 5);
                }

            } else if (el.type === 'npc' && assets.npcGuide && assets.npcGuide.complete) {
                ctx.drawImage(assets.npcGuide, el.x, elScreenY - el.height || assets.npcGuide.height, assets.npcGuide.width, assets.npcGuide.height); // draw npc above its y point
                 if (!el.interacted) {
                    ctx.fillStyle = "white"; ctx.font = "14px Arial"; ctx.fillText("!", el.x + assets.npcGuide.width/2 - 3, elScreenY - (el.height || assets.npcGuide.height) - 5);
                 }
            } else if (el.type === 'puzzle_trigger' && !el.completed) {
                ctx.fillStyle = 'gold';
                ctx.fillRect(el.x, elScreenY, 30, 30); // Simple marker for puzzle
                ctx.fillStyle = "black"; ctx.font = "20px Arial"; ctx.fillText("?", el.x + 8, elScreenY + 22);
            } else if (el.type === 'summit' && assets.summitFlag && assets.summitFlag.complete) {
                ctx.drawImage(assets.summitFlag, el.x, elScreenY, el.width, el.height);
            }
        });

        // Draw Player
        if (assets.playerIdle && assets.playerIdle.complete) {
            ctx.drawImage(assets.playerIdle, player.x, player.y, player.width, player.height);
        } else {
            ctx.fillStyle = 'blue';
            ctx.fillRect(player.x, player.y, player.width, player.height);
        }
        ctx.restore(); // Restore transform for UI elements that are fixed
    }


    function gameLoop() {
        if (gameState === 'startScreen' || gameState === 'summit') {
            // Don't run game logic if on these screens, but still draw canvas if needed for background
            if (gameState === 'startScreen' && assets.skyBackground && assets.skyBackground.complete) {
                 ctx.drawImage(assets.skyBackground, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            }
            return;
        }
        if (gameState === 'playing') {
             updatePlayer();
        }
        draw();
        requestAnimationFrame(gameLoop);
    }

    // Event Listeners
    startButton.onclick = startGameFlow;
    playAgainButton.onclick = startGameFlow;
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Initial Load
    loadAssets();
    // Draw something on canvas for start screen background if desired
    if (assets.skyBackground && assets.skyBackground.complete) {
        ctx.drawImage(assets.skyBackground, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
        ctx.fillStyle = '#70c5ce';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
});
