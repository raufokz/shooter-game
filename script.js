// Game Constants
const GAME_STATES = {
    MENU: 0,
    PLAYING: 1,
    PAUSED: 2,
    GAME_OVER: 3,
    HIGHSCORES: 4,
    HOW_TO_PLAY: 5,
    SETTINGS: 6,
    LEVEL_TRANSITION: 7
};

// Sound effects
const sounds = {
    shoot: new Audio('assets/sounds/laser-shot.mp3'),
    explosion: new Audio('assets/sounds/explosion.mp3'),
    powerup: new Audio('assets/sounds/powerup.wav'),
    gameover: new Audio('assets/sounds/game-over.mp3'),
    levelup: new Audio('assets/sounds/level-up.mp3'),
    background: new Audio('assets/sounds/background-music.mp3'),
    bossSpawn: new Audio('assets/sounds/boss-spawn.mp3'),
    bossDefeat: new Audio('assets/sounds/boss-defeat.mp3')
};

// Game Variables
let canvas, ctx;
let gameState = GAME_STATES.MENU;
let score = 0;
let lives = 3;
let level = 1;
let enemies = [];
let bullets = [];
let powerUps = [];
let particles = [];
let lastTime = 0;
let enemySpawnTimer = 0;
let powerUpTimer = 0;
let keys = {};
let levelTransitionTimer = 0;
let bossActive = false;
let boss = null;
let stars = [];
let comboCounter = 0;
let lastEnemyKillTime = 0;
let comboMultiplier = 1;
let maxCombo = 0;
let specialWeaponActive = false;
let specialWeaponTimer = 0;
let specialWeaponCooldown = 0;
let isMuted = false;

// Player object
let player = {
    x: 400,
    y: 500,
    width: 50,
    height: 50,
    speed: 5,
    baseSpeed: 5,
    isShooting: false,
    shootCooldown: 0,
    shootDelay: 300,
    invulnerable: false,
    invulnerableTimer: 0,
    image: new Image(),
    specialWeaponCharges: 0,
    doubleShot: false,
    tripleShot: false
};



// Difficulty settings
const difficultySettings = {
    easy: { enemySpeedMultiplier: 0.8, enemySpawnRate: 1.2, playerDamage: 0.8 },
    medium: { enemySpeedMultiplier: 1.0, enemySpawnRate: 1.0, playerDamage: 1.0 },
    hard: { enemySpeedMultiplier: 1.3, enemySpawnRate: 0.8, playerDamage: 1.2 },
    insane: { enemySpeedMultiplier: 1.8, enemySpawnRate: 0.6, playerDamage: 1.5 }
};

// Enemy types with images
const enemyTypes = [
    { image: 'assets/enemy1.png', speed: 1.5, score: 100, health: 1 },
    { image: 'assets/enemy2.png', speed: 2.0, score: 150, health: 2 },
    { image: 'assets/enemy3.png', speed: 2.5, score: 200, health: 3 },
    { image: 'assets/enemy4.png', speed: 1.8, score: 250, health: 4, isBoss: false }
];

// Boss enemy
const bossType = {
    image: 'assets/boss.png',
    speed: 1.0,
    score: 5000,
    health: 50,
    isBoss: true
};

// Power-up types with images
const powerUpTypes = [
    { type: 'extraLife', image: 'assets/powerup-life.png', color: '#ff0000', rarity: 0.1 },
    { type: 'rapidFire', image: 'assets/powerup-rapid.png', color: '#00ff00', rarity: 0.3 },
    { type: 'shield', image: 'assets/powerup-shield.png', color: '#0000ff', rarity: 0.2 },
    { type: 'doubleShot', image: 'assets/powerup-double.png', color: '#ffff00', rarity: 0.2 },
    { type: 'tripleShot', image: 'assets/powerup-triple.png', color: '#ff00ff', rarity: 0.15 },
    { type: 'specialWeapon', image: 'assets/powerup-special.png', color: '#00ffff', rarity: 0.05 }
];

// Special weapon types
const specialWeapons = [
    { name: 'Plasma Wave', damage: 10, duration: 3000, cooldown: 15000 },
    { name: 'Missile Barrage', damage: 15, duration: 2000, cooldown: 20000 },
    { name: 'Laser Beam', damage: 20, duration: 1500, cooldown: 25000 }
];

// DOM Elements
const screens = {
    mainMenu: document.getElementById('mainMenu'),
    howToPlay: document.getElementById('howToPlay'),
    highscores: document.getElementById('highscores'),
    settings: document.getElementById('settings'),
    gameScreen: document.getElementById('gameScreen'),
    pauseScreen: document.getElementById('pauseScreen'),
    gameOverScreen: document.getElementById('gameOverScreen'),
    levelTransitionScreen: document.getElementById('levelTransitionScreen')
};

// Initialize Game
function init() {
      console.log('init called'); 
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    // Set canvas size and listen for resize
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Load assets
    player.image.src = 'assets/player-ship.png';

    // Initialize game systems
    initStarfield();
    loadSettings();          // Must come before setupTouchControls
    initSounds();
    setupEventListeners();

    // Setup touch controls
 setupControls();    // Initialize controls
// setupTouchControls();
    // Start game loop
    requestAnimationFrame(gameLoop);
}


// Resize canvas to fit window
function resizeCanvas() {
    canvas.width = window.innerWidth * 0.9;
    canvas.height = window.innerHeight * 0.8;
    
    // Reposition player if game is running
    if (gameState === GAME_STATES.PLAYING || gameState === GAME_STATES.PAUSED) {
        player.x = canvas.width / 2 - player.width / 2;
        player.y = canvas.height - player.height - 20;
    }
}

// Initialize starfield background
function initStarfield() {
    stars = [];
    for (let i = 0; i < 200; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 1,
            speed: Math.random() * 3 + 1
        });
    }
}

// Initialize sound settings
function initSounds() {
    // Set initial volume
    updateSoundVolumes();
    
    // Loop background music
    sounds.background.loop = true;
    
    // Preload sounds
    for (const sound in sounds) {
        sounds[sound].load();
    }
    
    // Add sound toggle button to UI
    const soundBtn = document.createElement('button');
    soundBtn.className = 'sound-btn';
    soundBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
    soundBtn.id = 'soundToggle';
    soundBtn.title = 'Toggle Sound';
    
    const soundControls = document.createElement('div');
    soundControls.className = 'sound-controls';
    soundControls.appendChild(soundBtn);
    document.querySelector('.game-container').appendChild(soundControls);
    
    // Sound toggle functionality
    document.getElementById('soundToggle').addEventListener('click', toggleSound);
}

// Toggle sound on/off
function toggleSound() {
    isMuted = !isMuted;
    const btn = document.getElementById('soundToggle');
    
    // Toggle all sounds
    for (const sound in sounds) {
        sounds[sound].muted = isMuted;
    }
    
    // Update button icon
    if (isMuted) {
        btn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        btn.title = 'Unmute Sound';
    } else {
        btn.innerHTML = '<i class="fas fa-volume-up"></i>';
        btn.title = 'Mute Sound';
    }
}

// Update sound volumes when settings change
function updateSoundVolumes() {
    const volume = isMuted ? 0 : settings.volume / 100;
    
    sounds.shoot.volume = volume;
    sounds.explosion.volume = volume;
    sounds.powerup.volume = volume;
    sounds.gameover.volume = volume;
    sounds.levelup.volume = volume;
    sounds.background.volume = volume * 0.5; // Background music quieter
    sounds.bossSpawn.volume = volume;
    sounds.bossDefeat.volume = volume;
}

