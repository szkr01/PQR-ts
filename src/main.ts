import "./global.d.ts"
import {GUI} from "lil-gui"
import {draw,setup,preload,resize} from "./index"


window.onload=() => {
	// @ts-ignore
	window.gui=new GUI()

	// @ts-ignore
	new p5((p) => {
		// @ts-ignore
		window.p=p
		p.preload=preload
		p.setup=setup
		p.draw=draw
		p.windowResized=resize
	})
}