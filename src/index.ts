import * as constants from "./constants";
import * as ease from "./ease";
import { encode, QRPointType, QRPointTypeValue } from "./qr";
import { qrParams } from "./params";
import { GUIManager } from "./gui";

let guiManager: GUIManager;

// --- ▼ アニメーション状態管理変数を再定義 ▼ ---
// 文字数アニメーション用
let animationStartTime = 0;
let sourceText = '';
let lastSourceText = '';

// QRデータ保持用
let prevQrData: boolean[][] | null = null;
let currentQrData: boolean[][] | null = null;
let prevQrTypes: QRPointTypeValue[][] | null = null;
let currentQrTypes: QRPointTypeValue[][] | null = null;
let previousDisplayText = '';

// トランジション（マス移動）アニメーション用
let isTransitioning = false;
let transitionStartProgress = 0.0; // トランジション期間の開始進行度
let transitionEndProgress = 1.0;   // トランジション期間の終了進行度
const EASE_POWER = 1; // 文字数アニメーションのイージングの強さ
// --- ▲ ここまで再定義 ▲ ---


// --- ▼ ヘルパー関数群 ▼ ---

/**
 * 2分探索を用いて、特定のイージング後の値(eased value)になる前の
 * 時間進行度(progress)を求める関数。
 * @param targetEased 目標とするイージング後の値 (0.0 ~ 1.0)
 * @param easeFunc 使用するイージング関数
 * @param power イージング関数の強度パラメータ
 * @param precision 探索精度
 * @returns 時間進行度 (0.0 ~ 1.0)
 */
function findProgressForEasedValue(
    targetEased: number,
    easeFunc: (t: number, p: number) => number,
    power: number,
    precision = 1e-6
): number {
    let low = 0.0;
    let high = 1.0;
    // ターゲットが範囲外なら、最も近い境界を返す
    if (targetEased <= 0) return 0;
    if (targetEased >= 1) return 1;

    while (high - low > precision) {
        const mid = (low + high) / 2;
        if (easeFunc(mid, power) < targetEased) {
            low = mid;
        } else {
            high = mid;
        }
    }
    return (low + high) / 2;
}


/**
 * target座標に最も近いsourcePoints内の点を見つけるヘルパー関数
 */
function findClosestPoint(targetX: number, targetY: number, sourcePoints: {x: number, y: number}[]): {x: number, y: number} {
    if (sourcePoints.length === 0) {
        return { x: targetX, y: targetY };
    }
    
    let closestPoint = sourcePoints[0];
    let min_dist_sq = Infinity;

    for (const p of sourcePoints) {
        const dist_sq = (p.x - targetX) ** 2 + (p.y - targetY) ** 2;
        if (dist_sq < min_dist_sq) {
            min_dist_sq = dist_sq;
            closestPoint = p;
        }
    }
    return closestPoint;
}

/**
 * QRデータからアニメーション対象（移動可能）な黒マスの座標リストを生成する
 */
function getMovablePoints(qrData: boolean[][] | null, qrTypes: QRPointTypeValue[][] | null): {x: number, y: number}[] {
    const points: {x: number, y: number}[] = [];
    if (!qrData || !qrTypes) return points;
    
    const size = qrData.length;
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const type = qrTypes[i][j];
            if (qrData[i][j] && type !== QRPointType.POS_CENTER && type !== QRPointType.POS_OTHER) {
                points.push({ x: i, y: j });
            }
        }
    }
    return points;
}
// --- ▲ ヘルパー関数群ここまで ▲ ---


export const preload = () => {}

export const resize = () => {
	const canvas = document.querySelector("canvas") as HTMLCanvasElement
	canvas.style.position = "absolute"
	canvas.style.top = "50%"
	canvas.style.left = "50%"
	const scale = Math.min(window.innerWidth / constants.width, window.innerHeight / constants.height)
	canvas.style.transform = "translate(-50%, -50%) scale(" + scale + ")"
}

export const setup = () => {
	p.createCanvas(constants.width, constants.height);
	p.pixelDensity(1);
	p.frameRate(constants.frameRate);
	resize();
	guiManager = new GUIManager();
	guiManager.setupGUI();

	sourceText = qrParams.text;
	lastSourceText = qrParams.text;
	animationStartTime = p.millis();
    previousDisplayText = '';
}