/// Game Settings
// Game Settings


// Initialize Game
// Game Settings
let settings = {
    playerName: "Player",
    volume: 50,
    difficulty: "medium",
    controls: "arrows",
    graphics: "medium",
    showFPS: false,
    autoShoot: true,
    mobileControls: 'joystick' // Changed from controlMode to mobileControls for consistency
};


// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('spaceShooterSettings');
    if (savedSettings) {
        try {
            const parsed = JSON.parse(savedSettings);
            Object.assign(settings, parsed);
            
            // Backward compatibility for old settings
            if (!settings.mobileControls) settings.mobileControls = "joystick";
            
            console.log("Loaded settings:", settings);
        } catch (e) {
            console.error("Error loading settings:", e);
        }
    }
    
    // Update UI elements
    document.getElementById('playerName').value = settings.playerName;
    document.getElementById('volume').value = settings.volume;
    document.getElementById('difficulty').value = settings.difficulty;
    document.getElementById('controls').value = settings.controls;
    document.getElementById('graphics').value = settings.graphics;
    document.getElementById('showFPS').checked = settings.showFPS;
    document.getElementById('autoShoot').checked = settings.autoShoot;
    document.getElementById('mobileControls').value = settings.mobileControls;
    
    // Update volume display
    document.getElementById('volumeValue').textContent = settings.volume;
    
    console.log(`Active control scheme: ${settings.controls} (Desktop), ${settings.mobileControls} (Mobile)`);
}

// Save settings to localStorage
function saveSettings() {
    // Get values from UI
    settings.playerName = document.getElementById('playerName').value || "Player";
    settings.volume = parseInt(document.getElementById('volume').value) || 50;
    settings.difficulty = document.getElementById('difficulty').value || "medium";
    settings.controls = document.getElementById('controls').value || "arrows";
    settings.graphics = document.getElementById('graphics').value || "medium";
    settings.showFPS = document.getElementById('showFPS').checked;
    settings.autoShoot = document.getElementById('autoShoot').checked;
    settings.mobileControls = document.getElementById('mobileControls').value || "joystick";
    
    // Update volume display
    document.getElementById('volumeValue').textContent = settings.volume;
    
    // Save to localStorage
    localStorage.setItem('spaceShooterSettings', JSON.stringify(settings));
    console.log("Settings saved:", settings);
    
    // Update game systems
    updateSoundVolumes();
    setupControls(); // Reinitialize controls
    
    alert("Settings saved successfully!");
}

// Main control setup function
function setupControls() {
    if ('ontouchstart' in window) {
        setupMobileControls();
    } else {
        setupDesktopControls();
    }
}

// Mobile controls implementation
// Updated mobile controls setup
function setupMobileControls() {
    console.log(`Initializing mobile controls (${settings.mobileControls})...`);
    
    // Remove existing controls
    const existingControls = document.querySelector('.touch-controls');
    if (existingControls) existingControls.remove();

    // Create container
    const touchControls = document.createElement('div');
    touchControls.className = 'touch-controls';
    document.body.appendChild(touchControls);

    // Add control type based on settings
    switch(settings.mobileControls) {
        case 'buttons':
            setupButtonControls(touchControls);
            break;
        case 'joystick':
            setupJoystickControls(touchControls);
            break;
        case 'drag':
            setupDragControls();
            break;
        case 'swipe':
            setupSwipeControls();
            break;
        default:
            setupSwipeControls(); // Default to swipe
    }

    // Always add action buttons (shoot and special)
    setupActionButtons(touchControls);
    // Hide controls when not in game screen
    touchControls.style.display = 'none';
    document.addEventListener('gameScreen', () => {
        if (gameState === GAME_STATES.PLAYING || gameState === GAME_STATES.PAUSED || gameState === GAME_STATES.GAME_OVER) {
            touchControls.style.display = 'block';
        } else {
            touchControls.style.display = 'none';
        }
    });
}

// Button controls for mobile (left/right buttons)
function setupButtonControls(container) {
    const movementButtons = document.createElement('div');
    movementButtons.className = 'movement-buttons';
    container.appendChild(movementButtons);

    // Left button
    const leftBtn = document.createElement('div');
    leftBtn.className = 'touch-btn left-btn';
    leftBtn.style.left = '20px';
    leftBtn.innerHTML = '<i class="fas fa-arrow-left"></i>';
    leftBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys['ArrowLeft'] = true;
    });
    leftBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys['ArrowLeft'] = false;
    });
    movementButtons.appendChild(leftBtn);

    // Right button
    const rightBtn = document.createElement('div');
    rightBtn.className = 'touch-btn right-btn';
    rightBtn.style.right = '20px';
    rightBtn.innerHTML = '<i class="fas fa-arrow-right"></i>';
    rightBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys['ArrowRight'] = true;
    });
    rightBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys['ArrowRight'] = false;
    });
    movementButtons.appendChild(rightBtn);

    // Handle touch cancellation
    document.addEventListener('touchcancel', () => {
        keys['ArrowLeft'] = false;
        keys['ArrowRight'] = false;
    });
}

// Joystick controls for mobile
function setupJoystickControls(container) {
    const joystickArea = document.createElement('div');
    joystickArea.className = 'joystick-area';
    container.appendChild(joystickArea);

    const joystick = document.createElement('div');
    joystick.className = 'joystick';
    joystickArea.appendChild(joystick);

    let touchId = null;
    let joystickActive = false;
    const joystickCenter = { x: 0, y: 0 };
    const maxJoystickDistance = 50;

    joystickArea.addEventListener('touchstart', (e) => {
        if (touchId === null && gameState === GAME_STATES.PLAYING) {
            const touch = e.changedTouches[0];
            touchId = touch.identifier;
            joystickActive = true;
            
            const rect = joystickArea.getBoundingClientRect();
            joystickCenter.x = rect.left + rect.width / 2;
            joystickCenter.y = rect.top + rect.height / 2;
            
            updateJoystickPosition(touch.clientX, touch.clientY);
            e.preventDefault();
        }
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        if (joystickActive) {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === touchId) {
                    updateJoystickPosition(touch.clientX, touch.clientY);
                    e.preventDefault();
                    break;
                }
            }
        }
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === touchId) {
                resetJoystick();
                e.preventDefault();
                break;
            }
        }
    });

    function updateJoystickPosition(clientX, clientY) {
        const dx = clientX - joystickCenter.x;
        const dy = clientY - joystickCenter.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        const limitedDistance = Math.min(distance, maxJoystickDistance);
        const limitedX = joystickCenter.x + Math.cos(angle) * limitedDistance;
        const limitedY = joystickCenter.y + Math.sin(angle) * limitedDistance;
        
        const joystickRect = joystickArea.getBoundingClientRect();
        const centerX = joystickRect.left + joystickRect.width / 2;
        const centerY = joystickRect.top + joystickRect.height / 2;
        
        joystick.style.transform = `translate(${limitedX - centerX}px, ${limitedY - centerY}px)`;
        
        const moveX = dx / maxJoystickDistance;
        const moveY = dy / maxJoystickDistance;
        
        if (gameState === GAME_STATES.PLAYING) {
            const moveSpeed = player.speed * 1.5;
            
            if (moveX < -0.3) keys['ArrowLeft'] = true;
            else keys['ArrowLeft'] = false;
            
            if (moveX > 0.3) keys['ArrowRight'] = true;
            else keys['ArrowRight'] = false;
            
            if (moveY < -0.3) keys['ArrowUp'] = true;
            else keys['ArrowUp'] = false;
            
            if (moveY > 0.3) keys['ArrowDown'] = true;
            else keys['ArrowDown'] = false;
        }
    }

    function resetJoystick() {
        joystick.style.transform = 'translate(0, 0)';
        joystickActive = false;
        touchId = null;
        keys['ArrowLeft'] = false;
        keys['ArrowRight'] = false;
        keys['ArrowUp'] = false;
        keys['ArrowDown'] = false;
    }
}

