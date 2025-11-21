/* --- SYSTEM STATE & GLOBALS --- */
    const DEFAULT_APPS = [
      { id: 'files', name: 'File Explorer', icon: 'https://img.icons8.com/fluency/96/folder-invoices.png' },
      { id: 'browser', name: 'Browser', icon: 'https://img.icons8.com/color/96/chrome.png' },
      { id: 'tasks', name: 'Tasks', icon: 'https://img.icons8.com/fluency/96/todo-list.png' },
      { id: 'terminal', name: 'Terminal', icon: 'https://img.icons8.com/fluency/96/console.png' },
      { id: 'settings', name: 'Settings', icon: 'https://img.icons8.com/fluent/96/settings.png' },
      { id: 'store', name: 'App Store', icon: 'https://img.icons8.com/fluent/96/app-store.png' },
      { id: 'notepad', name: 'Notepad', icon: 'https://img.icons8.com/fluent/96/notepad.png' },
      { id: 'calc', name: 'Calculator', icon: 'https://img.icons8.com/fluent/96/calculator.png' },
      { id: 'vscode', name: 'VS Code', icon: 'https://img.icons8.com/fluent/96/visual-studio-code-2019.png' }
    ];

    let userProfile = null;
    let fileSystem = { 
        root: { 
            "Documents": {}, 
            "Downloads": {}, 
            "Pictures": {}, 
            "Music": {}
        } 
    };
    let activeWindows = {};
    let browserTabs = {}; 
    let idleTime = 0;
    let dndMode = false;

    /* --- BOOT & AUTH --- */
    window.onload = () => {
        loadSystem();
        setInterval(() => { 
            const now = new Date();
            const timeString = now.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
            document.getElementById('clock').innerText = timeString;
            document.getElementById('clock-time').innerText = timeString;
            document.getElementById('clock-date').innerText = now.toLocaleDateString();
            idleTime++;
            if(idleTime > 300 && userProfile) location.reload(); 
        }, 1000);
        document.body.onmousemove = () => idleTime = 0;
        document.body.onkeydown = (e) => {
            idleTime = 0;
            if(e.key === 'F9') document.getElementById('dev-panel').classList.toggle('active');
        };
    };

    /* --- NEW FUNCTIONAL BUTTONS LOGIC --- */
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(e => console.log(e));
            notify('System', 'Fullscreen Enabled');
        } else {
            document.exitFullscreen();
            notify('System', 'Fullscreen Disabled');
        }
    }

    function togglePerformance() {
        document.body.classList.toggle('perf-mode');
        const isPerf = document.body.classList.contains('perf-mode');
        notify('Performance Mode', isPerf ? 'ON (Blur Disabled)' : 'OFF (Blur Enabled)');
    }

    function minimizeAll() {
        const windows = document.querySelectorAll('.window');
        windows.forEach(win => {
            win.style.display = 'none';
            const icon = document.getElementById(win.id.replace('win-', 'tb-'));
            if(icon) icon.classList.remove('active');
        });
        notify('System', 'All windows minimized');
    }

    function toggleDND(el) {
        el.classList.toggle('active');
        dndMode = el.classList.contains('active');
        notify('Do Not Disturb', dndMode ? 'Enabled' : 'Disabled');
    }

    function loadSystem() {
        const savedUser = localStorage.getItem('yasu_user');
        const savedFS = localStorage.getItem('yasu_fs');
        if(savedFS) fileSystem = JSON.parse(savedFS);
        
        if(!savedUser) {
            document.getElementById('setup-screen').style.display = 'flex';
        } else {
            userProfile = JSON.parse(savedUser);
            document.getElementById('ls-user').innerText = userProfile.name;
            document.getElementById('ls-avatar').src = userProfile.pfp;
            document.getElementById('lock-screen').style.display = 'flex';
            if(userProfile.bg) document.body.style.backgroundImage = `url('${userProfile.bg}')`;
        }
    }

    function doSetup() {
        const name = document.getElementById('su-user').value;
        const pass = document.getElementById('su-pass').value;
        const conf = document.getElementById('su-conf').value;
        const pfp = document.getElementById('su-pfp').value || 'https://img.icons8.com/fluency/96/user-male-circle.png';
        if(!name || !pass) return alert('Missing info');
        if(pass !== conf) return alert('Passwords do not match');
        
        userProfile = { name, pass, pfp, bg: '' };
        localStorage.setItem('yasu_user', JSON.stringify(userProfile));
        unlockOS();
    }

    function doLogin() {
        if(document.getElementById('ls-pass').value === userProfile.pass) unlockOS();
        else {
             document.getElementById('ls-pass').style.border = '1px solid red';
             notify('System', 'Incorrect Password'); 
        }
    }

    function unlockOS() {
        document.getElementById('auth-layer').style.opacity = 0;
        setTimeout(() => document.getElementById('auth-layer').style.display='none', 600);
        document.getElementById('os-interface').style.opacity = 1;
        document.getElementById('os-interface').style.pointerEvents = 'all';
        renderDesktop();
        renderStartMenu();
        notify('Welcome', `Logged in as ${userProfile.name}`);
    }

    /* --- WINDOW MANAGER --- */
    function openApp(id) {
        if(document.getElementById(`win-${id}`)) {
            toggleMinimize(id);
            return;
        }
        const app = DEFAULT_APPS.find(a => a.id === id);
        if(!app) return;

        const win = document.createElement('div');
        win.className = 'window';
        win.id = `win-${id}`;
        win.style.display = 'flex';
        
        win.innerHTML = `
            <div class="title-bar" onmousedown="dragWindow(event, '${win.id}')">
                <div class="controls">
                    <button class="ctl-btn close" onclick="closeWindow('${id}')"></button>
                    <button class="ctl-btn min" onclick="toggleMinimize('${id}')"></button>
                    <button class="ctl-btn max" onclick="toggleMaximize('${id}')"></button>
                </div>
                <span>${app.name}</span>
                <div style="width:40px"></div>
            </div>
            <div class="content" id="content-${id}"></div>
            <div class="resize-handle" onmousedown="resizeWindow(event, '${win.id}')"></div>
        `;

        document.body.appendChild(win);
        renderContent(id);
        addToTaskbar(id);
        win.style.animation = 'fadeInUp 0.3s forwards';
    }

    function closeWindow(id) {
        const win = document.getElementById(`win-${id}`);
        win.style.opacity = 0;
        setTimeout(() => win.remove(), 200);
        const icon = document.getElementById(`tb-${id}`);
        if(icon) icon.remove();
    }

    function toggleMinimize(id) {
        const win = document.getElementById(`win-${id}`);
        const tbIcon = document.getElementById(`tb-${id}`);
        if(win.style.display === 'none') {
            win.style.display = 'flex';
            win.style.opacity = 1;
            tbIcon.classList.add('active');
            win.style.zIndex = 100 + document.querySelectorAll('.window').length; 
        } else {
            win.style.display = 'none';
            tbIcon.classList.remove('active');
        }
    }

    function toggleMaximize(id) {
        const win = document.getElementById(`win-${id}`);
        win.classList.toggle('maximized');
    }

    function addToTaskbar(id) {
        const app = DEFAULT_APPS.find(a => a.id === id);
        const tb = document.getElementById('taskbar-list');
        const img = document.createElement('img');
        img.src = app.icon;
        img.id = `tb-${id}`;
        img.className = 'active';
        img.onclick = () => toggleMinimize(id);
        tb.appendChild(img);
    }

    /* --- APP CONTENT RENDERER --- */
    function renderContent(id) {
        const container = document.getElementById(`content-${id}`);
        
        if(id === 'files') {
            container.innerHTML = `
                <div class="win10-explorer">
                    <div class="ribbon">
                        <div class="ribbon-tabs">
                            <div class="r-tab" style="background:#1979ca;color:white;border:none;">File</div>
                            <div class="r-tab active">Home</div>
                            <div class="r-tab">Share</div>
                            <div class="r-tab">View</div>
                        </div>
                        <div class="ribbon-toolbar">
                            <div class="r-btn" onclick="w10CreateFolder()">
                                <i class="fas fa-folder-plus" style="color:#f8d775"></i><span>New folder</span>
                            </div>
                            <div class="r-btn" onclick="w10Delete()">
                                <i class="fas fa-times" style="color:#ff5f56"></i><span>Delete</span>
                            </div>
                            <div class="r-btn">
                                <i class="fas fa-i-cursor"></i><span>Rename</span>
                            </div>
                        </div>
                    </div>
                    <div class="address-row">
                        <div class="nav-arrows">
                            <i class="fas fa-arrow-left"></i>
                            <i class="fas fa-arrow-right"></i>
                            <i class="fas fa-arrow-up" onclick="w10NavUp()"></i>
                        </div>
                        <div class="address-bar">
                            <i class="fas fa-desktop"></i>
                            <span id="w10-path">This PC</span>
                        </div>
                        <input type="text" class="search-box" placeholder="Search This PC">
                    </div>
                    <div class="explorer-body">
                        <div class="nav-pane">
                            <div class="nav-group-title">Quick access</div>
                            <div class="nav-item" onclick="w10Nav('Documents')"><i class="fas fa-file-alt nav-icon-blue"></i> Documents</div>
                            <div class="nav-item" onclick="w10Nav('Downloads')"><i class="fas fa-arrow-down nav-icon-blue"></i> Downloads</div>
                            <div class="nav-item" onclick="w10Nav('Pictures')"><i class="fas fa-image nav-icon-blue"></i> Pictures</div>
                            <div class="nav-group-title" style="margin-top:10px;">This PC</div>
                            <div class="nav-item active"><i class="fas fa-laptop nav-icon-blue"></i> Local Disk (C:)</div>
                        </div>
                        <div class="main-pane" id="w10-grid"></div>
                    </div>
                    <div class="status-bar" id="w10-status">0 items</div>
                </div>
            `;
            w10Refresh();
        } else if (id === 'browser') {
            container.innerHTML = `
                <div class="browser-tabs" id="btabs-${id}">
                    <div class="b-tab active">New Tab</div>
                    <div class="b-tab" onclick="addBrowserTab('${id}')">+</div>
                </div>
                <div class="browser-bar">
                    <i class="fas fa-arrow-left" style="cursor:pointer" onclick="document.getElementById('bf-${id}').contentWindow.history.back()"></i>
                    <i class="fas fa-redo" style="cursor:pointer" onclick="document.getElementById('bf-${id}').contentWindow.location.reload()"></i>
                    <input type="text" style="flex-grow:1;padding:5px;border-radius:15px;border:1px solid #ccc;" id="burl-${id}" placeholder="Search Google or enter URL">
                    <button onclick="navBrowser('${id}')">Go</button>
                </div>
                <iframe id="bf-${id}" class="browser-frame" src="https://www.google.com/webhp?igu=1"></iframe>
            `;
        } else if (id === 'tasks') {
            container.innerHTML = `
                <div class="task-input">
                    <input type="text" id="new-task" style="flex-grow:1;padding:8px;" placeholder="Add a task...">
                    <button onclick="addTask()">Add</button>
                </div>
                <div class="task-list" id="task-list"></div>
            `;
            renderTasks();
        } else if (id === 'terminal') {
            container.innerHTML = `
                <div class="terminal-win" onclick="document.getElementById('term-in').focus()">
                    <div class="term-out" id="term-out"></div>
                    <div class="term-input-line">
                        <span class="term-prompt">${userProfile.name}@yasu:~$</span>
                        <input type="text" class="term-in" id="term-in" onkeydown="termInput(this, event)" autocomplete="off" autofocus>
                    </div>
                </div>
            `;
            printTerm(`Welcome to Yasu OS Terminal v2.0\nType 'help' for commands.\n`);
        } else if (id === 'notepad') {
            container.innerHTML = `<textarea style="width:100%;height:100%;border:none;padding:10px;resize:none;outline:none;" placeholder="Type here..."></textarea>`;
        } else if (id === 'settings') {
            container.innerHTML = `<div style="padding:20px"><h3>Settings</h3><p>Background Image URL:</p><input id="bg-set" style="width:100%;padding:5px;"><button onclick="saveBg()">Save</button></div>`;
        } else if (id === 'vscode') {
            container.innerHTML = `<iframe src="https://vscode.dev" style="width:100%;height:100%;border:none;"></iframe>`;
        } else if (id === 'calc') {
            container.innerHTML = `<iframe src="https://www.desmos.com/scientific" style="width:100%;height:100%;border:none;"></iframe>`;
        }
    }

    /* --- FILE EXPLORER WIN 10 LOGIC --- */
    let w10Path = ['root'];
    let w10Selected = null;
    function getDir(pathArr) { let ref = fileSystem; pathArr.forEach(p => { if(ref[p]) ref = ref[p]; }); return ref; }
    function w10Refresh() {
        const grid = document.getElementById('w10-grid'); if(!grid) return;
        grid.innerHTML = '<div class="file-grid-view" id="w10-icons"></div>';
        const target = document.getElementById('w10-icons');
        const currentDir = getDir(w10Path); const keys = Object.keys(currentDir);
        document.getElementById('w10-path').innerText = w10Path.length > 1 ? w10Path[w10Path.length-1] : 'This PC';
        document.getElementById('w10-status').innerText = `${keys.length} items`;
        keys.forEach(key => {
            const el = document.createElement('div'); el.className = 'w-file';
            const isObj = typeof currentDir[key] === 'object';
            el.onclick = (e) => {
                e.stopPropagation(); document.querySelectorAll('.w-file').forEach(x => x.classList.remove('selected'));
                el.classList.add('selected'); w10Selected = key;
                document.getElementById('w10-status').innerText = `${keys.length} items | 1 item selected`;
            }
            el.ondblclick = () => { if(isObj) { w10Path.push(key); w10Refresh(); } else { alert(`Opening ${key}...`); } };
            let iconHtml = isObj ? `<i class="fas fa-folder" style="color:#f8d775"></i>` : `<i class="fas fa-file" style="color:#aaa"></i>`;
            el.innerHTML = `${iconHtml}<span>${key}</span>`; target.appendChild(el);
        });
        document.querySelector('.main-pane').onclick = () => { document.querySelectorAll('.w-file').forEach(x => x.classList.remove('selected')); w10Selected = null; document.getElementById('w10-status').innerText = `${keys.length} items`; }
    }
    function w10Nav(folderName) { w10Path = ['root', folderName]; if(!fileSystem.root[folderName]) fileSystem.root[folderName] = {}; w10Refresh(); }
    function w10NavUp() { if(w10Path.length > 1) { w10Path.pop(); w10Refresh(); } }
    function w10CreateFolder() { const name = prompt("New Folder Name:", "New Folder"); if(name) { const dir = getDir(w10Path); dir[name] = {}; saveFS(); w10Refresh(); } }
    function w10Delete() { if(w10Selected) { const dir = getDir(w10Path); delete dir[w10Selected]; w10Selected = null; saveFS(); w10Refresh(); } else { alert("Select an item to delete."); } }
    function saveFS() { localStorage.setItem('yasu_fs', JSON.stringify(fileSystem)); }

    /* --- APP LOGIC: BROWSER --- */
    function navBrowser(id) {
        const val = document.getElementById(`burl-${id}`).value;
        const frame = document.getElementById(`bf-${id}`);
        if(val.includes('.')) frame.src = val.startsWith('http') ? val : 'https://' + val;
        else frame.src = `https://www.google.com/search?q=${encodeURIComponent(val)}&igu=1`;
    }

    /* --- APP LOGIC: TASKS --- */
    function renderTasks() {
        const list = document.getElementById('task-list');
        const tasks = JSON.parse(localStorage.getItem('yasu_tasks') || '[]');
        list.innerHTML = '';
        tasks.forEach((t, i) => {
            list.innerHTML += `<div class="task-row"><input type="checkbox" ${t.done?'checked':''} onclick="toggleTask(${i})"><span style="${t.done?'text-decoration:line-through;color:#aaa':''}">${t.text}</span><button onclick="delTask(${i})" style="margin-left:auto;color:red;border:none;background:none;">x</button></div>`;
        });
    }
    function addTask() {
        const txt = document.getElementById('new-task').value; if(!txt) return;
        const tasks = JSON.parse(localStorage.getItem('yasu_tasks') || '[]');
        tasks.push({text:txt, done:false}); localStorage.setItem('yasu_tasks', JSON.stringify(tasks));
        document.getElementById('new-task').value = ''; renderTasks();
    }
    function toggleTask(i) { const tasks = JSON.parse(localStorage.getItem('yasu_tasks')); tasks[i].done = !tasks[i].done; localStorage.setItem('yasu_tasks', JSON.stringify(tasks)); renderTasks(); }
    function delTask(i) { const tasks = JSON.parse(localStorage.getItem('yasu_tasks')); tasks.splice(i, 1); localStorage.setItem('yasu_tasks', JSON.stringify(tasks)); renderTasks(); }

    /* --- TERMINAL --- */
    let termHistory = [];
    let termHistoryIndex = -1;
    function printTerm(text) {
        const out = document.getElementById('term-out');
        if(out) { out.innerHTML += text; out.scrollTop = out.scrollHeight; }
    }
    function termInput(el, e) {
        if (e.key === 'ArrowUp') { e.preventDefault(); if (termHistoryIndex > 0) { termHistoryIndex--; el.value = termHistory[termHistoryIndex]; } } 
        else if (e.key === 'ArrowDown') { e.preventDefault(); if (termHistoryIndex < termHistory.length - 1) { termHistoryIndex++; el.value = termHistory[termHistoryIndex]; } else { termHistoryIndex = termHistory.length; el.value = ''; } } 
        else if (e.key === 'Enter') {
            const cmdLine = el.value.trim();
            const parts = cmdLine.split(' ');
            const cmd = parts[0].toLowerCase();
            const args = parts.slice(1);
            printTerm(`\n<span style="color:#00ff00">${userProfile.name}@yasu:~$</span> ${cmdLine}\n`);
            if(cmdLine) { termHistory.push(cmdLine); termHistoryIndex = termHistory.length; }
            switch(cmd) {
                case 'help': printTerm(`Commands: notify [t] [m], ls, mkdir, touch, cat, fetch, clear, reboot, matrix, dev, bsod\n`); break;
                case 'clear': document.getElementById('term-out').innerHTML = ''; break;
                case 'ls': printTerm(`<span style="color:#aaa">${Object.keys(fileSystem.root).join('  ')}</span>\n`); break;
                case 'touch': if(args[0]) { fileSystem.root[args[0]] = ""; saveFS(); printTerm(`File '${args[0]}' created.\n`); if(document.getElementById('w10-grid')) w10Refresh(); } else printTerm("Usage: touch [filename]\n"); break;
                case 'mkdir': if(args[0]) { fileSystem.root[args[0]] = {}; saveFS(); printTerm(`Directory '${args[0]}' created.\n`); if(document.getElementById('w10-grid')) w10Refresh(); } else printTerm("Usage: mkdir [dirname]\n"); break;
                case 'cat': if(args[0]) { const f = fileSystem.root[args[0]]; if(typeof f==='string')printTerm(`${f}\n`); else printTerm('Err\n'); } break;
                case 'notify': 
                    if(args.length >= 2) {
                        const title = args[0];
                        const msg = args.slice(1).join(" ");
                        notify(title, msg);
                        printTerm(`Notification sent.\n`);
                    } else printTerm("Usage: notify [title] [message]\n");
                    break;
                case 'fetch': printTerm(`Yasu OS Ultimate\nKernel: Web v1.0\nUser: ${userProfile.name}\n`); break;
                case 'reboot': location.reload(); break;
                case 'matrix': alert('Follow the white rabbit...'); break;
                case 'dev': document.getElementById('dev-panel').classList.add('active'); printTerm("Dev Panel Opened.\n"); break;
                case 'bsod': document.getElementById('bsod-layer').style.display = 'block'; break;
                case '': break;
                default: printTerm(`Command not found: ${cmd}\n`);
            }
            el.value = '';
        }
    }

    /* --- UI HELPERS --- */
    function notify(title, msg) {
        if(dndMode) return;
        const area = document.getElementById('notif-area');
        const t = document.createElement('div'); t.className = 'toast';
        t.innerHTML = `<i class="fas fa-info-circle"></i> <div><strong>${title}</strong><br>${msg}</div>`;
        area.appendChild(t);
        setTimeout(() => t.classList.add('show'), 10);
        setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
    }
    function renderDesktop() {
        const d = document.getElementById('desktop-icons'); d.innerHTML = '';
        DEFAULT_APPS.forEach(app => {
            d.innerHTML += `<div class="icon" ondblclick="openApp('${app.id}')"><img src="${app.icon}"><br><span>${app.name}</span></div>`;
        });
    }
    function renderStartMenu() {
        const g = document.getElementById('start-grid'); g.innerHTML = '';
        DEFAULT_APPS.forEach(app => {
            g.innerHTML += `<div class="sm-app" onclick="openApp('${app.id}');toggleStartMenu()"><img src="${app.icon}"><span>${app.name}</span></div>`;
        });
        document.getElementById('sm-username').innerText = userProfile.name;
        document.getElementById('sm-avatar').src = userProfile.pfp;
    }
    function toggleStartMenu() { document.getElementById('start-menu').classList.toggle('active'); }
    function saveBg() { const url = document.getElementById('bg-set').value; if(url) { document.body.style.backgroundImage = `url('${url}')`; userProfile.bg = url; localStorage.setItem('yasu_user', JSON.stringify(userProfile)); } }

    /* --- WINDOW DRAG LOGIC --- */
    let isDragging = false; let startX, startY, initialLeft, initialTop;
    function dragWindow(e, id) {
        if(e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        isDragging = true;
        const win = document.getElementById(id);
        startX = e.clientX; startY = e.clientY;
        initialLeft = win.offsetLeft; initialTop = win.offsetTop;
        document.onmousemove = (ev) => {
            if(!isDragging) return;
            win.style.left = (initialLeft + ev.clientX - startX) + 'px';
            win.style.top = (initialTop + ev.clientY - startY) + 'px';
        };
        document.onmouseup = () => { isDragging = false; document.onmousemove = null; };
    }
    function resizeWindow(e, id) {
        const win = document.getElementById(id);
        const startW = win.offsetWidth; const startH = win.offsetHeight;
        const startX = e.clientX; const startY = e.clientY;
        e.stopPropagation();
        document.onmousemove = (ev) => {
            win.style.width = (startW + ev.clientX - startX) + 'px';
            win.style.height = (startH + ev.clientY - startY) + 'px';
        };
        document.onmouseup = () => { document.onmousemove = null; };
    }
    function devForceUnlock() { unlockOS(); }

    /* --- SENTINEL AUDIO LOGIC --- */
    const trackList = [
        { title: "VIGILANTE", artist: "Praz Khanal", file: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=phonk-music-112624.mp3" },
        { title: "MIDNIGHT TOKYO", artist: "Audiogreen", file: "https://cdn.pixabay.com/download/audio/2022/06/27/audio_50827a6806.mp3?filename=phonk-115883.mp3" },
        { title: "GRAVE RAVE", artist: "QubeSounds", file: "https://cdn.pixabay.com/download/audio/2022/11/22/audio_febc508520.mp3?filename=trap-action-energetic-127421.mp3" },
        { title: "DOOM SLAYER", artist: "AlexiAction", file: "https://cdn.pixabay.com/download/audio/2023/08/03/audio_4a681647c4.mp3?filename=scary-phonk-161340.mp3" },
        { title: "HYPER DRIFT", artist: "RoyaltyFree", file: "https://cdn.pixabay.com/download/audio/2023/04/21/audio_1125d33697.mp3?filename=drift-phonk-147222.mp3" }
    ];
    let currentIdx = 0; let isPlaying = false;
    let audioCtx, analyser, source;

    function renderPlaylist() {
        const list = document.getElementById('playlist-list');
        list.innerHTML = '';
        trackList.forEach((track, index) => {
            const div = document.createElement('div'); 
            div.className = `pl-item ${index === currentIdx ? 'active' : ''}`;
            div.onclick = () => loadTrack(index);
            div.innerHTML = `<span class="pl-title">${track.title}</span><div class="pl-anim"><div class="bar"></div><div class="bar"></div><div class="bar"></div></div>`;
            list.appendChild(div);
        });
    }
    function loadTrack(index) {
        if (index < 0) index = trackList.length - 1; if (index >= trackList.length) index = 0;
        currentIdx = index;
        const track = trackList[currentIdx];
        audio.src = track.file;
        document.getElementById('track-title').innerText = track.title; document.getElementById('track-artist').innerText = track.artist;
        renderPlaylist();
        if(isPlaying) { playIcon.className = 'fas fa-circle-notch fa-spin'; audio.play().then(() => playIcon.className = 'fas fa-pause'); }
    }
    function setupAudioContext() {
        if(audioCtx) return;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        source = audioCtx.createMediaElementSource(audio);
        source.connect(analyser); analyser.connect(audioCtx.destination); analyser.fftSize = 128;
    }
    function togglePlay() {
        if (!audio.src) loadTrack(0);
        if (!audioCtx) setupAudioContext();
        if (audio.paused) { audio.play(); isPlaying = true; playIcon.className = 'fas fa-pause'; loop(); }
        else { audio.pause(); isPlaying = false; playIcon.className = 'fas fa-play'; }
    }
    function changeTrack(direction) { loadTrack(currentIdx + direction); if(!isPlaying) togglePlay(); }
    audio.addEventListener('ended', () => changeTrack(1));
    function loop() {
        if(!isPlaying) return; requestAnimationFrame(loop);
        const canvas = document.getElementById('viz-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.parentElement.clientWidth; canvas.height = canvas.parentElement.clientHeight;
        const w = canvas.width; const h = canvas.height;
        const bufferLength = analyser.frequencyBinCount; const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, w, h);
        const barWidth = (w / bufferLength) * 1.5; let x = 0;
        for(let i = 0; i < bufferLength; i++) {
            let val = dataArray[i]; if (i < 8) val *= 1.2; 
            const barHeight = (val / 255) * (h * 0.75);
            const gradient = ctx.createLinearGradient(0, h/2 - barHeight/2, 0, h/2 + barHeight/2);
            gradient.addColorStop(0, 'rgba(157, 78, 221, 0.8)'); gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)'); gradient.addColorStop(1, 'rgba(157, 78, 221, 0.8)');
            ctx.fillStyle = gradient; ctx.beginPath();
            const y = (h - barHeight) / 2; ctx.roundRect(x, y, barWidth - 2, barHeight, 4); ctx.fill();
            x += barWidth;
        }
    }
    renderPlaylist();
    document.getElementById('track-title').innerText = trackList[0].title;
    document.getElementById('track-artist').innerText = trackList[0].artist;
