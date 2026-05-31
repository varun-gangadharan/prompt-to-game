import type { PlatformerGameSpec } from "@/lib/spec/types";
import type { GameRenderer } from "@/lib/renderer/GameRenderer";

import { buildPlatformerWorld } from "./world";

type PhaserModule = typeof import("phaser");
type PhaserGame = InstanceType<PhaserModule["Game"]>;
type ArcadeRectangle = Phaser.GameObjects.Rectangle & {
  body: Phaser.Physics.Arcade.Body;
};

export class PlatformerRenderer implements GameRenderer<PlatformerGameSpec> {
  private container: HTMLElement | null = null;
  private game: PhaserGame | null = null;
  private spec: PlatformerGameSpec | null = null;
  private mountToken = 0;

  mount(container: HTMLElement, spec: PlatformerGameSpec): void {
    this.container = container;
    this.spec = spec;
    const token = ++this.mountToken;

    void this.mountAsync(container, spec, token);
  }

  update(spec: PlatformerGameSpec): void {
    if (!this.container) {
      return;
    }

    this.destroyGame();
    this.mount(this.container, spec);
  }

  destroy(): void {
    this.mountToken += 1;
    this.destroyGame();
    this.container = null;
    this.spec = null;
  }

  async snapshot(): Promise<Blob> {
    const canvas = this.game?.canvas ?? this.container?.querySelector("canvas");

    if (!canvas) {
      return new Blob([], { type: "image/png" });
    }

    return new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob ?? new Blob([], { type: "image/png" }));
      }, "image/png");
    });
  }

  private async mountAsync(
    container: HTMLElement,
    spec: PlatformerGameSpec,
    token: number,
  ): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }

    const Phaser = await import("phaser");

    if (token !== this.mountToken || this.container !== container || this.spec !== spec) {
      return;
    }

    this.destroyGame();
    container.replaceChildren();

    const world = buildPlatformerWorld(spec);
    const viewportWidth = Math.min(960, Math.max(640, world.width));
    const viewportHeight = Math.min(540, Math.max(360, world.height));

    const createPlatformerScene = () => {
      return class PlatformerScene extends Phaser.Scene {
        private player?: ArcadeRectangle;
        private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
        private keys?: Record<string, Phaser.Input.Keyboard.Key>;
        private health = world.playerHealth;
        private coinsRemaining = world.coins.length;
        private statusText?: Phaser.GameObjects.Text;
        private finished = false;

        constructor() {
          super("platformer");
        }

        create(): void {
          this.cameras.main.setBackgroundColor(world.colors.background);
          this.physics.world.setBounds(0, 0, world.width, world.height);
          this.physics.world.gravity.y = world.gravity;

          const platforms = this.physics.add.staticGroup();
          for (const rect of world.platforms) {
            const platform = this.add.rectangle(
              rect.x + rect.width / 2,
              rect.y + rect.height / 2,
              rect.width,
              rect.height,
              world.colors.primary,
            );
            platforms.add(platform);
          }
          platforms.refresh();

          const startY = Math.max(40, world.height - 160);
          const playerRect = this.add.rectangle(64, startY, 34, 44, world.colors.accent);
          this.physics.add.existing(playerRect);
          this.player = playerRect as unknown as ArcadeRectangle;
          this.player.body.setCollideWorldBounds(true);
          this.player.body.setSize(34, 44);

          this.physics.add.collider(this.player, platforms);

          const coins = this.physics.add.staticGroup();
          for (const rect of world.coins) {
            const coin = this.add.rectangle(
              rect.x + rect.width / 2,
              rect.y + rect.height / 2,
              rect.width,
              rect.height,
              world.colors.accent,
            );
            coins.add(coin);
          }
          coins.refresh();

          const hazards = this.physics.add.staticGroup();
          for (const rect of world.hazards) {
            const hazard = this.add.rectangle(
              rect.x + rect.width / 2,
              rect.y + rect.height / 2,
              rect.width,
              rect.height,
              world.colors.danger,
            );
            hazards.add(hazard);
          }
          hazards.refresh();

          const goals = this.physics.add.staticGroup();
          for (const rect of world.goals) {
            const goal = this.add.rectangle(
              rect.x + rect.width / 2,
              rect.y + rect.height / 2,
              rect.width,
              rect.height,
              world.colors.accent,
              0.65,
            );
            goals.add(goal);
          }
          goals.refresh();

          this.physics.add.overlap(this.player, coins, (_player, coin) => {
            coin.destroy();
            this.coinsRemaining = Math.max(0, this.coinsRemaining - 1);
            this.updateHud();
          });

          this.physics.add.overlap(this.player, hazards, () => {
            if (this.finished) {
              return;
            }
            this.health -= 1;
            this.updateHud();
            this.player?.setPosition(64, startY);
            this.player?.body.setVelocity(0, 0);
            if (this.health <= 0) {
              this.finish("Game over");
            }
          });

          this.physics.add.overlap(this.player, goals, () => {
            this.finish("Goal reached");
          });

          this.cursors = this.input.keyboard?.createCursorKeys();
          this.keys = this.input.keyboard?.addKeys("W,A,S,D,SPACE") as Record<
            string,
            Phaser.Input.Keyboard.Key
          >;

          this.cameras.main.setBounds(0, 0, world.width, world.height);
          this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

          this.statusText = this.add
            .text(16, 16, "", {
              fontFamily: "Arial, sans-serif",
              fontSize: "16px",
              color: "#ffffff",
              backgroundColor: "rgba(0,0,0,0.45)",
              padding: { x: 8, y: 6 },
            })
            .setScrollFactor(0)
            .setDepth(10);
          this.updateHud();
        }

        update(): void {
          if (!this.player || this.finished) {
            return;
          }

          const left = this.cursors?.left.isDown || this.keys?.A.isDown;
          const right = this.cursors?.right.isDown || this.keys?.D.isDown;
          const jump =
            this.cursors?.up.isDown ||
            this.cursors?.space.isDown ||
            this.keys?.W.isDown ||
            this.keys?.SPACE.isDown;

          if (left) {
            this.player.body.setVelocityX(-world.playerSpeed);
          } else if (right) {
            this.player.body.setVelocityX(world.playerSpeed);
          } else {
            this.player.body.setVelocityX(0);
          }

          if (jump && this.player.body.blocked.down) {
            this.player.body.setVelocityY(world.jumpVelocity);
          }

          if (this.player.x >= world.goalTarget) {
            this.finish("Target reached");
          }
        }

        private updateHud(): void {
          this.statusText?.setText(
            `Health ${this.health}  Coins ${this.coinsRemaining}`,
          );
        }

        private finish(message: string): void {
          this.finished = true;
          this.player?.body.setVelocity(0, 0);
          this.statusText?.setText(`${message}  Coins ${this.coinsRemaining}`);
        }
      };
    };

    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: container,
      width: viewportWidth,
      height: viewportHeight,
      backgroundColor: spec.theme.palette[0],
      physics: {
        default: "arcade",
        arcade: {
          gravity: { y: world.gravity, x: 0 },
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: createPlatformerScene(),
    });
  }

  private destroyGame(): void {
    if (!this.game) {
      return;
    }

    this.game.destroy(true);
    this.game = null;
  }
}

export function createPlatformerRenderer(): GameRenderer<PlatformerGameSpec> {
  return new PlatformerRenderer();
}
