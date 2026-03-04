const friendListEl = document.getElementById('friendList');
const groupListEl = document.getElementById('groupList');
const memberListEl = document.getElementById('memberList');
const searchInput = document.getElementById('searchInput');

const roomTitle = document.getElementById('roomTitle');
const roomSubtitle = document.getElementById('roomSubtitle');
const activeName = document.getElementById('activeName');
const activeAvatar = document.getElementById('activeAvatar');
const latencyEl = document.getElementById('latency');
const statusEl = document.getElementById('status');
const timerEl = document.getElementById('timer');

const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const micToggleBtn = document.getElementById('micToggleBtn');
const speakerToggleBtn = document.getElementById('speakerToggleBtn');
const pttBtn = document.getElementById('pttBtn');

const addFriendBtn = document.getElementById('addFriendBtn');
const newGroupBtn = document.getElementById('newGroupBtn');
const openSettingsBtn = document.getElementById('openSettingsBtn');

const addFriendModal = document.getElementById('addFriendModal');
const newGroupModal = document.getElementById('newGroupModal');
const settingsModal = document.getElementById('settingsModal');

const friendNickInput = document.getElementById('friendNickInput');
const friendKeyInput = document.getElementById('friendKeyInput');
const saveFriendBtn = document.getElementById('saveFriendBtn');

const groupNameInput = document.getElementById('groupNameInput');
const groupMembersInput = document.getElementById('groupMembersInput');
const saveGroupBtn = document.getElementById('saveGroupBtn');

const myNickLabel = document.getElementById('myNick');
const myKeyLabel = document.getElementById('myKey');
const myAvatar = document.getElementById('myAvatar');
const myNickInput = document.getElementById('myNickInput');
const myKeyInput = document.getElementById('myKeyInput');
const signalServerInput = document.getElementById('signalServerInput');
const micDeviceSelect = document.getElementById('micDeviceSelect');
const pttModeInput = document.getElementById('pttModeInput');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');

const toast = document.getElementById('toast');

const state = {
  me: {
    nick: localStorage.getItem('nx_me_nick') || 'Nexus User',
    key: localStorage.getItem('nx_me_key') || 'NX-8A2B99',
    server: localStorage.getItem('nx_signal_server') || 'http://127.0.0.1:8080',
  },
  pttMode: localStorage.getItem('nx_ptt_mode') === '1',
  micEnabled: true,
  speakerEnabled: true,
  callConnected: false,
  seconds: 0,
  timerRef: null,
  selected: null,
  micStream: null,
  selectedMicId: localStorage.getItem('nx_mic_device') || '',
  friends: JSON.parse(localStorage.getItem('nx_friends') || 'null') || [
    { nick: 'Alex Dev', key: 'NX-AL3X10', online: true },
    { nick: 'MaxO', key: 'NX-MAX009', online: false },
    { nick: 'Studio Bot', key: 'NX-STU001', online: true },
  ],
  groups: JSON.parse(localStorage.getItem('nx_groups') || 'null') || [
    { name: 'Студия 1', members: ['Alex Dev', 'MaxO', 'Nexus User'] },
  ],
};

renderProfile();
renderLists();
renderMembers([]);
wireModals();
wireActions();
loadSettingsInputs();
initAudioSettings();

function wireActions() {
  searchInput.addEventListener('input', renderLists);

  addFriendBtn.addEventListener('click', () => openModal(addFriendModal));
  newGroupBtn.addEventListener('click', () => openModal(newGroupModal));
  openSettingsBtn.addEventListener('click', () => openModal(settingsModal));

  saveFriendBtn.addEventListener('click', addFriendFromModal);
  saveGroupBtn.addEventListener('click', addGroupFromModal);
  saveSettingsBtn.addEventListener('click', saveSettings);

  connectBtn.addEventListener('click', connectCall);
  disconnectBtn.addEventListener('click', disconnectCall);

  micToggleBtn.addEventListener('click', async () => {
    state.micEnabled = !state.micEnabled;
    micToggleBtn.classList.toggle('on', !state.micEnabled);
    await ensureMicStream();
    applyMicTrackState();
    showToast(`Микрофон ${state.micEnabled ? 'включен' : 'выключен'}`);
  });

  speakerToggleBtn.addEventListener('click', () => {
    state.speakerEnabled = !state.speakerEnabled;
    speakerToggleBtn.classList.toggle('on', !state.speakerEnabled);
    showToast(`Звук ${state.speakerEnabled ? 'включен' : 'выключен'}`);
  });

  pttBtn.addEventListener('mousedown', onPttDown);
  pttBtn.addEventListener('mouseup', onPttUp);
  pttBtn.addEventListener('mouseleave', onPttUp);
  pttBtn.addEventListener('touchstart', onPttDown, { passive: true });
  pttBtn.addEventListener('touchend', onPttUp, { passive: true });
}

function wireModals() {
  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-close');
      document.getElementById(id).classList.add('hidden');
    });
  });

  [addFriendModal, newGroupModal, settingsModal].forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  });
}