export const draw = () => {
	p.background(qrParams.backgroundColor);

	// 1. GUIでのテキスト変更を検知し、アニメーション全体をリセット
	if (qrParams.text !== lastSourceText) {
		sourceText = qrParams.text;
		lastSourceText = sourceText;
		animationStartTime = p.millis();
        previousDisplayText = '';
        isTransitioning = false;
        prevQrData = null;
        currentQrData = null;
	}

	const elapsedTime = (p.millis() - animationStartTime) / 1000;
	const duration = qrParams.animationDuration;
    const progress = (elapsedTime / duration) % 1.0; 
	const easedProgress = ease.InOut(progress, EASE_POWER);

	// --- ▼ 修正箇所 ▼ ---
	// 3. イージング後の進行度から、常に固定長の表示テキストを決定
	const N = qrParams.displayLength; // 描画する文字列の固定長
	const textLength = sourceText.length;
    const currentLength = textLength > 0 ? Math.ceil(easedProgress * textLength) : 0;
	
    let displayText: string;
    if (currentLength === 0) {
        displayText = ''.padEnd(N, '　');
    } else {
        const start = Math.max(0, currentLength - N);
        const sub = sourceText.substring(start, currentLength);
        displayText = sub.padEnd(N, '　');
    }

	// 4. 表示テキストの変更を検知し、QRデータとトランジション期間を準備
    if (displayText !== previousDisplayText) {
        prevQrData = currentQrData;
        prevQrTypes = currentQrTypes;

        if (displayText.length > 0) {
            [currentQrData, currentQrTypes] = encode(displayText, { ecc: qrParams.errorCorrection });
        } else {
            currentQrData = null;
            currentQrTypes = null;
        }

        // prevとcurrentが存在し、かつQRモジュール数が同じ場合のみトランジション実行
        if (prevQrData && currentQrData && prevQrData.length === currentQrData.length) {
            isTransitioning = true;
            
            // --- ▼ トランジション期間の計算（2分探索を使用） ▼ ---
            // 今回の文字数になった瞬間のeasedProgress
            const startEased = (currentLength - 1) / textLength;
            // 次の文字数になる瞬間のeasedProgress
            const endEased = (currentLength < textLength) ? currentLength / textLength : 1.0;

            // それぞれに対応する元の時間進行度(progress)を2分探索で求める
            transitionStartProgress = findProgressForEasedValue(startEased, ease.InOut, EASE_POWER);
            transitionEndProgress = findProgressForEasedValue(endEased, ease.InOut, EASE_POWER);
            // --- ▲ ここまで ▲ ---

        } else {
            isTransitioning = false;
        }
        previousDisplayText = displayText;
    }
    
	// 5. トランジション（マス移動）のローカルな進行度を計算
    let transitionProgress = 1.0;
    if (isTransitioning) {
        const transitionDuration = transitionEndProgress - transitionStartProgress;
        if (transitionDuration > 0) {
            // 現在の全体進行度が、トランジション期間内のどの位置にあるかを計算
            let localProgress = (progress - transitionStartProgress) / transitionDuration;
            localProgress = Math.max(0, Math.min(localProgress, 1.0)); // 0.0-1.0にクランプ
            
            // マス移動アニメーション自体にもイージングを適用
            transitionProgress = ease.Out(localProgress, 3);
        }

        // 期間を過ぎたらトランジションを終了
        if (progress >= transitionEndProgress) {
            isTransitioning = false;
            transitionProgress = 1.0;
        }
    }

	// 6. 描画処理
    if (!currentQrData || !currentQrTypes) return;

    const size = currentQrData.length;
    const padding = 40;
    const availableSize = Math.min(p.width, p.height) - padding * 2;
    const normalizedCellSize = availableSize / size;
    const totalSize = size * normalizedCellSize;
    const offsetX = (p.width - totalSize) / 2;
    const offsetY = (p.height - totalSize) / 2;
    
    p.fill(qrParams.foregroundColor);
    p.stroke(qrParams.foregroundColor);
    
    const sourcePoints = getMovablePoints(prevQrData, prevQrTypes);
    const targetPointsForDisappearing = getMovablePoints(currentQrData, currentQrTypes);

    // A. 新しいQRコードのマスを描画 (維持されるマス + 現れるマス)
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (!currentQrData[i][j]) continue;

            const type = currentQrTypes[i][j];
            const isAnimatable = type !== QRPointType.POS_CENTER && type !== QRPointType.POS_OTHER;
            
            let startX = i, startY = j;
            if (isTransitioning && isAnimatable) {
                const closest = findClosestPoint(i, j, sourcePoints);
                startX = closest.x;
                startY = closest.y;
            }

            const drawGridX = p.lerp(startX, i, transitionProgress);
            const drawGridY = p.lerp(startY, j, transitionProgress);
            
            const canvasX = offsetX + drawGridX * normalizedCellSize;
            const canvasY = offsetY + drawGridY * normalizedCellSize;
            
            let actualSize = (isAnimatable ? qrParams.moduleSize : 1) * normalizedCellSize;
            let cellOffset = (normalizedCellSize - actualSize) / 2;

            p.rect(canvasX + cellOffset, canvasY + cellOffset, actualSize, actualSize);
        }
    }

    // B. 消えるマスを描画
    if (isTransitioning && prevQrData && prevQrTypes && prevQrData.length === size) {
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (prevQrData[i][j] && !currentQrData[i][j]) {
                    const type = prevQrTypes[i][j];
                    if (type !== QRPointType.POS_CENTER && type !== QRPointType.POS_OTHER) {
                        const closest = findClosestPoint(i, j, targetPointsForDisappearing);
                        const drawGridX = p.lerp(i, closest.x, transitionProgress);
                        const drawGridY = p.lerp(j, closest.y, transitionProgress);
                        
                        const canvasX = offsetX + drawGridX * normalizedCellSize;
                        const canvasY = offsetY + drawGridY * normalizedCellSize;
                        
                        const actualSize = normalizedCellSize * qrParams.moduleSize;
                        const cellOffset = (normalizedCellSize - actualSize) / 2;
                        
                        p.rect(canvasX + cellOffset, canvasY + cellOffset, actualSize, actualSize);
                    }
                }
            }
        }
    }
}