// Drag controls (finger follows player)
function setupDragControls() {
    let isDragging = false;
    let touchId = null;
    let offsetX = 0;
    let offsetY = 0;

    canvas.addEventListener('touchstart', (e) => {
        if (gameState === GAME_STATES.PLAYING && !isDragging) {
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const touchX = touch.clientX - rect.left;
            const touchY = touch.clientY - rect.top;

            // Check if touch is near player
            if (Math.abs(touchX - (player.x + player.width/2)) < 100 && 
                Math.abs(touchY - (player.y + player.height/2)) < 100) {
                isDragging = true;
                touchId = touch.identifier;
                offsetX = touchX - player.x;
                offsetY = touchY - player.y;
                e.preventDefault();
            }
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        if (isDragging) {
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                if (touch.identifier === touchId) {
                    const rect = canvas.getBoundingClientRect();
                    const touchX = touch.clientX - rect.left;
                    const touchY = touch.clientY - rect.top;

                    player.x = Math.max(0, Math.min(
                        canvas.width - player.width, 
                        touchX - offsetX
                    ));
                    player.y = Math.max(0, Math.min(
                        canvas.height - player.height, 
                        touchY - offsetY
                    ));
                    e.preventDefault();
                    break;
                }
            }
        }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === touchId) {
                isDragging = false;
                touchId = null;
                break;
            }
        }
    });
}


// Swipe controls (finger anywhere moves player)
function setupSwipeControls(container) {
    const targetCanvas = container?.querySelector('canvas') || canvas;
    if (!targetCanvas) {
        console.error('No canvas element found');
        return;
    }
    let touchStartX = 0;
    let touchStartY = 0;
    let touchId = null;

    canvas.addEventListener('touchstart', (e) => {
        if (gameState === GAME_STATES.PLAYING) {
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchId = touch.identifier;
            e.preventDefault();
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        if (gameState === GAME_STATES.PLAYING) {
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                if (touch.identifier === touchId) {
                    const dx = touch.clientX - touchStartX;
                    const dy = touch.clientY - touchStartY;
                    
                    // Update player position based on swipe
                    player.x = Math.max(0, Math.min(
                        canvas.width - player.width,
                        player.x + dx * 0.5
                    ));
                    player.y = Math.max(0, Math.min(
                        canvas.height - player.height,
                        player.y + dy * 0.5
                    ));
                    
                    touchStartX = touch.clientX;
                    touchStartY = touch.clientY;
                    e.preventDefault();
                    break;
                }
            }
        }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === touchId) {
                touchId = null;
                break;
            }
        }
    });
}

// Improved action buttons setup with better special weapon handling
function setupActionButtons(container) {
    // Create container for action buttons
    const actionButtons = document.createElement('div');
    actionButtons.className = 'action-buttons';
    container.appendChild(actionButtons);

    // Shoot button (only visible if autoShoot is disabled)
    if (!settings.autoShoot) {
        const shootBtn = document.createElement('div');
        shootBtn.className = 'touch-btn shoot-btn';
        shootBtn.innerHTML = '<i class="fas fa-bolt"></i>';
        
        // Add touch event listeners with visual feedback
        shootBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            player.isShooting = true;
            shootBtn.classList.add('active');
        });
        
        shootBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            player.isShooting = false;
            shootBtn.classList.remove('active');
        });
        
        shootBtn.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            player.isShooting = false;
            shootBtn.classList.remove('active');
        });
        
        actionButtons.appendChild(shootBtn);
    }

    // Special weapon button (initially hidden)
    const specialBtn = document.createElement('div');
    specialBtn.className = 'touch-btn special-btn hidden';
    specialBtn.innerHTML = '<i class="fas fa-bomb"></i>';
    
    // Special weapon touch handling with cooldown
    specialBtn.addEventListener('touchstart', (e) => {
        if (!specialBtn.classList.contains('disabled')) {
            e.preventDefault();
            player.useSpecial = true;
            specialBtn.classList.add('active');
            
            // Visual feedback for activation
            setTimeout(() => {
                specialBtn.classList.remove('active');
            }, 200);
            
            // Handle cooldown if applicable
            if (player.specialWeaponCooldown > 0) {
                specialBtn.classList.add('disabled');
                startCooldownTimer(specialBtn, player.specialWeaponCooldown);
            }
        }
    });
    
    actionButtons.appendChild(specialBtn);
    
    // Store reference for later use
    player.specialWeaponButton = specialBtn;
}

// Show/hide special weapon button based on availability
function updateSpecialWeaponButton() {
    if (!player.specialWeaponButton) return;
    
    const specialBtn = player.specialWeaponButton;
    
    if (player.hasSpecialWeapon) {
        specialBtn.classList.remove('hidden');
        
        // Add pulse animation if not in cooldown
        if (!specialBtn.classList.contains('disabled')) {
            specialBtn.classList.add('pulse');
        }
    } else {
        specialBtn.classList.add('hidden');
        specialBtn.classList.remove('pulse');
    }
}

// Handle special weapon cooldown
function startCooldownTimer(button, cooldownTime) {
    button.classList.add('disabled');
    button.classList.remove('pulse');
    
    // Create progress element if it doesn't exist
    let progress = button.querySelector('.cooldown-progress');
    if (!progress) {
        progress = document.createElement('div');
        progress.className = 'cooldown-progress';
        button.appendChild(progress);
    }
    
    progress.style.display = 'block';
    progress.style.animation = `cooldown ${cooldownTime}ms linear`;
    
    setTimeout(() => {
        button.classList.remove('disabled');
        progress.style.display = 'none';
        
        // Only add pulse if player still has special weapon
        if (player.hasSpecialWeapon) {
            button.classList.add('pulse');
        }
    }, cooldownTime);
}


// Desktop controls implementation
function setupDesktopControls() {
    console.log(`Initializing desktop controls (${settings.controls})...`);
    // Keyboard controls are handled by the existing key event listeners
    
}

// Update player movement in your game loop
function updateGame() {
    // ... other update code ...
    
    // Handle mobile button movement
    const moveSpeed = player.speed * 1.5;
    if (player.movingUp) player.y = Math.max(0, player.y - moveSpeed);
    if (player.movingDown) player.y = Math.min(canvas.height - player.height, player.y + moveSpeed);
    if (player.movingLeft) player.x = Math.max(0, player.x - moveSpeed);
    if (player.movingRight) player.x = Math.min(canvas.width - player.width, player.x + moveSpeed);
    
    // ... rest of game update code ...
}

// Initialize game
loadSettings();
setupControls();
// Setup button controls


