import { qrParams } from "./params";

export class GUIManager {
	constructor() {
        
	}

	setupGUI(): void {
		const qrFolder = gui.addFolder('QRコード設定');
		qrFolder.add(qrParams, 'text')
			.name('テキスト');
		
		qrFolder.add(qrParams, 'errorCorrection', ['low', 'medium', 'quartile', 'high'])
			.name('エラー訂正レベル');

		const animationFolder = qrFolder.addFolder('アニメーション');
		animationFolder.add(qrParams, 'animationDuration', 1, 100, 0.1)
			.name('時間 (秒)');
		
		const appearance = qrFolder.addFolder('外観');
		appearance.addColor(qrParams, 'backgroundColor').name('背景色');
		appearance.addColor(qrParams, 'foregroundColor').name('前景色');
		appearance.add(qrParams, 'moduleSize', 0, 1, 0.01)
			.name('モジュールサイズ');
        appearance.add(qrParams, 'displayLength', 1, 20, 1)
			.name('ディスプレイサイズ');

		qrFolder.add(qrParams, 'saveImage').name('画像を保存');
		qrFolder.open();
		animationFolder.open();
		appearance.open();
	}
}