export interface QRParams {
  text: string;
  renderMode: 'standard';
  errorCorrection: 'low' | 'medium' | 'quartile' | 'high';
  moduleSize: number;
  displayLength: number;
  animationDuration: number;
  backgroundColor: string;
  foregroundColor: string;
  saveImage: () => void;
}

export const qrParams: QRParams = {
	text: '終わるまでは終わらないよ　ふー　　ぽっぱぽっぱぽっぱっぱー　　ぽっぱぽっぱぽっぱっぱー　　いえー　　ぽっぱぽっぱぽっぱっぱー　　ぽっぱぽっぱぽっぱっぱー　　　', // 初期テキストを変更
	renderMode: 'standard',
	errorCorrection: 'high',
	moduleSize: 0.3,
	displayLength: 12,
	animationDuration: 25,
	backgroundColor: '#ffffff',
	foregroundColor: '#000000',
	saveImage: () => {
		p.save('qr-code.png');
	}
};