function renderProfile() {
  myNickLabel.textContent = state.me.nick;
  myKeyLabel.textContent = state.me.key;
  myAvatar.textContent = initials(state.me.nick);
}

function renderLists() {
  const q = searchInput.value.trim().toLowerCase();
  const filteredFriends = state.friends.filter((f) =>
    f.nick.toLowerCase().includes(q) || f.key.toLowerCase().includes(q),
  );
  const filteredGroups = state.groups.filter((g) => g.name.toLowerCase().includes(q));

  friendListEl.innerHTML = '';
  filteredFriends.forEach((f) => {
    const li = document.createElement('li');
    li.className = 'item';
    if (state.selected && state.selected.type === 'friend' && state.selected.name === f.nick) {
      li.classList.add('active');
    }
    li.innerHTML = `
      <div class="item-left">
        <div class="avatar small">${initials(f.nick)}</div>
        <div class="item-meta">
          <strong>${escapeHtml(f.nick)}</strong>
          <span>${escapeHtml(f.key)}</span>
        </div>
      </div>
      <span class="dot ${f.online ? 'online' : ''}"></span>
    `;
    li.onclick = () => selectFriend(f);
    friendListEl.appendChild(li);
  });

  groupListEl.innerHTML = '';
  filteredGroups.forEach((g) => {
    const li = document.createElement('li');
    li.className = 'item';
    if (state.selected && state.selected.type === 'group' && state.selected.name === g.name) {
      li.classList.add('active');
    }
    li.innerHTML = `
      <div class="item-left">
        <div class="avatar small">#</div>
        <div class="item-meta">
          <strong>${escapeHtml(g.name)}</strong>
          <span>${g.members.length} участников</span>
        </div>
      </div>
      <span class="dot online"></span>
    `;
    li.onclick = () => selectGroup(g);
    groupListEl.appendChild(li);
  });
}

function selectFriend(friend) {
  state.selected = { type: 'friend', name: friend.nick };
  roomTitle.textContent = friend.nick;
  roomSubtitle.textContent = `Личный звонок • ${friend.key}`;
  activeName.textContent = friend.nick;
  activeAvatar.textContent = initials(friend.nick);
  latencyEl.textContent = `P2P • ${friend.online ? randomMs() : '--'} ms`;
  statusEl.textContent = `Статус: ${friend.online ? 'готов к звонку' : 'не в сети'}`;
  renderMembers([friend.nick, state.me.nick]);
  renderLists();
}

function selectGroup(group) {
  state.selected = { type: 'group', name: group.name };
  roomTitle.textContent = group.name;
  roomSubtitle.textContent = `Групповой звонок • ${group.members.length} участников`;
  activeName.textContent = group.name;
  activeAvatar.textContent = '#';
  latencyEl.textContent = `P2P Mesh • ${randomMs()} ms`;
  statusEl.textContent = 'Статус: группа готова к звонку';
  renderMembers(group.members);
  renderLists();
}

function renderMembers(names) {
  memberListEl.innerHTML = '';
  if (!names.length) {
    const li = document.createElement('li');
    li.className = 'member';
    li.textContent = 'Нет выбранного канала';
    memberListEl.appendChild(li);
    return;
  }

  names.forEach((name) => {
    const li = document.createElement('li');
    li.className = 'member';
    li.innerHTML = `<span>${escapeHtml(name)}</span><span class="dot online"></span>`;
    memberListEl.appendChild(li);
  });
}

function addFriendFromModal() {
  const nick = friendNickInput.value.trim();
  const key = friendKeyInput.value.trim().toUpperCase();

  if (!nick || !/^NX-[A-Z0-9]{6}$/.test(key)) {
    showToast('Укажи ник и корректный ключ NX-XXXXXX');
    return;
  }

  const exists = state.friends.some((f) => f.nick.toLowerCase() === nick.toLowerCase() || f.key === key);
  if (exists) {
    showToast('Такой пользователь уже есть');
    return;
  }

  state.friends.push({ nick, key, online: Math.random() > 0.35 });
  localStorage.setItem('nx_friends', JSON.stringify(state.friends));
  friendNickInput.value = '';
  friendKeyInput.value = '';
  addFriendModal.classList.add('hidden');
  renderLists();
  showToast(`Добавлен: ${nick}`);
}

function addGroupFromModal() {
  const name = groupNameInput.value.trim();
  const members = groupMembersInput.value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  if (!name) {
    showToast('Укажи название группы');
    return;
  }

  if (!members.length) {
    showToast('Добавь хотя бы одного участника');
    return;
  }

  if (!members.includes(state.me.nick)) members.push(state.me.nick);

  state.groups.push({ name, members });
  localStorage.setItem('nx_groups', JSON.stringify(state.groups));
  groupNameInput.value = '';
  groupMembersInput.value = '';
  newGroupModal.classList.add('hidden');
  renderLists();
  showToast(`Группа ${name} создана`);
}

