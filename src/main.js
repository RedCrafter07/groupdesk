const { app: desk, shell, BrowserWindow } = require('electron');

const { Menu, MenuItem } = require('electron'); //Custom App Menu

/* 
	GroupDesk by RedCrafter07
*/

require('update-electron-app')({ notifyUser: true });

let configDefaults = {
	showBar: true,
	editmode: false,
	cards: [],
	skipStartScreen: false,
	configurated: true
};

let popoutActive = false;
let changePopout = false;

// let menu = new Menu();
let settings;

const path = require('path');

const { dialog } = require('electron'); //Dialog Box (File Opening)

const fs = require('fs');

const flash = require('connect-flash');

let windowOptions = {
	width: 960,
	height: 540,
	webPreferences: {
		nodeIntegration: true,
		contextIsolation: false,
		webSecurity: false
	},
	center: true,
	icon: path.join(__dirname, '../icon.ico'),
	backgroundColor: '#202020'
};

// const fs = require('fs');

const { JsonDB } = require('node-json-db');
const { Config } = require('node-json-db/dist/lib/JsonDBConfig');

// The first argument is the database filename. If no extension, '.json' is assumed and automatically added.
// The second argument is used to tell the DB to save after each push
// If you put false, you'll have to call the save() method.
// The third argument is to ask JsonDB to save the database in an human readable format. (default false)
// The last argument is the separator. By default it's slash (/)
var db = new JsonDB(new Config(path.join(__dirname, 'config'), true, true, '.'));

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
	// eslint-disable-line global-require
	desk.quit();
	desk.exit();
}

// menu.append(
// 	new MenuItem({
// 		label: 'New Window',
// 		accelerator: 'CmdOrCtrl+g+n',
// 		click: () => {
// 			console.log('New window function soon');
// 		}
// 	})
// );

// const config = require('../../config.json'); //Package? Use this :)
let config = require('./config.json');

if (!config.configurated) {
	config = configDefaults;
}

// let started = true;

let appStartTime = Date.now();

let win;

let start;

function createWindow() {
	// Erstelle das Browser-Fenster.
	win = new BrowserWindow(windowOptions);

	windowSet();

	win.maximize();

	win.on('close', e => {
		if (popoutActive == true) {
			e.preventDefault();

			popout();

			win.reload();
		}
	});

	win.setResizable(true);
}

function startscreen() {
	start = new BrowserWindow({
		width: 512,
		height: 512,
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: false,
			webSecurity: false
		},
		center: true,
		icon: path.join(__dirname, '../icon.ico'),
		frame: false,
		resizable: false,
		maximizable: false,
		minimizable: false,
		closable: false,
		backgroundColor: '#212121',
		title: 'GroupDesk | Starting...'
	});

	start.loadURL('http://localhost:7474/loading.gif');

	setTimeout(() => {
		createWindow();

		setTimeout(() => {
			start.destroy();
		}, 3000);
	}, 5000);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Einige APIs können nur nach dem Auftreten dieses Events genutzt werden.