// Set up event listeners
function setupEventListeners() {
    // Main menu buttons
    document.getElementById('playBtn').addEventListener('click', startGame);
    document.getElementById('highscoresBtn').addEventListener('click', showHighscores);
    document.getElementById('howToPlayBtn').addEventListener('click', showHowToPlay);
    document.getElementById('settingsBtn').addEventListener('click', showSettings);
    document.getElementById('exitBtn').addEventListener('click', exitGame);
    
    // Navigation back buttons
    document.getElementById('backFromHowToPlay').addEventListener('click', showMainMenu);
    document.getElementById('backFromHighscores').addEventListener('click', showMainMenu);
    document.getElementById('backFromSettings').addEventListener('click', showMainMenu);
    
    // Settings save button
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    
    // Game controls
    document.getElementById('pauseBtn').addEventListener('click', pauseGame);
    document.getElementById('homeBtn').addEventListener('click', quitToMenu);
    
    // Pause screen buttons
    document.getElementById('resumeBtn').addEventListener('click', resumeGame);
    document.getElementById('restartBtn').addEventListener('click', restartGame);
    document.getElementById('quitBtn').addEventListener('click', quitToMenu);
    
    // Game over screen buttons
    document.getElementById('playAgainBtn').addEventListener('click', restartGame);
    document.getElementById('backToMenuBtn').addEventListener('click', quitToMenu);
    document.getElementById('viewHighscoresBtn').addEventListener('click', showHighscores);
    document.getElementById('saveScoreBtn').addEventListener('click', saveHighscore);
    
    // Keyboard controls
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Touch controls for mobile
}


// Show main menu
function showMainMenu() {
    hideAllScreens();
    screens.mainMenu.classList.remove('hidden');
    gameState = GAME_STATES.MENU;
}

// Show how to play screen
function showHowToPlay() {
    hideAllScreens();
    screens.howToPlay.classList.remove('hidden');
    gameState = GAME_STATES.HOW_TO_PLAY;
}

// Show highscores screen
function showHighscores() {
    hideAllScreens();
    screens.highscores.classList.remove('hidden');
    gameState = GAME_STATES.HIGHSCORES;
    displayHighscores();
}

// Show settings screen
function showSettings() {
    hideAllScreens();
    screens.settings.classList.remove('hidden');
    gameState = GAME_STATES.SETTINGS;
}

// Hide all screens
function hideAllScreens() {
    for (const screen in screens) {
        screens[screen].classList.add('hidden');
    }
}





// Add to your existing JavaScript

// Screen rotation detection
function checkScreenOrientation() {
    if (window.innerHeight > window.innerWidth) {
        // Portrait mode
        document.getElementById('rotateWarning').style.display = 'block';
    } else {
        // Landscape mode
        document.getElementById('rotateWarning').style.display = 'none';
    }
}

// Add to your setup function
function setupMobileFeatures() {
    // Add rotation warning element
    const rotateWarning = document.createElement('div');
    rotateWarning.id = 'rotateWarning';
    rotateWarning.innerHTML = `
        <div class="rotate-warning-content">
            <i class="fas fa-rotate-right"></i>
            <p>Please rotate your device to landscape mode for better gameplay</p>
        </div>
    `;
    document.body.appendChild(rotateWarning);
    
    // Initial check
    checkScreenOrientation();
    
    // Listen for orientation changes
    window.addEventListener('resize', checkScreenOrientation);
    window.addEventListener('orientationchange', checkScreenOrientation);
    
    // Hide desktop-specific buttons on mobile
    if ('ontouchstart' in window) {
        document.querySelectorAll('.desktop-only').forEach(el => {
            el.style.display = 'none';
        });
    }
}


// Call this when player gets special weapon


function hideSpecialWeaponButton() {
    if ('ontouchstart' in window) {
        const specialBtn = document.querySelector('.special-btn');
        if (specialBtn) {
            specialBtn.classList.add('hidden');
            specialBtn.classList.remove('pulse');
        }
    }
}



// Start game
function startGame() {
    hideAllScreens();
    screens.gameScreen.classList.remove('hidden');
    gameState = GAME_STATES.PLAYING;

    // Play background music
    sounds.background.currentTime = 0;
    sounds.background.play();

    // Reset game state
    resetGame();

    updateUI();

    // Dispatch event to update UI elements like controls
    document.dispatchEvent(new Event('gameScreen'));
}

// Reset game state
function resetGame() {
    score = 0;
    lives = 3;
    level = 1;
    enemies = [];
    bullets = [];
    powerUps = [];
    particles = [];
    bossActive = false;
    boss = null;
    comboCounter = 0;
    comboMultiplier = 1;
    maxCombo = 0;
    specialWeaponActive = false;
    specialWeaponTimer = 0;
    specialWeaponCooldown = 0;
    
    // Reset player
    player = {
        x: canvas.width / 2 - 25,
        y: canvas.height - 70,
        width: 50,
        height: 50,
        speed: 5,
        baseSpeed: 5,
        isShooting: false,
        shootCooldown: 0,
        shootDelay: 300,
        invulnerable: false,
        invulnerableTimer: 0,
        image: new Image(),
        specialWeaponCharges: 0,
        doubleShot: false,
        tripleShot: false
    };
    player.image.src = 'assets/player-ship.png';
    
    // Initialize starfield
    initStarfield();
}

// Pause game
function pauseGame() {
    if (gameState === GAME_STATES.PLAYING) {
        gameState = GAME_STATES.PAUSED;
        screens.pauseScreen.classList.remove('hidden');
        sounds.background.pause();
    }
}

// Resume game
function resumeGame() {
    gameState = GAME_STATES.PLAYING;
    screens.pauseScreen.classList.add('hidden');
    sounds.background.play();
}

// Restart game
function restartGame() {
    screens.pauseScreen.classList.add('hidden');
    screens.gameOverScreen.classList.add('hidden');
    startGame();
}

// Quit to menu
function quitToMenu() {
    // Pause background music
    sounds.background.pause();
    
    screens.pauseScreen.classList.add('hidden');
    screens.gameOverScreen.classList.add('hidden');
    screens.gameScreen.classList.add('hidden');
    showMainMenu();
}

// Game over
function gameOver() {
    // Stop background music
    sounds.background.pause();
    sounds.background.currentTime = 0;
    
    // Play game over sound
    sounds.gameover.currentTime = 0;
    sounds.gameover.play();
    
    gameState = GAME_STATES.GAME_OVER;
    screens.gameOverScreen.classList.remove('hidden');
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalLevel').textContent = level;
    document.getElementById('playerNameInput').value = settings.playerName;
    document.getElementById('maxCombo').textContent = maxCombo;
}

// Exit game
function exitGame() {
    if (confirm("Are you sure you want to exit the game?")) {
        window.close();
    }
}

