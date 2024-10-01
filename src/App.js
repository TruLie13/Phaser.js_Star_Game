import React, { useEffect } from "react";
import Phaser from "phaser";
import GameScene from "./GameScene";

function App() {
  useEffect(() => {
    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      physics: {
        default: "arcade",
        arcade: {
          gravity: { y: 300 }, // No gravity, 2D platformer style
          debug: false,
        },
      },
      scene: [GameScene], // Load the GameScene
    };

    // Initialize Phaser game
    const game = new Phaser.Game(config);

    return () => {
      game.destroy(true); // Clean up game when component unmounts
    };
  }, []);

  return (
    <div className="App">
      <h1>Star Grabber</h1>
      <div id="phaser-game" />
    </div>
  );
}

export default App;
