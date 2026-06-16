import path from "node:path";
import { fileURLToPath } from "node:url";
import { BrowserWindow, ipcMain, screen } from "electron";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const RENDERER_DIST = path.join(APP_ROOT, "dist");
const HEADLESS = process.env["HEADLESS"] === "true";
const HUD_WINDOW_WIDTH = 560;
const HUD_WINDOW_HEIGHT = 92;
const HUD_WINDOW_HEIGHT_EXPANDED = 138;

let hudOverlayWindow: BrowserWindow | null = null;

ipcMain.on("hud-overlay-hide", () => {
	if (hudOverlayWindow && !hudOverlayWindow.isDestroyed()) {
		hudOverlayWindow.minimize();
	}
});

function positionHudOverlayWindow(win: BrowserWindow, height: number) {
	const primaryDisplay = screen.getPrimaryDisplay();
	const { workArea } = primaryDisplay;
	const x = Math.floor(workArea.x + (workArea.width - HUD_WINDOW_WIDTH) / 2);
	const y = Math.floor(workArea.y + workArea.height - height - 12);

	win.setBounds(
		{
			x,
			y,
			width: HUD_WINDOW_WIDTH,
			height,
		},
		false,
	);
}

ipcMain.on("hud:setMicrophoneExpanded", (_event, expanded: boolean) => {
	if (!hudOverlayWindow || hudOverlayWindow.isDestroyed()) {
		return;
	}

	positionHudOverlayWindow(
		hudOverlayWindow,
		expanded ? HUD_WINDOW_HEIGHT_EXPANDED : HUD_WINDOW_HEIGHT,
	);
});

export function createHudOverlayWindow(): BrowserWindow {
	const win = new BrowserWindow({
		width: HUD_WINDOW_WIDTH,
		height: HUD_WINDOW_HEIGHT,
		minWidth: HUD_WINDOW_WIDTH,
		maxWidth: HUD_WINDOW_WIDTH,
		minHeight: HUD_WINDOW_HEIGHT,
		maxHeight: HUD_WINDOW_HEIGHT_EXPANDED,
		frame: false,
		transparent: true,
		resizable: false,
		alwaysOnTop: true,
		skipTaskbar: true,
		hasShadow: false,
		show: !HEADLESS,
		webPreferences: {
			preload: path.join(__dirname, "preload.mjs"),
			nodeIntegration: false,
			contextIsolation: true,
			backgroundThrottling: false,
		},
	});

	win.webContents.on("did-finish-load", () => {
		win?.webContents.send("main-process-message", new Date().toLocaleString());
	});

	hudOverlayWindow = win;
	positionHudOverlayWindow(win, HUD_WINDOW_HEIGHT);

	win.on("closed", () => {
		if (hudOverlayWindow === win) {
			hudOverlayWindow = null;
		}
	});

	if (VITE_DEV_SERVER_URL) {
		win.loadURL(VITE_DEV_SERVER_URL + "?windowType=hud-overlay");
	} else {
		win.loadFile(path.join(RENDERER_DIST, "index.html"), {
			query: { windowType: "hud-overlay" },
		});
	}

	return win;
}

export function createEditorWindow(): BrowserWindow {
	const isMac = process.platform === "darwin";

	const win = new BrowserWindow({
		width: 1200,
		height: 800,
		minWidth: 800,
		minHeight: 600,
		...(isMac && {
			titleBarStyle: "hiddenInset",
			trafficLightPosition: { x: 12, y: 12 },
		}),
		transparent: false,
		resizable: true,
		alwaysOnTop: false,
		skipTaskbar: false,
		title: "OpenScreen",
		backgroundColor: "#000000",
		show: !HEADLESS,
		webPreferences: {
			preload: path.join(__dirname, "preload.mjs"),
			nodeIntegration: false,
			contextIsolation: true,
			webSecurity: false,
			backgroundThrottling: false,
		},
	});

	// Maximize the window by default
	win.maximize();

	win.webContents.on("did-finish-load", () => {
		win?.webContents.send("main-process-message", new Date().toLocaleString());
	});

	if (VITE_DEV_SERVER_URL) {
		win.loadURL(VITE_DEV_SERVER_URL + "?windowType=editor");
	} else {
		win.loadFile(path.join(RENDERER_DIST, "index.html"), {
			query: { windowType: "editor" },
		});
	}

	return win;
}

export function createSourceSelectorWindow(): BrowserWindow {
	const { width, height } = screen.getPrimaryDisplay().workAreaSize;

	const win = new BrowserWindow({
		width: 760,
		height: 560,
		minWidth: 760,
		maxWidth: 760,
		minHeight: 560,
		maxHeight: 560,
		x: Math.round((width - 760) / 2),
		y: Math.round((height - 560) / 2),
		frame: false,
		resizable: false,
		alwaysOnTop: true,
		transparent: true,
		backgroundColor: "#00000000",
		webPreferences: {
			preload: path.join(__dirname, "preload.mjs"),
			nodeIntegration: false,
			contextIsolation: true,
		},
	});

	if (VITE_DEV_SERVER_URL) {
		win.loadURL(VITE_DEV_SERVER_URL + "?windowType=source-selector");
	} else {
		win.loadFile(path.join(RENDERER_DIST, "index.html"), {
			query: { windowType: "source-selector" },
		});
	}

	return win;
}