// Display highscores
function displayHighscores() {
    const highscores = getHighscores();
    const tableBody = document.querySelector('#highscoresTable tbody');
    tableBody.innerHTML = '';
    
    highscores.forEach((score, index) => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${score.name}</td>
            <td>${score.score}</td>
            <td>${score.level}</td>
            <td>${score.maxCombo}</td>
            <td>${new Date(score.date).toLocaleDateString()}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Get highscores from localStorage
function getHighscores() {
    const highscores = JSON.parse(localStorage.getItem('spaceShooterHighscores')) || [];
    return highscores.sort((a, b) => b.score - a.score).slice(0, 10);
}

// Save highscore
function saveHighscore() {
    const name = document.getElementById('playerNameInput').value.trim() || "Anonymous";
    const highscores = getHighscores();
    
    highscores.push({
        name: name,
        score: score,
        level: level,
        maxCombo: maxCombo,
        date: new Date().toISOString()
    });
    
    // Sort and keep top 10
    const sortedHighscores = highscores.sort((a, b) => b.score - a.score).slice(0, 10);
    localStorage.setItem('spaceShooterHighscores', JSON.stringify(sortedHighscores));
    
    alert("Highscore saved!");
    showHighscores();
}

// Update UI
function updateUI() {
    document.querySelector('#score span').textContent = score;
    document.querySelector('#lives span').textContent = lives;
    document.querySelector('#level span').textContent = level;
    
    // Update combo display
    const comboDisplay = document.querySelector('.combo-display');
    if (comboCounter > 0) {
        comboDisplay.textContent = `Combo: ${comboCounter}x (${comboMultiplier.toFixed(1)}x)`;
        comboDisplay.style.display = 'block';
    } else {
        comboDisplay.style.display = 'none';
    }
    
    // Update special weapon charge display
    const specialWeaponDisplay = document.querySelector('.special-weapon-display');
    if (player.specialWeaponCharges > 0) {
        specialWeaponDisplay.textContent = `Special: ${player.specialWeaponCharges} (${Math.max(0, specialWeaponCooldown/1000).toFixed(1)}s CD)`;
        specialWeaponDisplay.style.display = 'block';
    } else {
        specialWeaponDisplay.style.display = 'none';
    }
    
    // Update boss health bar if boss is active
    if (bossActive && boss) {
        const bossHealthBar = document.querySelector('.boss-health-bar');
        const healthPercent = (boss.health / boss.maxHealth) * 100;
        bossHealthBar.querySelector('.health-fill').style.width = `${healthPercent}%`;
        bossHealthBar.style.display = 'block';
    } else {
        document.querySelector('.boss-health-bar').style.display = 'none';
    }
}

// Game Loop
let fps = 0;
let lastFpsUpdate = 0;
let frameCount = 0;

function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    // Calculate FPS
    frameCount++;
    if (timestamp - lastFpsUpdate >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastFpsUpdate = timestamp;
    }
    
    update(deltaTime);
    render();
    
    requestAnimationFrame(gameLoop);
}
// When entering game screen
function showGameScreen() {
  document.getElementById('gameScreen').classList.remove('hidden');
  document.querySelector('.dev-badge').classList.add('in-game');
  document.querySelector('.dev-badge').classList.remove('not-in-game');
}

// When leaving game screen
function hideGameScreen() {
  document.getElementById('gameScreen').classList.add('hidden');
  document.querySelector('.dev-badge').classList.remove('in-game');
  document.querySelector('.dev-badge').classList.add('not-in-game');
}

// Example usage with your existing buttons:
document.getElementById('playBtn').addEventListener('click', function() {
  hideAllScreens();
  showGameScreen();
});

document.getElementById('homeBtn').addEventListener('click', function() {
  hideGameScreen();
  showMainMenu();
});
// Update game state
function update(deltaTime) {
    switch(gameState) {
        case GAME_STATES.PLAYING:
            updatePlaying(deltaTime);
            break;
        case GAME_STATES.LEVEL_TRANSITION:
            updateLevelTransition(deltaTime);
            break;
    }
}

function updatePlaying(deltaTime) {
    // Update player
    updatePlayer(deltaTime);
    
    // Update enemies
    updateEnemies(deltaTime);
    
    // Update bullets
    updateBullets();
    
    // Update power-ups
    updatePowerUps(deltaTime);
    
    // Update particles
    updateParticles();
    
    // Update special weapon
    updateSpecialWeapon(deltaTime);
    
    // Update combo system
    updateComboSystem(deltaTime);
    
    // Spawn enemies
    if (!bossActive) {
        enemySpawnTimer += deltaTime;
        const spawnRate = 1000 - (level * 50);
        if (enemySpawnTimer > Math.max(200, spawnRate * difficultySettings[settings.difficulty].enemySpawnRate)) {
            spawnEnemy();
            enemySpawnTimer = 0;
        }
    }
    
    // Spawn power-ups
    powerUpTimer += deltaTime;
    if (powerUpTimer > 10000) {
        spawnPowerUp();
        powerUpTimer = 0;
    }
    
    // Check for boss spawn
    if (!bossActive && level % 5 === 0 && enemies.length === 0 && powerUps.length === 0) {
        spawnBoss();
    }
    
    // Check collisions
    checkCollisions();
}

function updateLevelTransition(deltaTime) {
    levelTransitionTimer += deltaTime;
    if (levelTransitionTimer >= 3000) {
        levelTransitionTimer = 0;
        gameState = GAME_STATES.PLAYING;
        screens.levelTransitionScreen.classList.add('hidden');
    }
}

// Update Player
function updatePlayer(deltaTime) {
    // Movement
    if ((keys['ArrowLeft'] || (settings.controls === 'wasd' && keys['a'])) && player.x > 0) {
        player.x -= player.speed;
    }
    if ((keys['ArrowRight'] || (settings.controls === 'wasd' && keys['d'])) && player.x < canvas.width - player.width) {
        player.x += player.speed;
    }
    if ((keys['ArrowUp'] || (settings.controls === 'wasd' && keys['w'])) && player.y > 0) {
        player.y -= player.speed;
    }
    if ((keys['ArrowDown'] || (settings.controls === 'wasd' && keys['s'])) && player.y < canvas.height - player.height) {
        player.y += player.speed;
    }
    
    // Shooting - modified for auto-shoot
    if (settings.autoShoot || player.isShooting) {
        player.shootCooldown += deltaTime;
        if (player.shootCooldown >= player.shootDelay) {
            shoot();
            player.shootCooldown = 0;
        }
    }
    
    // Special weapon activation
    if ((keys['e'] || keys['E']) && player.specialWeaponCharges > 0 && specialWeaponCooldown <= 0) {
        activateSpecialWeapon();
    }
    
    // Invulnerability
    if (player.invulnerable) {
        player.invulnerableTimer += deltaTime;
        if (player.invulnerableTimer >= 2000) {
            player.invulnerable = false;
            player.invulnerableTimer = 0;
        }
    }
}

// Update Enemies
function updateEnemies(deltaTime) {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.y += enemy.speed * difficultySettings[settings.difficulty].enemySpeedMultiplier;
        
        // Remove if off screen
        if (enemy.y > canvas.height) {
            enemies.splice(i, 1);
            // Penalty for letting enemies escape
            if (!enemy.isBoss) {
                score = Math.max(0, score - 50);
                updateUI();
            }
        }
    }
    
    // Update boss if active
    if (bossActive && boss) {
        // Boss movement pattern (simple left-right)
        boss.x += boss.speed;
        if (boss.x <= 0 || boss.x >= canvas.width - boss.width) {
            boss.speed = -boss.speed;
        }
    }
}

// Update Bullets
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.y -= bullet.speed;
        
        // Remove if off screen
        if (bullet.y < 0) {
            bullets.splice(i, 1);
        }
    }
}

// Update Power-ups
function updatePowerUps(deltaTime) {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        powerUp.y += powerUp.speed;
        
        // Remove if off screen
        if (powerUp.y > canvas.height) {
            powerUps.splice(i, 1);
        }
    }
}

// Update Particles
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;
        
        // Remove if dead
        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}
