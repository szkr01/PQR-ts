import * as constants from "./constants"

// GUIで制御するパラメータ
const params={
	backgroundColor: '#000000',
	fillColor: '#ffffff',
	strokeColor: '#ffffff',
	circleSize: 50,
	speed: 1.0
}

export const preload=() => {

}

export const resize=() => {
	const canvas=document.querySelector("canvas") as HTMLCanvasElement
	canvas.style.position="absolute"
	canvas.style.top="50%"
	canvas.style.left="50%"
	const scale=Math.min(window.innerWidth/constants.width,window.innerHeight/constants.height)
	canvas.style.transform="translate(-50%, -50%) scale("+scale+")"
}

export const setup=() => {
	p.createCanvas(constants.width,constants.height);
	p.pixelDensity(1);
	p.frameRate(constants.frameRate);
	resize();

	// lil-guiのコントロールを追加
	gui.addColor(params,'backgroundColor').name('背景色')
	gui.addColor(params,'fillColor').name('塗りつぶし色')
	gui.addColor(params,'strokeColor').name('線の色')
	gui.add(params,'circleSize',10,200).name('円のサイズ')
	gui.add(params,'speed',0.1,5.0).name('アニメーション速度')
}

export const draw=() => {
	p.background(params.backgroundColor);
	p.fill(params.fillColor);
	p.stroke(params.strokeColor);

	// 簡単なアニメーション例
	const x=constants.width/2+Math.cos(p.frameCount*0.02*params.speed)*200
	const y=constants.height/2+Math.sin(p.frameCount*0.02*params.speed)*200
	p.circle(x,y,params.circleSize)
}