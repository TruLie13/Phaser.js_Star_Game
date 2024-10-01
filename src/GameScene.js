import Phaser from "phaser";

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });

    this.player = null;
    this.stars = null;
    this.bombs = null;
    this.pulseActive = false; // Flag to check if the pulse is active
    this.pulseRadius = 150; // Radius of the pulse effect
    this.pulseDuration = 500; // Duration of the pulse in milliseconds
    this.cursors = null; // Store cursor controls as a class property
    this.score = 0;
    this.highScore = 0;
    this.scoreText = null;
    this.highScoreText = null;
    this.starsCollected = 0;
    this.gameOver = false;

    this.restartKey = null;
  }

  preload() {
    // audio

    // images
    function importAll(r) {
      let images = {};
      r.keys().forEach((item) => {
        const imageName = item.replace("./", "").replace(/\.\w+$/, ""); // Remove "./" and file extension
        images[imageName] = r(item);
      });
      return images;
    }

    // Dynamically load all PNG images in the assets folder
    const images = importAll(require.context("./assets", false, /\.png$/));
    const kitsuneImages = importAll(
      require.context("./assets/Kitsune", false, /\.png$/)
    );

    // Load images into Phaser
    this.load.image("sky", images.sky);
    this.load.image("star", images.star);
    this.load.image("ground", images.platform);
    this.load.image("bomb", images.bomb);

    this.load.spritesheet("chick", kitsuneImages.Walk, {
      frameWidth: 128,
      frameHeight: 128,
    });

    // Load the new RUN.png sprite for the character
    this.load.spritesheet("run", kitsuneImages.Run, {
      frameWidth: 128,
      frameHeight: 128,
    });
    this.load.spritesheet("jump", kitsuneImages.Jump, {
      frameWidth: 128,
      frameHeight: 128,
    });
    this.load.spritesheet("dead", kitsuneImages.Dead, {
      frameWidth: 128,
      frameHeight: 128,
    });
    this.load.spritesheet("idle", kitsuneImages.Idle, {
      frameWidth: 128,
      frameHeight: 128,
    });
  }

  create() {
    // Create background and platform
    // this.add.image(350, 300, "sky");
    // Create a gradient background using a Graphics object
    const graphics = this.add.graphics();

    const width = 800; // Width of the game canvas
    const height = 600; // Height of the game canvas
    const steps = 100; // Number of steps to make the gradient smoother

    for (let i = 0; i < steps; i++) {
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        { r: 135, g: 206, b: 235 }, // RGB for Sky Blue
        { r: 200, g: 235, b: 235 }, // RGB for White
        steps,
        i
      );

      const hexColor = Phaser.Display.Color.GetColor(color.r, color.g, color.b);

      // Draw a rectangle for each step of the gradient
      graphics.fillStyle(hexColor, 1);
      graphics.fillRect(0, (height / steps) * i, width, height / steps);
    }

    const platforms = this.physics.add.staticGroup();
    platforms.create(400, 568, "ground").setScale(2).refreshBody();
    platforms.create(600, 400, "ground");
    platforms.create(50, 250, "ground");
    platforms.create(750, 220, "ground");

    // Create player sprite
    this.player = this.physics.add.sprite(100, 475, "chick");

    this.player.setSize(35, 65, true);
    this.player.setOffset(55, 55);

    // this.player.setCircle(20, 50, 50);
    this.player.setBounce(0.1);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, platforms); // Prevent player from falling through platforms

    // Create animations for the new sprite
    if (!this.anims.exists("runRight")) {
      this.anims.create({
        key: "runRight",
        frames: this.anims.generateFrameNumbers("run", { start: 0, end: 7 }),
        frameRate: 15,
        repeat: -1,
      });
    }

    if (!this.anims.exists("runLeft")) {
      this.anims.create({
        key: "runLeft",
        frames: this.anims.generateFrameNumbers("run", { start: 0, end: 7 }),
        frameRate: 15,
        repeat: -1,
      });
    }

    if (!this.anims.exists("jumpUp")) {
      this.anims.create({
        key: "jumpUp",
        frames: this.anims.generateFrameNumbers("jump", { start: 0, end: 9 }),
        frameRate: 5,
        repeat: 0,
      });
    }

    if (!this.anims.exists("crouch")) {
      this.anims.create({
        key: "crouch",
        frames: this.anims.generateFrameNumbers("jump", { start: 8, end: 8 }),
        frameRate: 10,
        repeat: -1,
      });
    }

    if (!this.anims.exists("die")) {
      this.anims.create({
        key: "die",
        frames: this.anims.generateFrameNumbers("dead", { start: 0, end: 9 }),
        frameRate: 8,
        repeat: 0,
      });
    }

    if (!this.anims.exists("notMoving")) {
      this.anims.create({
        key: "notMoving",
        frames: this.anims.generateFrameNumbers("idle", { start: 2, end: 7 }),
        frameRate: 4,
        repeat: 0,
      });
    }

    // Create cursor keys
    this.cursors = this.input.keyboard.createCursorKeys();
    this.bombs = this.physics.add.group();

    // Create stars
    this.stars = this.physics.add.group({
      key: "star",
      repeat: 11,
      setXY: { x: 12, y: 0, stepX: 70 },
    });
    this.stars.children.iterate(function (child) {
      child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
    });

    // Add physics colliders
    this.physics.add.collider(this.player, platforms);
    this.physics.add.collider(this.stars, platforms);
    this.physics.add.collider(this.bombs, platforms);

    // Overlap check between player and stars
    this.physics.add.overlap(
      this.player,
      this.stars,
      this.collectStar,
      null,
      this
    );

    // Add collision check between player and bombs
    this.physics.add.collider(
      this.player,
      this.bombs,
      this.hitBomb,
      null,
      this
    );

    // The score
    this.scoreText = this.add.text(16, 16, "Score: 0", {
      fontSize: "32px",
      fill: "#000",
    });

    // The high score
    this.highScoreText = this.add.text(
      380,
      16,
      `High Score: ${this.highScore}`,
      {
        fontSize: "32px",
        fill: "#000",
      }
    );

    this.restartKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );
  }

  update() {
    // Ensure player exists before updating
    if (!this.player || !this.cursors || this.gameOver) return;

    // Reset velocity
    this.player.setVelocityX(0);

    const isPlayerOnGround = this.player.body.touching.down;
    const isArrowUpPressed = this.cursors.up.isDown;
    const isArrowDownPressed = this.cursors.down.isDown;
    const isArrowLeftPressed = this.cursors.left.isDown;
    const isArrowRightPressed = this.cursors.right.isDown;
    const isSpaceBarPressed = this.cursors.space.isDown;

    // on ground
    if (isPlayerOnGround) {
      if (isArrowUpPressed) {
        this.player.setVelocityY(-355);
        this.player.anims.play("jumpUp", true); // Play jump animation
        this.player.setSize(35, 65, true);
        this.player.setOffset(45, 65);
      } else {
        // Handle left and right movement
        if (isArrowLeftPressed) {
          this.player.setVelocityX(-160);
          this.player.anims.play("runLeft", true); // Play running left animation
          this.player.setFlipX(true); // Flip the sprite to face left
          this.player.setSize(35, 65, true);
          this.player.setOffset(55, 55);
        } else if (isArrowRightPressed) {
          this.player.setVelocityX(160);
          this.player.anims.play("runRight", true); // Play running right animation
          this.player.setFlipX(false); // Face right
          this.player.setSize(35, 65, true);
          this.player.setOffset(30, 55);
        } else if (isArrowDownPressed) {
          this.player.anims.play("crouch", true); // Play running right animation
        } else {
          this.player.anims.play("notMoving", true); // Play standing animation
        }
      }
    }

    // in air
    if (!isPlayerOnGround) {
      if (
        !this.player.anims.isPlaying ||
        this.player.anims.currentAnim.key !== "jumpUp"
      ) {
        this.player.anims.play("jumpUp", true);
        this.player.setSize(35, 65, true);
        this.player.setOffset(45, 55);
      }

      // Handle left and right movement in air
      if (isArrowLeftPressed) {
        this.player.setVelocityX(-160);
        this.player.setFlipX(true); // Flip the sprite to face left
        this.player.setSize(35, 65, true);
        this.player.setOffset(45, 55);
      } else if (isArrowRightPressed) {
        this.player.setVelocityX(160);
        this.player.setFlipX(false); // Face right
      }
      // Hard drop
      if (isArrowDownPressed && !isArrowLeftPressed && !isArrowRightPressed) {
        this.player.setVelocityY(230); // Adjust this value as needed
        this.player.setSize(35, 65, true);
        this.player.setOffset(45, 55);
        this.player.anims.play("crouch", true); // Play running right animation
      }
    }

    if (isSpaceBarPressed) {
      console.log("spacebar pressed");
    }
  }

  collectStar(player, star) {
    star.disableBody(true, true);

    // Update score
    this.score += 10;
    this.scoreText.setText("Score: " + this.score);

    // Check if current score beats the high score
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.highScoreText.setText("High Score: " + this.highScore);
    }

    // Increment the counter for collected stars
    this.starsCollected = this.starsCollected || 0;
    this.starsCollected++;

    // Check if all stars have been collected
    if (this.stars.countActive(true) === 0) {
      // Reset stars
      this.stars.children.iterate(function (child) {
        child.enableBody(true, child.x, 0, true, true);
      });

      // Drop a bomb
      this.dropBombs(1, player); // Drop 1 bomb
    }

    // Drop bombs every 2 stars collected
    if (this.starsCollected % 2 === 0) {
      this.dropBombs(1, player); // Drop 1 more bomb
    }
  }

  dropBombs(count, player) {
    for (let i = 0; i < count; i++) {
      var x =
        player.x < 350
          ? Phaser.Math.Between(350, 800)
          : Phaser.Math.Between(0, 350);

      var bomb = this.bombs.create(x, 16, "bomb");
      bomb.setBounce(1);
      bomb.setCollideWorldBounds(true);
      bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
      bomb.allowGravity = false;
    }
  }

  hitBomb(player, bomb) {
    this.physics.pause();

    // player.setTint(0xff0000);
    player.anims.play("die");
    this.gameOver = true;

    // Add "Try Again" text
    const tryAgainText = this.add.text(350, 300, "Try Again", {
      fontSize: "64px",
      fill: "#ff0000",
    });
    tryAgainText.setOrigin(0.5, 0.5);
    tryAgainText.setInteractive();
    tryAgainText.on("pointerdown", () => this.restartGame(), this);

    this.input.keyboard.once("keydown-SPACE", () => {
      this.restartGame();
      this.gameOver = false;
    });
  }

  restartGame() {
    this.score = 0;
    this.starsCollected = 0;
    this.scene.restart();
  }
}

export default GameScene;