function activateSpecialWeapon() {
    if (player.specialWeaponCharges <= 0 || specialWeaponCooldown > 0) return;
    
    player.specialWeaponCharges--;
    specialWeaponActive = true;
    specialWeaponTimer = 0;
    
    // Hide special weapon button on mobile
    hideSpecialWeaponButton();
    
    // Create special weapon bullets (plasma wave)
    for (let i = 0; i < 10; i++) {
        const bullet = {
            x: player.x + player.width / 2 - 10,
            y: player.y - (i * 40),
            width: 20,
            height: 60,
            speed: 0,
            color: '#00ffff',
            damage: 5 * difficultySettings[settings.difficulty].playerDamage,
            isSpecial: true,
            image: new Image()
        };
        bullet.image.src = 'assets/plasma-wave.png';
        bullets.push(bullet);
    }
    
    updateUI();
}
// Update Special Weapon
function updateSpecialWeapon(deltaTime) {
    if (specialWeaponActive) {
        specialWeaponTimer += deltaTime;
        if (specialWeaponTimer >= 2000) { // Special weapon lasts 2 seconds
            specialWeaponActive = false;
            specialWeaponTimer = 0;
            specialWeaponCooldown = 5000; // 5 second cooldown
        }
    } else if (specialWeaponCooldown > 0) {
        specialWeaponCooldown -= deltaTime;
    }
}

// Update Combo System
function updateComboSystem(deltaTime) {
    // Check if combo should reset (1 second without kills)
    if (Date.now() - lastEnemyKillTime > 1000 && comboCounter > 0) {
        if (comboCounter > maxCombo) {
            maxCombo = comboCounter;
        }
        comboCounter = 0;
        comboMultiplier = 1;
        updateUI();
    }
}

// Check Collisions
function checkCollisions() {
    // Bullets vs Enemies
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // Check against regular enemies
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            
            if (checkCollision(bullet, enemy)) {
                // Damage enemy
                enemy.health -= bullet.damage || 1;
                
                // Remove bullet unless it's a special weapon bullet
                if (!bullet.isSpecial) {
                    bullets.splice(i, 1);
                }
                
                // Check if enemy is destroyed
                if (enemy.health <= 0) {
                    // Create explosion
                    createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color);
                    
                    // Remove enemy
                    enemies.splice(j, 1);
                    
                    // Increase score with combo multiplier
                    const scoreGain = Math.floor(enemyTypes[enemy.type].score * level * comboMultiplier);
                    score += scoreGain;
                    
                    // Update combo
                    comboCounter++;
                    lastEnemyKillTime = Date.now();
                    comboMultiplier = 1 + (comboCounter * 0.1);
                    
                    updateUI();
                    
                    // Check for level up
                    checkLevelUp();
                }
                
                break;
            }
        }
        
        // Check against boss if active
        if (bossActive && boss && checkCollision(bullet, boss)) {
            // Damage boss
            boss.health -= bullet.damage || 1;
            
            // Remove bullet unless it's a special weapon bullet
            if (!bullet.isSpecial) {
                bullets.splice(i, 1);
            }
            
            // Create hit effect
            createExplosion(bullet.x, bullet.y, '#ff0000', 5);
            
            // Check if boss is defeated
            if (boss.health <= 0) {
                defeatBoss();
            }
            
            updateUI();
        }
    }
    
    // Player vs Enemies
    if (!player.invulnerable) {
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            
            if (checkCollision(player, enemy)) {
                // Create explosion
                createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color);
                createExplosion(player.x + player.width/2, player.y + player.height/2, '#3498db');
                
                // Remove enemy
                enemies.splice(i, 1);
                
                // Lose life
                lives--;
                updateUI();
                
                // Reset combo
                comboCounter = 0;
                comboMultiplier = 1;
                
                // Make player invulnerable
                player.invulnerable = true;
                
                // Check for game over
                if (lives <= 0) {
                    gameOver();
                }
                
                break;
            }
        }
        
        // Player vs Boss
        if (bossActive && boss && checkCollision(player, boss)) {
            // Create explosion
            createExplosion(player.x + player.width/2, player.y + player.height/2, '#3498db');
            
            // Lose life
            lives--;
            updateUI();
            
            // Reset combo
            comboCounter = 0;
            comboMultiplier = 1;
            
            // Make player invulnerable
            player.invulnerable = true;
            
            // Check for game over
            if (lives <= 0) {
                gameOver();
            }
        }
    }
    
    // Player vs Power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        
        if (checkCollision(player, powerUp)) {
            // Apply power-up effect
            applyPowerUp(powerUp.type);
            
            // Remove power-up
            powerUps.splice(i, 1);
        }
    }
}

// Collision Detection
function checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

