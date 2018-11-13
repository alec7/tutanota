// @flow
import {ipcRenderer, remote} from 'electron'

/**
 * preload scripts can only load modules that have previously been loaded
 * in the main thread.
 */
const app = remote.require('electron').app
const clipboard = remote.require('electron').clipboard
const PreloadImports = remote.require('./PreloadImports.js').default
const lang = PreloadImports.lang
const Menu = remote.Menu
const MenuItem = remote.MenuItem

/**
 * create the context menu
 * @type {Electron.Menu}
 */
const menu = new Menu()
let pasteItem
lang.initialized.promise.then(() => {
	pasteItem = new MenuItem({label: lang.get("paste_action"), accelerator: "CmdOrCtrl+V", click() { document.execCommand('paste') }})
	menu.append(new MenuItem({label: lang.get("copy_action"), accelerator: "CmdOrCtrl+C", click() { document.execCommand('copy') }}))
	menu.append(new MenuItem({label: lang.get("cut_action"), accelerator: "CmdOrCtrl+X", click() { document.execCommand('cut') }}))
	menu.append(pasteItem)
	menu.append(new MenuItem({type: 'separator'}))
	menu.append(new MenuItem({label: lang.get("undo_action"), accelerator: "CmdOrCtrl+Z", click() { document.execCommand('undo') }}))
	menu.append(new MenuItem({label: lang.get("redo_action"), accelerator: "CmdOrCtrl+Shift+Z", click() { document.execCommand('redo') }}))
})

window.addEventListener('contextmenu', (e) => {
	e.preventDefault()
	pasteItem.enabled = clipboard.readText().length > 0
	menu.popup({window: remote.getCurrentWindow()})
}, false)

function sendMessage(msg, args) {
	ipcRenderer.send(msg, args)
}

ipcRenderer.on('protocol-message', (ev, msg) => {
	window.tutao.nativeApp.handleMessageObject(msg)
})

ipcRenderer.on('print-argv', (ev, msg) => {
	console.log("node argv:", msg)
})

function receiveMessage(msg, listener) {
	return ipcRenderer.on(msg, listener)
}

function removeListener(msg, listener) {
	return ipcRenderer.removeListener(msg, listener)
}

window.onmousewheel = (e) => {
	if (e.ctrlKey) {
		e.preventDefault()
		window.tutao.nativeApp.invokeNative(new PreloadImports.Request('changeZoomFactor', [e.deltaY > 0 ? -10 : 10]))
	}
}

window.nativeApp = {
	invoke: (msg: string) => {sendMessage('protocol-message', msg)},
	sendMessage: (msg: BridgeMessage, data: any) => sendMessage(msg, data),
	startListening: (msg: BridgeMessage, listener: Function) => receiveMessage(msg, listener),
	stopListening: (msg: BridgeMessage, listener: Function) => removeListener(msg, listener),
	getVersion: () => app.getVersion()
}

// window.focus() doesn't seem to be working right now, so we're replacing it
// https://github.com/electron/electron/issues/8969#issuecomment-288024536
window.focus = () => {
	ipcRenderer.send('show-window')
}