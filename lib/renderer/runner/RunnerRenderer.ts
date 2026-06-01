import type { GameRenderer } from "@/lib/renderer/GameRenderer";
import type { RunnerGameSpec } from "@/lib/spec/types";

import { buildRunnerWorld, type RunnerRect } from "./world";

type PhaserModule = typeof import("phaser");
type PhaserGame = InstanceType<PhaserModule["Game"]>;
type ArcadeRectangle = Phaser.GameObjects.Rectangle & {
  body: Phaser.Physics.Arcade.Body;
};

export class RunnerRenderer implements GameRenderer<RunnerGameSpec> {
  private container: HTMLElement | null = null;
  private game: PhaserGame | null = null;
  private spec: RunnerGameSpec | null = null;
  private mountToken = 0;

  mount(container: HTMLElement, spec: RunnerGameSpec): void {
    this.container = container;
    this.spec = spec;
    const token = ++this.mountToken;

    void this.mountAsync(container, spec, token);
  }

  update(spec: RunnerGameSpec): void {
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
    spec: RunnerGameSpec,
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

    const world = buildRunnerWorld(spec);
    const viewportWidth = Math.min(960, Math.max(640, world.width));
    const viewportHeight = Math.min(540, Math.max(360, world.height));

    const createRunnerScene = () => {
      return class RunnerScene extends Phaser.Scene {
        private player?: ArcadeRectangle;
        private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
        private keys?: Record<string, Phaser.Input.Keyboard.Key>;
        private obstacles?: Phaser.Physics.Arcade.Group;
        private pickups?: Phaser.Physics.Arcade.Group;
        private statusText?: Phaser.GameObjects.Text;
        private nextSpawnX = viewportWidth + 160;
        private nextTemplateIndex = 0;
        private distance = 0;
        private health = world.playerHealth;
        private finished = false;

        constructor() {
          super("runner");
        }

        create(): void {
          this.cameras.main.setBackgroundColor(world.colors.background);
          this.physics.world.gravity.y = world.gravity;

          const ground = this.add.rectangle(
            viewportWidth / 2,
            world.groundY + 28,
            viewportWidth,
            56,
            world.colors.primary,
          );
          this.physics.add.existing(ground, true);

          const playerRect = this.add.rectangle(128, world.groundY - 28, 34, 54, world.colors.accent);
          this.physics.add.existing(playerRect);
          this.player = playerRect as unknown as ArcadeRectangle;
          this.player.body.setCollideWorldBounds(true);
          this.player.body.setSize(34, 54);
          this.player.body.setGravityY(0);
          this.physics.add.collider(this.player, ground);

          this.obstacles = this.physics.add.group({ allowGravity: false, immovable: true });
          this.pickups = this.physics.add.group({ allowGravity: false, immovable: true });

          for (const entity of world.stream) {
            this.spawnFromTemplate(entity, entity.x);
            this.nextSpawnX = Math.max(this.nextSpawnX, entity.x + 320);
          }

          this.physics.add.overlap(this.player, this.obstacles, (_player, obstacle) => {
            if (this.finished) {
              return;
            }
            obstacle.destroy();
            this.health -= 1;
            this.updateHud();
            if (this.health <= 0) {
              this.finish("Game over");
            }
          });

          this.physics.add.overlap(this.player, this.pickups, (_player, pickup) => {
            pickup.destroy();
            this.distance += 120;
            this.updateHud();
          });

          this.cursors = this.input.keyboard?.createCursorKeys();
          this.keys = this.input.keyboard?.addKeys("W,A,S,D,SPACE") as Record<
            string,
            Phaser.Input.Keyboard.Key
          >;

          this.statusText = this.add
            .text(16, 16, "", {
              fontFamily: "Arial, sans-serif",
              fontSize: "16px",
              color: "#ffffff",
              backgroundColor: "rgba(0,0,0,0.45)",
              padding: { x: 8, y: 6 },
            })
            .setDepth(10);
          this.updateHud();
        }

        update(_time: number, delta: number): void {
          if (!this.player || this.finished) {
            return;
          }

          const jumpPressed =
            (!!this.cursors?.up && Phaser.Input.Keyboard.JustDown(this.cursors.up)) ||
            (!!this.cursors?.space && Phaser.Input.Keyboard.JustDown(this.cursors.space)) ||
            (!!this.keys?.W && Phaser.Input.Keyboard.JustDown(this.keys.W)) ||
            (!!this.keys?.SPACE && Phaser.Input.Keyboard.JustDown(this.keys.SPACE));
          const ducking =
            world.canDuck &&
            !!(this.cursors?.down.isDown || this.keys?.S.isDown);

          if (ducking) {
            this.player.setSize(42, 28);
            this.player.body.setSize(42, 28);
          } else {
            this.player.setSize(34, 54);
            this.player.body.setSize(34, 54);
          }

          if (jumpPressed && this.player.body.blocked.down) {
            this.player.body.setVelocityY(world.jumpVelocity);
          }

          const moveBy = (world.scrollSpeed * delta) / 1000;
          this.distance += moveBy;
          this.moveGroup(this.obstacles, moveBy);
          this.moveGroup(this.pickups, moveBy);

          if (this.nextSpawnX < viewportWidth + 220) {
            this.spawnNextProcedural();
          }
          this.nextSpawnX -= moveBy;

          if (this.distance >= world.scoreTarget) {
            this.finish("Distance reached");
          }

          this.updateHud();
        }

        private moveGroup(group: Phaser.Physics.Arcade.Group | undefined, amount: number): void {
          group?.children.each((child) => {
            const rect = child as ArcadeRectangle;
            rect.x -= amount;
            if (rect.x < -120) {
              rect.destroy();
            }
            return true;
          });
        }

        private spawnNextProcedural(): void {
          const fallback: RunnerRect = {
            type: "obstacle-low",
            x: viewportWidth + 180,
            y: world.groundY - 36,
            width: 52,
            height: 42,
          };
          const template = world.stream[this.nextTemplateIndex % Math.max(1, world.stream.length)] ?? fallback;
          this.nextTemplateIndex += 1;
          this.spawnFromTemplate(template, viewportWidth + 180);
          this.nextSpawnX = viewportWidth + 180 + 260 + this.nextTemplateIndex * 17;
        }

        private spawnFromTemplate(template: RunnerRect, x: number): void {
          const width = template.width;
          const height = template.height;
          const centerY =
            template.type === "obstacle-low"
              ? world.groundY - height / 2
              : template.y + height / 2;
          const fill = template.type === "pickup" ? world.colors.accent : world.colors.danger;
          const rect = this.add.rectangle(x + width / 2, centerY, width, height, fill);
          this.physics.add.existing(rect);
          const body = (rect as unknown as ArcadeRectangle).body;
          body.setAllowGravity(false);
          body.setImmovable(true);
          body.setSize(width, height);
          if (template.type === "pickup") {
            this.pickups?.add(rect);
          } else {
            this.obstacles?.add(rect);
          }
        }

        private updateHud(): void {
          this.statusText?.setText(
            `Health ${this.health}  Distance ${Math.floor(this.distance)}/${world.scoreTarget}`,
          );
        }

        private finish(message: string): void {
          this.finished = true;
          this.player?.body.setVelocity(0, 0);
          this.statusText?.setText(`${message}  Distance ${Math.floor(this.distance)}/${world.scoreTarget}`);
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
      scene: createRunnerScene(),
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

export function createRunnerRenderer(): GameRenderer<RunnerGameSpec> {
  return new RunnerRenderer();
}