// Spawn Enemy
function spawnEnemy() {
    const type = Math.floor(Math.random() * enemyTypes.length);
    const enemyType = enemyTypes[type];
    const size = 40 + Math.random() * 20;
    
    const enemy = {
        x: Math.random() * (canvas.width - size),
        y: -size,
        width: size,
        height: size,
        speed: enemyType.speed * (1 + (level * 0.05)), // Speed increases slightly with level
        score: enemyType.score,
        type: type,
        health: enemyType.health,
        maxHealth: enemyType.health,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`,
        image: new Image(),
        isBoss: false
    };
    
    enemy.image.src = enemyType.image;
    enemies.push(enemy);
}

// Spawn Boss
function spawnBoss() {
    sounds.bossSpawn.currentTime = 0;
    sounds.bossSpawn.play();
    
    bossActive = true;
    const size = 120;
    
    boss = {
        x: canvas.width / 2 - size / 2,
        y: -size,
        width: size,
        height: size,
        speed: bossType.speed,
        score: bossType.score * level,
        health: bossType.health * level,
        maxHealth: bossType.health * level,
        color: '#ff0000',
        image: new Image(),
        isBoss: true
    };
    
    boss.image.src = bossType.image;
    enemies.push(boss);
    
    // Show boss warning
    const bossWarning = document.createElement('div');
    bossWarning.className = 'boss-warning';
    bossWarning.textContent = 'BOSS INCOMING!';
    document.querySelector('.game-container').appendChild(bossWarning);
    
    setTimeout(() => {
        bossWarning.remove();
    }, 2000);
}

// Defeat Boss
function defeatBoss() {
    sounds.bossDefeat.currentTime = 0;
    sounds.bossDefeat.play();
    
    // Create big explosion
    for (let i = 0; i < 100; i++) {
        createExplosion(
            boss.x + Math.random() * boss.width,
            boss.y + Math.random() * boss.height,
            `hsl(${Math.random() * 360}, 100%, 50%)`,
            3
        );
    }
    
    // Remove boss
    enemies = enemies.filter(e => !e.isBoss);
    bossActive = false;
    boss = null;
    
    // Add score
    score += bossType.score * level * comboMultiplier;
    comboCounter++;
    lastEnemyKillTime = Date.now();
    comboMultiplier = 1 + (comboCounter * 0.1);
    
    // Level up
    levelUp();
}

// Spawn Power-up
function spawnPowerUp() {
    // Calculate total rarity
    let totalRarity = 0;
    powerUpTypes.forEach(pu => totalRarity += pu.rarity);
    
    // Random selection with rarity
    let random = Math.random() * totalRarity;
    let typeIndex = 0;
    let cumulativeRarity = powerUpTypes[0].rarity;
    
    while (random > cumulativeRarity && typeIndex < powerUpTypes.length - 1) {
        typeIndex++;
        cumulativeRarity += powerUpTypes[typeIndex].rarity;
    }
    
    const powerUpType = powerUpTypes[typeIndex];
    
    const powerUp = {
        x: Math.random() * (canvas.width - 30),
        y: -30,
        width: 30,
        height: 30,
        speed: 2,
        type: powerUpType.type,
        color: powerUpType.color,
        image: new Image()
    };
    
    powerUp.image.src = powerUpType.image;
    powerUps.push(powerUp);
}

// Apply Power-up
function applyPowerUp(type) {
    sounds.powerup.currentTime = 0;
    sounds.powerup.play();
    
    switch(type) {
        case 'extraLife':
            lives++;
            break;
        case 'rapidFire':
            player.shootDelay = 100;
            setTimeout(() => {
                player.shootDelay = 300;
            }, 5000);
            break;
        case 'shield':
            player.invulnerable = true;
            player.invulnerableTimer = 0;
            break;
        case 'doubleShot':
            player.doubleShot = true;
            player.tripleShot = false;
            setTimeout(() => {
                player.doubleShot = false;
            }, 10000);
            break;
        case 'tripleShot':
            player.doubleShot = false;
            player.tripleShot = true;
            setTimeout(() => {
                player.tripleShot = false;
            }, 10000);
            break;
        case 'specialWeapon':
            player.specialWeaponCharges = Math.min(3, player.specialWeaponCharges + 1);
            showSpecialWeaponButton(); // Show the button when getting a charge
            break;
    }
    updateUI();
}
function showSpecialWeaponButton() {
    if ('ontouchstart' in window) {
        const specialBtn = document.querySelector('.special-btn');
        if (specialBtn) {
            specialBtn.classList.remove('hidden');
            specialBtn.classList.add('pulse');
            specialBtn.addEventListener('touchstart', () => {
                useSpecialWeapon();
                specialBtn.classList.add('hidden');
                specialBtn.classList.remove('pulse');
            });
        }
    }
}
function useSpecialWeapon() {
    if (player.specialWeaponCharges > 0) {
        activateSpecialWeapon();
        player.specialWeaponCharges--;
        updateUI();
    }
}

// Player Shoot
function shoot() {
    sounds.shoot.currentTime = 0;
    sounds.shoot.play();
    
    // Main bullet
    const mainBullet = {
        x: player.x + player.width / 2 - 2.5,
        y: player.y,
        width: 5,
        height: 15,
        speed: 10,
        color: '#ffff00',
        damage: 1 * difficultySettings[settings.difficulty].playerDamage,
        image: new Image()
    };
    mainBullet.image.src = 'assets/bullet.png';
    bullets.push(mainBullet);
    
    // Double shot
    if (player.doubleShot) {
        const leftBullet = {
            x: player.x + player.width / 4 - 2.5,
            y: player.y,
            width: 5,
            height: 15,
            speed: 10,
            color: '#ffff00',
            damage: 1 * difficultySettings[settings.difficulty].playerDamage,
            image: new Image()
        };
        leftBullet.image.src = 'assets/bullet.png';
        bullets.push(leftBullet);
        
        const rightBullet = {
            x: player.x + (player.width * 3/4) - 2.5,
            y: player.y,
            width: 5,
            height: 15,
            speed: 10,
            color: '#ffff00',
            damage: 1 * difficultySettings[settings.difficulty].playerDamage,
            image: new Image()
        };
        rightBullet.image.src = 'assets/bullet.png';
        bullets.push(rightBullet);
    }
    
    // Triple shot
    if (player.tripleShot) {
        const leftBullet = {
            x: player.x + player.width / 4 - 2.5,
            y: player.y,
            width: 5,
            height: 15,
            speed: 10,
            color: '#ffff00',
            damage: 1 * difficultySettings[settings.difficulty].playerDamage,
            image: new Image()
        };
        leftBullet.image.src = 'assets/bullet.png';
        bullets.push(leftBullet);
        
        const rightBullet = {
            x: player.x + (player.width * 3/4) - 2.5,
            y: player.y,
            width: 5,
            height: 15,
            speed: 10,
            color: '#ffff00',
            damage: 1 * difficultySettings[settings.difficulty].playerDamage,
            image: new Image()
        };
        rightBullet.image.src = 'assets/bullet.png';
        bullets.push(rightBullet);
        
        const centerBullet = {
            x: player.x + player.width / 2 - 5,
            y: player.y,
            width: 10,
            height: 20,
            speed: 8,
            color: '#ff9900',
            damage: 2 * difficultySettings[settings.difficulty].playerDamage,
            image: new Image()
        };
        centerBullet.image.src = 'assets/bullet-large.png';
        bullets.push(centerBullet);
    }
}

// Activate Special Weapon
function activateSpecialWeapon() {
    if (player.specialWeaponCharges <= 0 || specialWeaponCooldown > 0) return;
    
    player.specialWeaponCharges--;
    specialWeaponActive = true;
    specialWeaponTimer = 0;
    
    // Create special weapon bullets (plasma wave)
    for (let i = 0; i < 10; i++) {
        const bullet = {
            x: player.x + player.width / 2 - 10,
            y: player.y - (i * 40),
            width: 20,
            height: 60,
            speed: 0,
            color: '#00ffff',
            damage: 5 * difficultySettings[settings.difficulty].playerDamage,
            isSpecial: true,
            image: new Image()
        };
        bullet.image.src = 'assets/plasma-wave.png';
        bullets.push(bullet);
    }
    
    updateUI();
}

// Create Explosion
function createExplosion(x, y, color, particleCount = 20) {
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: x,
            y: y,
            vx: Math.random() * 6 - 3,
            vy: Math.random() * 6 - 3,
            radius: Math.random() * 3 + 1,
            color: color,
            life: Math.random() * 30 + 30
        });
    }
    
    // Play explosion sound
    sounds.explosion.currentTime = 0;
    sounds.explosion.play();
}

// Check for Level Up


// Level Up
// Show level transition screen with progress bar and stats
function showLevelTransition(level, score, lives, maxCombo, duration = 3000) {
  const levelScreen = document.getElementById('levelTransitionScreen');
  const levelText = document.getElementById('levelTransitionText');
  const scoreSpan = document.getElementById('transitionScore');
  const livesSpan = document.getElementById('transitionLives');
  const comboSpan = document.getElementById('transitionCombo');
  const progressFill = levelScreen.querySelector('.progress-fill');

  // Set text values with safe fallback if undefined
  levelText.textContent = `LEVEL ${level}`;
  scoreSpan.textContent = score;
  livesSpan.textContent = (lives !== undefined && lives !== null) ? lives : 0;
  comboSpan.textContent = ((maxCombo !== undefined && maxCombo !== null) ? maxCombo : 0) + 'x';

  // Show the transition screen
  levelScreen.classList.remove('hidden');

  // Reset progress bar
  progressFill.style.width = '0%';
  progressFill.setAttribute('aria-valuenow', 0);

  let startTime = null;

  // Animate the progress bar fill over duration milliseconds
  function animateProgress(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const percent = progress * 100;

    progressFill.style.width = `${percent}%`;
    progressFill.setAttribute('aria-valuenow', Math.floor(percent));

    if (progress < 1) {
      requestAnimationFrame(animateProgress);
    } else {
      // Hide the screen after progress completes
      levelScreen.classList.add('hidden');

      // Set game state back to playing
      gameState = GAME_STATES.PLAYING;
    }
  }

  requestAnimationFrame(animateProgress);
}

function checkLevelUp() {
    // Exponentially increase score needed (e.g., level^1.5)
    const scoreNeeded = Math.floor(5000 * Math.pow(level, 1.5));
    if (score >= scoreNeeded) {
        levelUp();
    }
}

// Level up function: increments level, updates player and enemies, shows transition screen
function levelUp() {
  level++;

  // Debug current stats before showing transition
  console.log('Level:', level, 'Score:', score, 'Lives:', lives, 'Max Combo:', maxCombo);

  // Play level up sound
  sounds.levelup.currentTime = 0;
  sounds.levelup.play();

  // Show level transition screen with current stats
  gameState = GAME_STATES.LEVEL_TRANSITION;
  showLevelTransition(level, score, lives, maxCombo);

  // Increase player speed with level
  player.baseSpeed = 5 + (level * 0.1);
  player.speed = player.baseSpeed;

  // Clear all enemies, bullets, and power-ups on level up
  enemies = [];
  bullets = [];
  powerUps = [];

  // Reset spawn timers
  enemySpawnTimer = 0;
  powerUpTimer = 0;

  // Update UI elements such as level display, score, lives
  updateUI();

  // Increase enemy toughness with level progression
  enemyTypes.forEach(type => {
    type.health = Math.floor(type.health * (1 + (level * 0.1)));
    type.speed = type.speed * (1 + (level * 0.05));
    type.score = Math.floor(type.score * (1 + (level * 0.1)));
  });
}


// Handle Key Down
function handleKeyDown(e) {
    keys[e.key] = true;
    
    if (e.key === ' ' && gameState === GAME_STATES.PLAYING) {
        player.isShooting = true;
    }
    
    // Pause game with Escape key
    if (e.key === 'Escape') {
        if (gameState === GAME_STATES.PLAYING) {
            pauseGame();
        } else if (gameState === GAME_STATES.PAUSED) {
            resumeGame();
        }
    }
}

// Handle Key Up
function handleKeyUp(e) {
    keys[e.key] = false;
    
    if (e.key === ' ' && gameState === GAME_STATES.PLAYING) {
        player.isShooting = false;
        player.shootCooldown = 0;
    }
}

// Render Game
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    drawBackground();
    
    switch(gameState) {
        case GAME_STATES.PLAYING:
            // Draw player
            drawPlayer();
            
            // Draw enemies
            drawEnemies();
            
            // Draw bullets
            drawBullets();
            
            // Draw power-ups
            drawPowerUps();
            
            // Draw particles
            drawParticles();
            
            // Draw special weapon effect if active
            if (specialWeaponActive) {
                drawSpecialWeapon();
            }
            
            // Draw FPS if enabled
            if (settings.showFPS) {
                drawFPS();
            }
            break;
            
        case GAME_STATES.LEVEL_TRANSITION:
            // Draw everything normally during transition
            drawPlayer();
            drawParticles();
            break;
    }
}

// Draw background
function drawBackground() {
    // Draw starfield
    ctx.fillStyle = '#000033';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw stars
    ctx.fillStyle = '#ffffff';
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
        
        ctx.globalAlpha = Math.random() * 0.5 + 0.5;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    ctx.globalAlpha = 1;
    
    // Draw gradient at bottom
    const gradient = ctx.createLinearGradient(0, canvas.height - 100, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(0, 0, 51, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 51, 1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, canvas.height - 100, canvas.width, 100);
}

// Draw Player
function drawPlayer() {
    if (player.invulnerable && Math.floor(Date.now() / 100) % 2 === 0) {
        return; // Blink effect when invulnerable
    }
    
    ctx.save();
    ctx.drawImage(player.image, player.x, player.y, player.width, player.height);
    
    // Draw shield if invulnerable
    if (player.invulnerable) {
        ctx.strokeStyle = 'rgba(0, 150, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x + player.width/2, player.y + player.height/2, 
               player.width/2 + 5, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Draw engine glow
    if (keys['ArrowUp'] || keys['w']) {
        ctx.fillStyle = '#ff9900';
        ctx.beginPath();
        ctx.moveTo(player.x + player.width/2, player.y + player.height);
        ctx.lineTo(player.x + player.width/3, player.y + player.height + 10);
        ctx.lineTo(player.x + (player.width*2)/3, player.y + player.height + 10);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

// Draw Enemies
function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.save();
        
        // Draw enemy
        ctx.drawImage(enemy.image, enemy.x, enemy.y, enemy.width, enemy.height);
        
        // Draw health bar for enemies with health > 1
        if (enemy.health < enemy.maxHealth) {
            const healthPercent = enemy.health / enemy.maxHealth;
            const barWidth = enemy.width * 0.8;
            
            // Background
            ctx.fillStyle = '#333';
            ctx.fillRect(
                enemy.x + (enemy.width - barWidth)/2,
                enemy.y - 10,
                barWidth,
                5
            );
            
            // Health
            ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : 
                          healthPercent > 0.25 ? '#ffff00' : '#ff0000';
            ctx.fillRect(
                enemy.x + (enemy.width - barWidth)/2,
                enemy.y - 10,
                barWidth * healthPercent,
                5
            );
        }
        
        ctx.restore();
    });
}

// Draw Bullets
function drawBullets() {
    bullets.forEach(bullet => {
        ctx.save();
        
        if (bullet.image.complete) {
            ctx.drawImage(bullet.image, bullet.x, bullet.y, bullet.width, bullet.height);
        } else {
            // Fallback if image not loaded
            ctx.fillStyle = bullet.color;
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        }
        
        // Add glow effect to special bullets
        if (bullet.isSpecial) {
            ctx.shadowColor = bullet.color;
            ctx.shadowBlur = 10;
            ctx.globalAlpha = 0.7;
            ctx.drawImage(bullet.image, bullet.x, bullet.y, bullet.width, bullet.height);
        }
        
        ctx.restore();
    });
}

// Draw Power-ups
function drawPowerUps() {
    powerUps.forEach(powerUp => {
        ctx.save();
        
        if (powerUp.image.complete) {
            ctx.drawImage(powerUp.image, powerUp.x, powerUp.y, powerUp.width, powerUp.height);
        } else {
            // Fallback if image not loaded
            ctx.fillStyle = powerUp.color;
            ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
        }
        
        // Add pulsing glow effect
        const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
        ctx.shadowColor = powerUp.color;
        ctx.shadowBlur = 10 * pulse;
        ctx.globalAlpha = pulse;
        ctx.drawImage(powerUp.image, powerUp.x, powerUp.y, powerUp.width, powerUp.height);
        
        ctx.restore();
    });
}

// Draw Particles
function drawParticles() {
    particles.forEach(particle => {
        ctx.globalAlpha = particle.life / 100;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });
}

// Draw Special Weapon Effect
function drawSpecialWeapon() {
    ctx.save();
    
    // Set global composite operation for a more impactful effect
    ctx.globalCompositeOperation = 'lighter';
    
    // Draw a semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Create multiple powerful-looking bullet effects
    for (let i = 0; i < 10; i++) {
        ctx.strokeStyle = `rgba(0, 255, 255, ${0.1 + i * 0.1})`;
        ctx.lineWidth = 2 + i;
        ctx.beginPath();
        ctx.moveTo(0, player.y + 50 - i * 5);
        ctx.bezierCurveTo(
            canvas.width / 4, player.y + 30 - i * 5,
            (canvas.width * 3) / 4, player.y + 70 + i * 5,
            canvas.width, player.y + 50 + i * 5
        );
        ctx.stroke();
    }
    
    ctx.restore();
}

// Draw FPS counter
function drawFPS() {
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`FPS: ${fps}`, canvas.width - 10, 20);
}

// Initialize the game when the page loads
window.onload = init;