function openModal(modal) {
  modal.classList.remove('hidden');
}

function loadSettingsInputs() {
  myNickInput.value = state.me.nick;
  myKeyInput.value = state.me.key;
  signalServerInput.value = state.me.server;
  pttModeInput.checked = state.pttMode;
  pttBtn.classList.toggle('on', state.pttMode);
}

function saveSettings() {
  const nick = myNickInput.value.trim();
  const key = myKeyInput.value.trim().toUpperCase();
  const server = signalServerInput.value.trim();

  if (!nick || !/^NX-[A-Z0-9]{6}$/.test(key) || !server) {
    showToast('Проверь ник, ключ и сервер');
    return;
  }

  state.me.nick = nick;
  state.me.key = key;
  state.me.server = server;
  state.pttMode = pttModeInput.checked;

  localStorage.setItem('nx_me_nick', nick);
  localStorage.setItem('nx_me_key', key);
  localStorage.setItem('nx_signal_server', server);
  localStorage.setItem('nx_ptt_mode', state.pttMode ? '1' : '0');

  renderProfile();
  settingsModal.classList.add('hidden');
  pttBtn.classList.toggle('on', state.pttMode);
  showToast('Настройки сохранены');
}

function connectCall() {
  if (!state.selected) {
    showToast('Сначала выбери друга или группу');
    return;
  }

  state.callConnected = true;
  statusEl.textContent = 'Статус: подключено';
  startTimer();
  ensureMicStream();
  showToast('Соединение установлено');
}

function disconnectCall() {
  state.callConnected = false;
  statusEl.textContent = 'Статус: отключено';
  stopTimer();
  showToast('Соединение завершено');
}

function startTimer() {
  stopTimer();
  state.seconds = 0;
  timerEl.textContent = '00:00';
  state.timerRef = setInterval(() => {
    state.seconds += 1;
    const mm = String(Math.floor(state.seconds / 60)).padStart(2, '0');
    const ss = String(state.seconds % 60).padStart(2, '0');
    timerEl.textContent = `${mm}:${ss}`;
  }, 1000);
}

function stopTimer() {
  if (state.timerRef) clearInterval(state.timerRef);
  state.timerRef = null;
  timerEl.textContent = '00:00';
}

async function initAudioSettings() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('MediaDevices API недоступен');
    return;
  }

  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    await refreshMicrophones();
  } catch (err) {
    showToast('Нет доступа к микрофону');
  }

  micDeviceSelect.addEventListener('change', async () => {
    state.selectedMicId = micDeviceSelect.value;
    localStorage.setItem('nx_mic_device', state.selectedMicId);
    await ensureMicStream(true);
    showToast('Микрофон переключен');
  });
}

async function refreshMicrophones() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const microphones = devices.filter((d) => d.kind === 'audioinput');

  micDeviceSelect.innerHTML = '';
  microphones.forEach((m, idx) => {
    const opt = document.createElement('option');
    opt.value = m.deviceId;
    opt.textContent = m.label || `Микрофон ${idx + 1}`;
    micDeviceSelect.appendChild(opt);
  });

  if (state.selectedMicId) {
    micDeviceSelect.value = state.selectedMicId;
  }
}

async function ensureMicStream(forceRestart = false) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

  if (state.micStream && !forceRestart) return;

  if (state.micStream && forceRestart) {
    state.micStream.getTracks().forEach((t) => t.stop());
    state.micStream = null;
  }

  const audio = state.selectedMicId
    ? { deviceId: { exact: state.selectedMicId } }
    : true;

  try {
    state.micStream = await navigator.mediaDevices.getUserMedia({ audio });
    applyMicTrackState();
  } catch (err) {
    showToast('Ошибка инициализации микрофона');
  }
}

function applyMicTrackState() {
  if (!state.micStream) return;
  const track = state.micStream.getAudioTracks()[0];
  if (!track) return;

  if (!state.callConnected) {
    track.enabled = false;
    return;
  }

  if (state.pttMode) {
    track.enabled = false;
    return;
  }

  track.enabled = state.micEnabled;
}

function onPttDown() {
  if (!state.callConnected || !state.pttMode || !state.micStream) return;
  const track = state.micStream.getAudioTracks()[0];
  if (!track) return;
  track.enabled = true;
  pttBtn.classList.add('on');
  statusEl.textContent = 'Статус: говоришь...';
}

function onPttUp() {
  if (!state.pttMode || !state.micStream) return;
  const track = state.micStream.getAudioTracks()[0];
  if (!track) return;
  track.enabled = false;
  pttBtn.classList.remove('on');
  statusEl.textContent = state.callConnected ? 'Статус: подключено' : 'Статус: ожидание';
}

function randomMs() {
  return 9 + Math.floor(Math.random() * 22);
}

function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join('') || 'NX';
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.remove('hidden');
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => toast.classList.add('hidden'), 2000);
}

function escapeHtml(str) {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
