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
    let assetsError = false; // Flag to track if any asset fails

    function loadAssets() {
        startButton.disabled = true;
        loadingMessage.textContent = 'Loading assets...'; // Initial message
        assetsError = false; // Reset error flag
        assetsLoaded = 0; // Reset counter

        const assetKeys = Object.keys(ASSET_PATHS);

        if (assetKeys.length === 0) {
            loadingMessage.textContent = 'No assets defined. Ready to start.';
            startButton.disabled = false;
            console.log("No assets defined. Button enabled.");
            return;
        }

        assetKeys.forEach(key => {
            assets[key] = new Image();
            assets[key].src = ASSET_PATHS[key];

            assets[key].onload = () => {
                if (assetsError) return; // If an error already occurred, stop processing further successful loads for feedback

                assetsLoaded++;
                loadingMessage.textContent = `Loading assets... (${assetsLoaded}/${totalAssets})`;
                console.log(`Loaded: ${key} (${assetsLoaded}/${totalAssets})`);

                if (assetsLoaded === totalAssets && !assetsError) {
                    loadingMessage.textContent = 'Assets Loaded! Click Start.';
                    startButton.disabled = false;
                    console.log("All assets loaded successfully!");
                }
            };

            assets[key].onerror = () => {
                if (assetsError) return; // Only report the first error to avoid spamming the message
                assetsError = true;
                console.error(`ERROR: Failed to load asset "${key}" at path: ${ASSET_PATHS[key]}`);
                loadingMessage.innerHTML = `<strong>Error loading asset: ${key}</strong><br>Path: ${ASSET_PATHS[key]}<br>Please check file exists and path is correct in <code>game.js</code>.<br>Game cannot start.`;
                startButton.disabled = true; // Ensure button remains disabled
            };
        });
    }


    // Player
    const player = {
        x: 50,
        y: CANVAS_HEIGHT - 50 - 48, // player height (initial canvas relative y)
        worldY: 0, // This will be the absolute altitude
        width: 32,
        height: 48,
        speed: 3,
        climbSpeedModifier: 1,
        jumpStrength: 10,
        dy: 0,
        gravity: 0.4,
        onGround: false,
        hasRope: false,
        energy: 100,
        image: null
    };
    player.worldY = player.y; // Initialize worldY

    // Camera
    let cameraY = 0;
    const SUMMIT_ALTITUDE = -1500;

    // Ledges, NPCs, Puzzles
    const gameElements = [
        { type: 'ledge', x: 0, worldY: CANVAS_HEIGHT - 50, width: CANVAS_WIDTH, height: 50 },
        { type: 'ledge', x: 100, worldY: CANVAS_HEIGHT - 150, width: 150, height: 20 },
        { type: 'ledge', x: 300, worldY: CANVAS_HEIGHT - 250, width: 200, height: 20 },
        { type: 'ledge', x: 50, worldY: CANVAS_HEIGHT - 380, width: 180, height: 20 },
        {
            type: 'npc', x: 400, worldY: CANVAS_HEIGHT - 480, width: 32, height: 48,
            id: 'guide1',
            dialogue: ["Welcome, climber! The path ahead is tricky.", "Take this rope. It might help you with a wide gap later!", "Be wary of the changing weather."],
            item: 'rope'
        },
        { type: 'ledge', x: 350, worldY: CANVAS_HEIGHT - 460, width: 150, height: 20 },
        {
            type: 'puzzle_trigger', x: 100, worldY: CANVAS_HEIGHT - 650, width: 30, height: 30,
            puzzleType: 'simonSays',
            id: 'puzzle1',
            instruction: "The ancient spirits demand a tribute! Repeat the sequence:",
            sequenceLength: 3,
            rewardText: "The spirits are pleased. You feel a surge of energy!"
        },
        { type: 'ledge', x: 50, worldY: CANVAS_HEIGHT - 630, width: 200, height: 20 },
        { type: 'ledge', x: 400, worldY: CANVAS_HEIGHT - 750, width: 250, height: 20 },
        { type: 'ledge', x: 200, worldY: CANVAS_HEIGHT - 900, width: 150, height: 20, requiresRope: true },
        { type: 'ledge', x: 500, worldY: CANVAS_HEIGHT - 1050, width: 200, height: 20 },
        { type: 'ledge', x: 100, worldY: CANVAS_HEIGHT - 1200, width: 300, height: 20 },
        { type: 'ledge', x: 300, worldY: CANVAS_HEIGHT - 1400, width: 200, height: 20 },
        { type: 'summit', x: CANVAS_WIDTH / 2 - 25, worldY: SUMMIT_ALTITUDE, width: 50, height: 70 } // Note: SUMMIT_ALTITUDE for worldY
    ];

    let currentNPC = null;
    let currentPuzzle = null;
    let randomEventActive = null;
    let randomEventTimer = 0;

    const keys = { left: false, right: false, up: false, space: false };

    function handleKeyDown(e) {
        if (gameState === 'playing') {
            if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
            if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
            // Up key might be used for climbing action later, not jump. Jump is space.
            // if (e.key === 'ArrowUp' || e.key === 'w') keys.up = true;
            if (e.key === ' ' && player.onGround) {
                keys.space = true;
                player.dy = -player.jumpStrength;
                player.onGround = false;
            }
        } else if (gameState === 'puzzle' && currentPuzzle && currentPuzzle.type === 'simonSays' && !currentPuzzle.isShowingSequence) {
            let inputDir = null;
            if (e.key === 'ArrowUp') inputDir = 'up';
            if (e.key === 'ArrowDown') inputDir = 'down';
            if (e.key === 'ArrowLeft') inputDir = 'left';
            if (e.key === 'ArrowRight') inputDir = 'right';
            if (inputDir) {
                currentPuzzle.playerInput.push(inputDir);
                playerInputDisplay.textContent = currentPuzzle.playerInput.join(', ');
                checkSimonSaysInput();
            }
        } else if (gameState === 'dialogue' && (e.key === ' ' || e.key === 'Enter')) {
            advanceDialogue();
        }
    }

    function handleKeyUp(e) {
        if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
        if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
        // if (e.key === 'ArrowUp' || e.key === 'w') keys.up = false;
        if (e.key === ' ') keys.space = false;
    }

    function updatePlayer() {
        if (gameState !== 'playing') return;

        // Horizontal movement
        if (keys.left) player.x -= player.speed * player.climbSpeedModifier;
        if (keys.right) player.x += player.speed * player.climbSpeedModifier;

        // Vertical movement (gravity and jump)
        player.worldY += player.dy;
        player.dy += player.gravity;
        player.onGround = false;

        // Collision with ledges
        gameElements.forEach(el => {
            if (el.type === 'ledge') {
                const ledgeTop = el.worldY;
                const ledgeBottom = el.worldY + el.height;
                const ledgeLeft = el.x;
                const ledgeRight = el.x + el.width;

                if (player.worldY + player.height > ledgeTop &&
                    player.worldY + player.height < ledgeTop + player.dy + 15 && // Generous landing
                    player.dy >= 0 && // Only collide when falling onto it
                    player.x + player.width > ledgeLeft &&
                    player.x < ledgeRight) {

                    if (el.requiresRope && !player.hasRope) {
                        // Player can't land or slips off - for now, just pass through
                    } else {
                        player.worldY = ledgeTop - player.height;
                        player.dy = 0;
                        player.onGround = true;
                    }
                }
            }
        });

        // Prevent falling off absolute bottom (initial ground)
        const groundLevel = CANVAS_HEIGHT - player.height; // This is the effective "0" altitude in world coordinates
        if (player.worldY > groundLevel) {
             player.worldY = groundLevel;
             player.dy = 0;
             player.onGround = true;
        }


        // Keep player within horizontal bounds
        if (player.x < 0) player.x = 0;
        if (player.x + player.width > CANVAS_WIDTH) player.x = CANVAS_WIDTH - player.width;

        // Update camera to follow player upwards
        // Player's screen Y = player.worldY - cameraY
        // We want player's screen Y to be around CANVAS_HEIGHT / 2 or a bit lower
        // So, player.worldY - cameraY = CANVAS_HEIGHT * 0.6
        // cameraY = player.worldY - CANVAS_HEIGHT * 0.6
        let targetCameraY = player.worldY - CANVAS_HEIGHT * 0.6;
        if (targetCameraY < cameraY || cameraY === 0 && player.worldY < CANVAS_HEIGHT - player.height - 10) { // Only scroll up
             cameraY = Math.max(SUMMIT_ALTITUDE, targetCameraY); // Don't scroll past summit view
        }
        // Ensure camera doesn't go below initial view (0)
        if (player.worldY > CANVAS_HEIGHT * 0.5) { // If player is near the bottom half of the initial screen
             cameraY = Math.max(cameraY, 0);
        }


        checkInteractions();

        const summit = gameElements.find(el => el.type === 'summit');
        if (summit && player.worldY + player.height < summit.worldY + summit.height && // Player's feet touch summit platform
            player.worldY > summit.worldY - player.height && // Player is somewhat above it
            player.x + player.width > summit.x && player.x < summit.x + summit.width) {
            reachSummit();
        }

        handleRandomEvents();
    }

    function checkInteractions() {
        gameElements.forEach(el => {
            const elTop = el.worldY;
            const elBottom = el.worldY + (el.height || player.height); // Use el.height if available
            const elLeft = el.x;
            const elRight = el.x + (el.width || player.width); // Use el.width if available

            if (player.x < elRight && player.x + player.width > elLeft &&
                player.worldY < elBottom && player.worldY + player.height > elTop) {

                if (el.type === 'npc' && !el.interacted) {
                    startDialogue(el);
                    el.interacted = true;
                } else if (el.type === 'puzzle_trigger' && !el.completed) {
                    startPuzzle(el);
                    el.completed = true;
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

        if (Math.random() < 0.0015) { // Adjusted chance
            const eventRoll = Math.random();
            if (eventRoll < 0.4 && assets.iconSnowflake) {
                randomEventActive = 'blizzard';
                player.climbSpeedModifier = 0.6;
                eventDisplay.innerHTML = `<img src="${assets.iconSnowflake.src}" alt="Snowflake"> Blizzard! Climbing is harder.`;
                randomEventTimer = 300;
            } else if (eventRoll < 0.7 && assets.iconSun) {
                randomEventActive = 'sunny';
                player.climbSpeedModifier = 1.3;
                eventDisplay.innerHTML = `<img src="${assets.iconSun.src}" alt="Sun"> Sunny Spell! Easier climbing!`;
                randomEventTimer = 240;
            } else {
                randomEventActive = 'energyBarFound';
                player.energy = Math.min(100, player.energy + 25);
                eventDisplay.innerHTML = `Found an energy bar! Energy +25.`;
                randomEventTimer = 120;
                setTimeout(clearRandomEvent, 2000); // Message clears automatically
            }
        }
    }
    function clearRandomEvent() {
        if (randomEventActive === 'blizzard' || randomEventActive === 'sunny') {
            player.climbSpeedModifier = 1;
        }
        randomEventActive = null;
        eventDisplay.innerHTML = '';
        randomEventTimer = 0;
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
        dialogueButton.textContent = (currentNPC.dialogueIndex === currentNPC.dialogue.length - 1) ? "Done" : "Next";
        currentNPC.dialogueIndex++;
    }

    function endDialogue() {
        dialogueBox.classList.add('hidden');
        if (currentNPC && currentNPC.item) {
            givePlayerItem(currentNPC.item);
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
        currentPuzzle = { ...puzzleData };
        puzzleOverlay.classList.remove('hidden');
        puzzleInstructions.textContent = puzzleData.instruction;

        if (currentPuzzle.puzzleType === 'simonSays') {
            generateSimonSaysSequence();
            currentPuzzle.isShowingSequence = true;
            currentPuzzle.playerInput = [];
            playerInputDisplay.textContent = '';
            displaySimonSaysSequence();
        }
    }

    function generateSimonSaysSequence() {
        const directions = ['up', 'left', 'right', 'down'].filter(dir => assets['arrow' + dir.charAt(0).toUpperCase() + dir.slice(1)]);
        if (directions.length === 0) {
            console.error("No arrow assets loaded for Simon Says puzzle!");
            endPuzzle(); return;
        }
        currentPuzzle.sequence = [];
        for (let i = 0; i < currentPuzzle.sequenceLength; i++) {
            currentPuzzle.sequence.push(directions[Math.floor(Math.random() * directions.length)]);
        }
    }

    let sequenceDisplayTimeout;
    function displaySimonSaysSequence(index = 0) {
        clearTimeout(sequenceDisplayTimeout);
        puzzleSequenceDisplay.innerHTML = '';
        if (index < currentPuzzle.sequence.length) {
            const dir = currentPuzzle.sequence[index];
            const arrowAssetKey = 'arrow' + dir.charAt(0).toUpperCase() + dir.slice(1);
            if (!assets[arrowAssetKey] || !assets[arrowAssetKey].complete) {
                console.error("Missing arrow asset for Simon Says: " + arrowAssetKey);
                puzzleSequenceDisplay.innerHTML = 'Error displaying sequence.';
                currentPuzzle.isShowingSequence = false;
                return;
            }
            puzzleSequenceDisplay.innerHTML = `<img src="${assets[arrowAssetKey].src}" alt="${dir}" class="highlight">`;
            sequenceDisplayTimeout = setTimeout(() => {
                puzzleSequenceDisplay.innerHTML = `<img src="${assets[arrowAssetKey].src}" alt="${dir}">`;
                setTimeout(() => displaySimonSaysSequence(index + 1), 300);
            }, 700);
        } else {
            puzzleSequenceDisplay.innerHTML = 'Your turn! Use Arrow Keys.';
            currentPuzzle.isShowingSequence = false;
        }
    }

    function checkSimonSaysInput() {
        const len = currentPuzzle.playerInput.length;
        const dir = currentPuzzle.playerInput[len - 1];
        const arrowAssetKey = 'arrow' + dir.charAt(0).toUpperCase() + dir.slice(1);

        if (!assets[arrowAssetKey] || !assets[arrowAssetKey].complete) {
             playerInputDisplay.textContent += ` (Unknown key: ${dir})`; // Visual feedback for invalid key
             currentPuzzle.playerInput.pop(); // Remove invalid input
             return;
        }


        if (currentPuzzle.playerInput[len - 1] !== currentPuzzle.sequence[len - 1]) {
            puzzleSequenceDisplay.innerHTML = `Incorrect! Penalty. Sequence was: ${currentPuzzle.sequence.map(s => `<img src="${assets['arrow'+s.charAt(0).toUpperCase() + s.slice(1)].src}" style="width:20px;height:20px;vertical-align:middle;">`).join(' ')}`;
            gameTime += 5;
            currentPuzzle.playerInput = [];
            playerInputDisplay.textContent = '';
            setTimeout(() => {
                puzzleSequenceDisplay.textContent = "Puzzle failed. Moving on.";
                setTimeout(endPuzzle, 1500);
            }, 2000);
            return;
        }

        if (len === currentPuzzle.sequence.length) {
            puzzleSequenceDisplay.innerHTML = `Correct! ${currentPuzzle.rewardText || "Well done!"}`;
            if (currentPuzzle.id === 'puzzle1') player.energy = Math.min(100, player.energy + 30);
            setTimeout(endPuzzle, 2000);
        }
    }

    function endPuzzle() {
        puzzleOverlay.classList.add('hidden');
        currentPuzzle = null;
        gameState = 'playing';
    }

    function formatTime(totalSeconds) {
        const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    function startGameFlow() {
        console.log("startGameFlow called");
        if (assetsError) {
            loadingMessage.innerHTML = "Cannot start game due to asset loading errors. Please check console and fix.";
            return;
        }
        resetGame();
        startScreen.classList.add('hidden');
        summitScreen.classList.add('hidden');
        dialogueBox.classList.add('hidden'); // Ensure dialogue is hidden
        puzzleOverlay.classList.add('hidden'); // Ensure puzzle is hidden
        gameState = 'playing';
        timerInterval = setInterval(() => {
            if (gameState === 'playing') {
                gameTime++;
                timerDisplay.textContent = `Time: ${formatTime(gameTime)}`;
            }
        }, 1000);
        if (!animationFrameId) { // Prevent multiple loops
            gameLoop();
        }
    }

    function resetGame() {
        player.x = 50;
        player.worldY = CANVAS_HEIGHT - 50 - player.height; // Reset worldY to initial ground
        player.dy = 0;
        player.onGround = true; // Start on ground
        player.hasRope = false;
        player.energy = 100;
        player.climbSpeedModifier = 1;

        cameraY = 0;

        gameTime = 0;
        timerDisplay.textContent = `Time: 00:00:00`;
        clearInterval(timerInterval);

        gameElements.forEach(el => {
            el.interacted = false;
            el.completed = false;
        });
        clearRandomEvent();
        currentNPC = null;
        currentPuzzle = null;
    }

    function reachSummit() {
        if (gameState === 'summit') return; // Prevent re-triggering
        gameState = 'summit';
        clearInterval(timerInterval);
        finalTimeDisplay.textContent = formatTime(gameTime);
        summitScreen.classList.remove('hidden');
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }

    function draw() {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw background (parallax scrolling)
        if (assets.skyBackground && assets.skyBackground.complete) {
            const bgHeight = assets.skyBackground.height;
            const parallaxFactor = 0.5; // Slower scroll for background
            const yOffset = (cameraY * parallaxFactor) % bgHeight;

            ctx.drawImage(assets.skyBackground, 0, yOffset, assets.skyBackground.width, bgHeight - yOffset, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT * ((bgHeight - yOffset)/bgHeight) );
            if (bgHeight - yOffset < CANVAS_HEIGHT) { // Need to draw wrapped part
                 ctx.drawImage(assets.skyBackground, 0, 0, assets.skyBackground.width, yOffset - (bgHeight - CANVAS_HEIGHT), 0, CANVAS_HEIGHT * ((bgHeight - yOffset)/bgHeight), CANVAS_WIDTH, CANVAS_HEIGHT * ((yOffset - (bgHeight - CANVAS_HEIGHT))/bgHeight) );
            }


        } else {
            ctx.fillStyle = '#70c5ce';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        ctx.save();
        ctx.translate(0, -cameraY); // Apply camera transformation

        gameElements.forEach(el => {
            const elScreenY = el.worldY;
            const elHeight = el.height || 50; // Default height if not specified
            // Basic culling
            if (elScreenY > cameraY + CANVAS_HEIGHT || elScreenY + elHeight < cameraY) {
                return;
            }

            if (el.type === 'ledge') {
                if (assets.ledgeRock && assets.ledgeRock.complete) {
                    for (let i = 0; i < el.width; i += assets.ledgeRock.width) {
                        const w = Math.min(assets.ledgeRock.width, el.width - i);
                        ctx.drawImage(assets.ledgeRock, 0, 0, w / assets.ledgeRock.width * assets.ledgeRock.width , assets.ledgeRock.height, el.x + i, elScreenY, w, el.height);
                    }
                } else {
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(el.x, elScreenY, el.width, el.height);
                }
                if (el.requiresRope && !player.hasRope) {
                    ctx.fillStyle = "yellow"; ctx.font = "12px Arial";
                    ctx.fillText("Rope needed!", el.x, elScreenY - 5);
                }
            } else if (el.type === 'npc' && assets.npcGuide && assets.npcGuide.complete) {
                ctx.drawImage(assets.npcGuide, el.x, elScreenY, el.width, el.height);
                if (!el.interacted) {
                    ctx.fillStyle = "white"; ctx.font = "14px Arial"; ctx.fillText("!", el.x + el.width / 2 - 3, elScreenY - 5);
                }
            } else if (el.type === 'puzzle_trigger' && !el.completed) {
                ctx.fillStyle = 'gold'; ctx.fillRect(el.x, elScreenY, el.width, el.height);
                ctx.fillStyle = "black"; ctx.font = "20px Arial"; ctx.fillText("?", el.x + 8, elScreenY + 22);
            } else if (el.type === 'summit' && assets.summitFlag && assets.summitFlag.complete) {
                ctx.drawImage(assets.summitFlag, el.x, elScreenY, el.width, el.height);
            }
        });

        // Draw Player
        const playerScreenY = player.worldY;
        if (assets.playerIdle && assets.playerIdle.complete) {
            ctx.drawImage(assets.playerIdle, player.x, playerScreenY, player.width, player.height);
        } else {
            ctx.fillStyle = 'blue';
            ctx.fillRect(player.x, playerScreenY, player.width, player.height);
        }
        ctx.restore(); // Restore transform
    }

    let animationFrameId = null;
    function gameLoop() {
        if (gameState === 'startScreen') {
            // Draw static start screen background if needed, but mostly handled by HTML/CSS
            if (assets.skyBackground && assets.skyBackground.complete && !assetsError) {
                ctx.drawImage(assets.skyBackground, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            } else if (!assetsError) {
                ctx.fillStyle = '#70c5ce'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            }
             // No animation frame request here, wait for button.
            return;
        }
        if (gameState === 'summit') {
            // Potentially draw final summit scene on canvas or let HTML overlay handle it
            return; // Stop game loop
        }

        if (gameState === 'playing') {
            updatePlayer();
        }
        // For 'dialogue' or 'puzzle', game logic pauses, but drawing continues
        draw();
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    // Event Listeners
    startButton.onclick = startGameFlow;
    playAgainButton.onclick = () => {
        summitScreen.classList.add('hidden');
        startScreen.classList.remove('hidden'); // Go back to start screen
        resetGame(); // Reset game state fully for a fresh start
        gameState = 'startScreen';
        gameLoop(); // Redraw initial start screen canvas if needed
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Initial Load
    loadAssets();
    gameLoop(); // Call once to draw initial start screen background if assets are ready fast enough or fallback
});
