import p5 from "p5";

export class Particle {
  pos: p5.Vector;       // 現在の座標
  targetPos: p5.Vector; // 目標の座標
  size: number;
  color: string;
  lerpFactor: number;   // アニメーションの滑らかさを決める係数

  constructor(size: number, color: string) {
    // 画面上のランダムな位置で初期化
    this.pos = p.createVector(p.random(p.width), p.random(p.height));
    // 最初の目標は画面中央に設定
    this.targetPos = p.createVector(p.width / 2, p.height / 2);
    
    this.size = size;
    this.color = color;
    // パーティクルごとに少し速度を変えると、より自然な動きに見える
    this.lerpFactor = p.random(0.05, 0.15);
  }

  // 新しい目標座標を設定する
  setTarget(newTargetX: number, newTargetY: number) {
    this.targetPos.set(newTargetX, newTargetY);
  }

  // 画面外に目標を設定し、パーティクルを「退避」させる
  retire() {
      const angle = p.random(p.TWO_PI);
      // 画面の対角線より少し遠い場所を目標にする
      const radius = p.dist(0, 0, p.width, p.height) * 0.7;
      this.targetPos.set(
          p.width / 2 + radius * Math.cos(angle),
          p.height / 2 + radius * Math.sin(angle)
      );
  }

  // 毎フレーム呼び出される更新処理
  update() {
    // 現在位置(pos)を目標位置(targetPos)に滑らかに近づける
    this.pos.lerp(this.targetPos, this.lerpFactor);
  }

  // 描画処理
  draw() {
    p.fill(this.color);
    p.noStroke();
    // (setupでrectMode(CENTER)を設定するため、中心座標で描画できる)
    p.rect(this.pos.x, this.pos.y, this.size, this.size);
  }
}