desk.whenReady().then(async () => {
	console.log(`App started in ${Date.now() - appStartTime}ms.`);
	if (config.skipStartScreen == true) {
		config.skipStartScreen = false;

		await db.push('.', config);

		createWindow();

		return;
	}
	startscreen();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
desk.on('window-all-closed', async () => {
	if (process.platform !== 'darwin') {
		config.editmode = false;

		await db.push('.', config);

		desk.quit();
	}
});

desk.on('activate', () => {
	// On macOS it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
		win.maximize();
	}
});

// In this file you can include the rest of your app's specific main process
// code. Sie können den Code auch
// auf mehrere Dateien aufteilen und diese hier einbinden.

const express = require('express'),
	app = express(),
	bodyParser = require('body-parser');

app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(flash());

app.get('/start', (req, res) => {
	res.render('start.ejs');
});

app.get('/', async (req, res) => {
	let cards = await config.cards.sort(function(a, b) {
		return a.pos - b.pos;
	});
	if (config.editmode == true) {
		if (popoutActive == true) {
			popout();
			changePopout = true;

			console.log(changePopout);
		}
		res.redirect('/edit');
	} else {
		if (changePopout == true && popoutActive == false) {
			changePopout = false;
			popout();
		}

		if (settings) {
			settings.destroy();
			settings = undefined;
		}

		res.render('home.ejs', { config, cards, popout: popoutActive });
	}
});

app.get('/edit', async (req, res) => {
	let cards = await config.cards.sort(function(a, b) {
		return a.pos - b.pos;
	});
	res.render('edit.ejs', { config: config, cards: cards });
});

app.get('/cardsettings', (req, res) => {
	res.render('cardsetts.ejs');
});

app.get('/newcard', (req, res) => {
	res.render('addcard.ejs');
});

app.post('/newcard', async (req, res) => {
	let cardObj = {
		index: config.cards.length,
		type: req.body.type,
		name: req.body.name,
		id: Math.floor(Math.random() * 9999999999999),
		color: req.body.color,
		tcolor: hexToLightOrDark(req.body.color)
	};

	if (req.body.type == 'text') {
		cardObj.val = req.body.textval;
	} else if (req.body.type == 'url') {
		cardObj.val = req.body.urlval;
		cardObj.ph = req.body.urlph;
	}

	if (cardObj.type == 'url' && (!cardObj.val.startsWith('http://') && !cardObj.val.startsWith('https://'))) {
		cardObj.val = `https://${cardObj.val}`;
	}

	config.cards.push(cardObj);

	await db.push('.', config);

	console.log(cardObj);

	res.redirect('/');
});

// app.post('/newcard', async (req, res) => {
// 	// console.log(req.body);

// 	let newIndex = 0;

// 	config.cards.forEach((card, i) => {
// 		newIndex++;
// 	});

// 	let cardObj = {
// 		name: req.body.name,
// 		type: req.body.type,
// 		id: Math.floor(Math.random() * 9999999999999),
// 		pos: newIndex
// 	};

// 	if (req.body.type == 'text') {
// 		cardObj.val = req.body.textval;
// 	} else if (req.body.type == 'url') {
// 		cardObj.val = req.body.urlval;
// 		cardObj.ph = req.body.urlph;
// 	}

// 	// console.log(cardObj);

// 	config.cards.push(cardObj);

// 	await db.push('.', config);

// 	res.redirect('/');
// });

app.get('/editcard/:id', async (req, res) => {
	let cardIndex = await findCard(req.params.id);
	let card = config.cards[cardIndex];
	res.render('editcard.ejs', { card });
});

app.post('/editcard/:id', async (req, res) => {
	let cardIndex = await findCard(req.params.id);

	config.cards[cardIndex].name = req.body.name;

	config.cards[cardIndex].color = req.body.color;

	config.cards[cardIndex].tcolor = hexToLightOrDark(req.body.color);

	if (config.cards[cardIndex].type == 'url') {
		config.cards[cardIndex].val = req.body.urlval;
		config.cards[cardIndex].ph = req.body.urlph;
	} else if (config.cards[cardIndex].type == 'text') {
		config.cards[cardIndex].val = req.body.textval;
	}

	db.push('.', config);

	res.redirect('/');
});

app.get('/poscarddown/:id', async (req, res) => {
	let cardIndex = await findCard(req.params.id);
	let swapCardIndex = cardIndex - 1;

	if (cardIndex == 0) return res.redirect('/');

	config.cards[cardIndex].pos--;
	config.cards[swapCardIndex].pos++;

	await db.push('.', config);

	res.redirect('/');
});

app.get('/poscardup/:id', async (req, res) => {
	let cardIndex = await findCard(req.params.id);
	let swapCardIndex = cardIndex + 1;

	config.cards[cardIndex].pos++;
	config.cards[swapCardIndex].pos--;

	await db.push('.', config);

	res.redirect('/');
});

app.get('/delcard/:id', (req, res) => {
	delCard(req.params.id);
	// console.log(config.cards[searchCard(req.params.id)]);

	res.redirect('/');
});

app.listen('7474', '127.0.0.1', () => {
	console.log('Hoi!');
});

app.post('/changeConfig', async (req, res) => {
	// console.log(req.body);

	if (req.body.showBar) {
		config.showBar = true;
	} else {
		config.showBar = false;
	}

	if (req.body.editmode) {
		config.editmode = true;
	} else {
		config.editmode = false;
	}

	await db.push('.', config);

	res.redirect('/');
});

app.get('/popout', (req, res) => {
	popout();

	res.redirect('back');
});

app.get('/settings/apply', async (req, res) => {
	config.editmode = false;
	await db.push('.', config);
	desk.relaunch();
	desk.exit();
	res.redirect('back');
});

app.get('/settings', (req, res) => {
	res.redirect('back');

	if (settings) {
		settings.show();
		return;
	}

	settings = new BrowserWindow(windowOptions);

	settings.setMenu(null);

	settings.setMinimizable(false);

	settings.setMaximizable(false);

	settings.setResizable(false);

	win.minimize();

	settings.loadURL('http://localhost:7474/settingsView');

	settings.on('close', e => {
		win.reload();
		win.show();
		win.maximize();
		settings = undefined;
	});
});

app.get('/settings/backup', (req, res) => {
	settings.setProgressBar(0.5, { mode: 'paused' });
	dialog
		.showOpenDialog(settings, {
			properties: [ 'showHiddenFiles', 'promptToCreate', 'openFile' ],
			filters: [ { name: 'JSON', extensions: [ 'json' ] } ],
			message: 'Please select the JSON you want to backup in.',
			title: 'GroupDesk | Backup',
			buttonLabel: 'Start Backup'
		})
		.then(result => {
			if (result.canceled == false) {
				settings.setProgressBar(0.75, { mode: 'normal' });
				let backupJsonPath = result.filePaths[0];

				setTimeout(() => {
					fs.writeFile(backupJsonPath, JSON.stringify(config), err => {
						if (err) {
							console.log(err);
							settings.setProgressBar(1.0, { mode: 'error' });
							return;
						}

						settings.setProgressBar(1.0, { mode: 'indeterminate' });

						setTimeout(() => {
							settings.setProgressBar(0, { mode: 'normal' });
						}, 2000);
					});
				}, 500);

				// fs.writeFile('messages.json', JSON.stringify(messages, null, 2), err => {
				// 	if (err) console.log(err);
				// });
			} else {
				settings.setProgressBar(0.5, { mode: 'error' });
				setTimeout(() => {
					settings.setProgressBar(0, { mode: 'normal' });
				}, 5000);
			}
		})
		.catch(err => {
			console.log(err);
		});
	res.render('backup.ejs');
});

// app.get('/settings/backup/restore', async (req, res) => {
// 	res.render('restore.ejs');
// });
app.get('/settings/backup/restore', async (req, res) => {
	settings.setProgressBar(0.25, { mode: 'paused' });
	dialog
		.showOpenDialog(settings, {
			properties: [ 'showHiddenFiles', 'promptToCreate', 'openFile' ],
			filters: [ { name: 'JSON', extensions: [ 'json' ] } ],
			message: 'Please select the JSON you want to restore from.',
			title: 'GroupDesk | Restore',
			buttonLabel: 'Start Restore'
		})
		.then(async result => {
			if (result.canceled == false) {
				settings.setProgressBar(0.5, { mode: 'normal' });
				setTimeout(async () => {
					const restoreJsonPath = result.filePaths[0];

					const restore = require(restoreJsonPath);

					console.log('Restore: ', restore);

					config = restore;

					console.log('Config: ', config);

					await db.push('.', config);

					setTimeout(async () => {
						settings.setProgressBar(0, { mode: 'normal' });

						config.skipStartScreen = true;

						await db.push('.', config);

						desk.relaunch();
						desk.exit();
					}, 1000);
				}, 1000);
			} else {
				settings.setProgressBar(0.5, { mode: 'error' });
				setTimeout(() => {
					settings.setProgressBar(0, { mode: 'normal' });
				}, 5000);
			}
		})
		.catch(err => {
			console.log(err);
		});
	res.render('restore.ejs');
});

app.get('/settingsView', async (req, res) => {
	settings.unmaximize();
	settings.setMaximizable(false);
	settings.setResizable(false);
	win.reload();
	config.editmode = true;
	await db.push('.', config);
	res.render('settings.ejs');
});

app.get('/settingsView/config', (req, res) => {
	res.render('changeConfig.ejs', { config: JSON.stringify(config) });
	settings.setMaximizable(true);
	settings.setResizable(true);
	settings.maximize();
	win.reload();
});

app.get('/reset', (req, res) => {
	settings.setProgressBar(0.5, { mode: 'paused' });
	dialog
		.showOpenDialog(settings, {
			properties: [ 'showHiddenFiles', 'promptToCreate', 'openFile' ],
			filters: [ { name: 'JSON', extensions: [ 'json' ] } ],
			message: 'Please select the JSON you want to backup in.',
			title: 'GroupDesk | Backup',
			buttonLabel: 'Start Backup'
		})
		.then(result => {
			if (result.canceled == false) {
				settings.setProgressBar(0.75, { mode: 'normal' });
				let backupJsonPath = result.filePaths[0];

				setTimeout(() => {
					fs.writeFile(backupJsonPath, JSON.stringify(config), err => {
						if (err) {
							console.log(err);
							settings.setProgressBar(1.0, { mode: 'error' });
							return;
						}

						settings.setProgressBar(1.0, { mode: 'indeterminate' });

						setTimeout(async () => {
							settings.setProgressBar(0, { mode: 'normal' });
							config = configDefaults;
							await db.push('.', config);

							desk.relaunch();
							desk.exit();
						}, 2000);
					});
				}, 500);

				// fs.writeFile('messages.json', JSON.stringify(messages, null, 2), err => {
				// 	if (err) console.log(err);
				// });
			} else {
				settings.setProgressBar(0.5, { mode: 'error' });
				setTimeout(() => {
					settings.setProgressBar(0, { mode: 'normal' });
				}, 5000);
			}
		})
		.catch(err => {
			console.log(err);
		});
	res.render('reset.ejs');
});

app.post('/settingsView/config', async (req, res) => {
	let bodyConfig = req.body.config;

	bodyConfig = await JSON.parse(bodyConfig);
	// console.log(bodyConfig);

	config = bodyConfig;

	await db.push('.', config);

	win.reload();

	res.redirect('/settingsView');
});

app.get('*', (req, res) => {
	res.redirect('back');
});

// function start() { //Launcher not working when packaged
// 	// Erstelle das Browser-Fenster.
// 	const win = new BrowserWindow({
// 		width: 400,
// 		height: 600,
// 		webPreferences: {
// 			nodeIntegration: true,
// 			contextIsolation: true
// 		},
// 		frame: false
// 	});

// 	// and load the index.html of the app.
// 	win.loadURL('http://localhost:7474/start');

// 	// win.setMenu(menu)

// 	win.setIcon('./icon.ico');

// 	win.setMenu(null);

// 	setTimeout(() => {
// 		win.close();

// 		createWindow();

// 		started = true;
// 	}, 10000);
// }

function delCard(id) {
	config.cards.forEach(async (card, i) => {
		// console.log(card);
		if (card.id == id) {
			// console.log(i, card);
			if (i > -1) {
				config.cards.splice(i, 1);
			}

			// array = [2, 9]
			// console.log(config.cards);

			await db.push('.', config);
		}
	});
}

function popout() {
	popoutActive = popoutActive == false;

	if (popoutActive == true) {
		win.setAlwaysOnTop(true);

		win.unmaximize();

		win.setSize(405, 405, true);

		win.setMaximizable(false);

		win.setMinimizable(false);

		win.setResizable(false);
	} else {
		win.setAlwaysOnTop(false);

		win.setSize(960, 540, true);

		win.setMaximizable(true);

		win.setMinimizable(true);

		win.setResizable(true);

		win.center();

		win.maximize();
	}
}

function findCard(id) {
	let cardIndex = undefined;
	config.cards.forEach((card, i) => {
		// console.log(card);
		if (card.id == id) {
			// console.log(i, card);
			cardIndex = i;
		}
	});

	return cardIndex;
}

function windowSet() {
	win.setMenu(null);

	win.loadURL('http://localhost:7474/');

	// win.setIcon('./icon.ico');

	win.webContents.on('new-window', function(event, url) {
		event.preventDefault();
		shell.openExternal(url);
	});

	win.setAlwaysOnTop(false);
}

function hexToHSL(H) {
	/* 
	Source:
	https://css-tricks.com/converting-color-spaces-in-javascript/#hex-to-hsl
	*/
	let r = 0,
		g = 0,
		b = 0;
	if (H.length == 4) {
		r = '0x' + H[1] + H[1];
		g = '0x' + H[2] + H[2];
		b = '0x' + H[3] + H[3];
	} else if (H.length == 7) {
		r = '0x' + H[1] + H[2];
		g = '0x' + H[3] + H[4];
		b = '0x' + H[5] + H[6];
	}
	r /= 255;
	g /= 255;
	b /= 255;
	let cmin = Math.min(r, g, b),
		cmax = Math.max(r, g, b),
		delta = cmax - cmin,
		h = 0,
		s = 0,
		l = 0;

	if (delta == 0) h = 0;
	else if (cmax == r) h = ((g - b) / delta) % 6;
	else if (cmax == g) h = (b - r) / delta + 2;
	else h = (r - g) / delta + 4;

	h = Math.round(h * 60);

	if (h < 0) h += 360;

	l = (cmax + cmin) / 2;
	s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
	s = +(s * 100).toFixed(1);
	l = +(l * 100).toFixed(1);

	return 'hsl(' + h + ',' + s + '%,' + l + '%)';
}

function hexToLightOrDark(H) {
	/* 
	Source:
	https://css-tricks.com/converting-color-spaces-in-javascript/#hex-to-hsl

	Modification: RedCrafter07
	*/
	let r = 0,
		g = 0,
		b = 0;
	if (H.length == 4) {
		r = '0x' + H[1] + H[1];
		g = '0x' + H[2] + H[2];
		b = '0x' + H[3] + H[3];
	} else if (H.length == 7) {
		r = '0x' + H[1] + H[2];
		g = '0x' + H[3] + H[4];
		b = '0x' + H[5] + H[6];
	}
	r /= 255;
	g /= 255;
	b /= 255;
	let cmin = Math.min(r, g, b),
		cmax = Math.max(r, g, b),
		delta = cmax - cmin,
		h = 0,
		s = 0,
		l = 0;

	if (delta == 0) h = 0;
	else if (cmax == r) h = ((g - b) / delta) % 6;
	else if (cmax == g) h = (b - r) / delta + 2;
	else h = (r - g) / delta + 4;

	h = Math.round(h * 60);

	if (h < 0) h += 360;

	l = (cmax + cmin) / 2;
	s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
	s = +(s * 100).toFixed(1);
	l = +(l * 100).toFixed(1);

	if (l > 50) {
		return 'black';
	} else if (l < 50) {
		return 'white';
	}
}
