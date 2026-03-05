const dmList = document.getElementById('dmList');
const serverList = document.getElementById('serverList');
const textChannelList = document.getElementById('textChannelList');
const voiceChannelList = document.getElementById('voiceChannelList');
const membersList = document.getElementById('membersList');
const channelSection = document.getElementById('channelSection');

const homeBtn = document.getElementById('homeBtn');
const createServerBtn = document.getElementById('createServerBtn');
const settingsBtn = document.getElementById('settingsBtn');
const addFriendBtn = document.getElementById('addFriendBtn');
const createChannelBtn = document.getElementById('createChannelBtn');
const addMemberBtn = document.getElementById('addMemberBtn');

const searchInput = document.getElementById('searchInput');
const scopeTitle = document.getElementById('scopeTitle');
const mainTitle = document.getElementById('mainTitle');
const mainSubtitle = document.getElementById('mainSubtitle');
const activeName = document.getElementById('activeName');
const activeAvatar = document.getElementById('activeAvatar');
const activeMeta = document.getElementById('activeMeta');
const statusEl = document.getElementById('status');
const timerEl = document.getElementById('timer');
const voiceModeHint = document.getElementById('voiceModeHint');
const voiceView = document.getElementById('voiceView');
const textView = document.getElementById('textView');
const textCallState = document.getElementById('textCallState');
const textCallMeta = document.getElementById('textCallMeta');
const textCallTimer = document.getElementById('textCallTimer');
const textCallStatus = document.getElementById('textCallStatus');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const serverMenu = document.getElementById('serverMenu');
const serverMenuDeleteBtn = document.getElementById('serverMenuDeleteBtn');
const friendMenu = document.getElementById('friendMenu');
const friendVolumeRange = document.getElementById('friendVolumeRange');
const friendVolumeValue = document.getElementById('friendVolumeValue');

const myAvatar = document.getElementById('myAvatar');
const myNickLabel = document.getElementById('myNickLabel');
const myCodeLabel = document.getElementById('myCodeLabel');

const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');

const modalAddFriend = document.getElementById('modalAddFriend');
const modalCreateServer = document.getElementById('modalCreateServer');
const modalCreateChannel = document.getElementById('modalCreateChannel');
const modalSettings = document.getElementById('modalSettings');
const modalAddMember = document.getElementById('modalAddMember');
const modalIncomingCall = document.getElementById('modalIncomingCall');
const modalDeleteServer = document.getElementById('modalDeleteServer');
const modalUpdate = document.getElementById('modalUpdate');

const friendNickInput = document.getElementById('friendNickInput');
const friendCodeInput = document.getElementById('friendCodeInput');
const saveFriendBtn = document.getElementById('saveFriendBtn');

const serverNameInput = document.getElementById('serverNameInput');
const defaultTextInput = document.getElementById('defaultTextInput');
const defaultVoiceInput = document.getElementById('defaultVoiceInput');
const saveServerBtn = document.getElementById('saveServerBtn');

const channelNameInput = document.getElementById('channelNameInput');
const channelTypeSelect = document.getElementById('channelTypeSelect');
const saveChannelBtn = document.getElementById('saveChannelBtn');

const memberCodeInput = document.getElementById('memberCodeInput');
const saveMemberBtn = document.getElementById('saveMemberBtn');
const incomingCallText = document.getElementById('incomingCallText');
const acceptCallBtn = document.getElementById('acceptCallBtn');
const declineCallBtn = document.getElementById('declineCallBtn');
const deleteServerText = document.getElementById('deleteServerText');
const deleteServerYesBtn = document.getElementById('deleteServerYesBtn');
const deleteServerNoBtn = document.getElementById('deleteServerNoBtn');
const updateVersionText = document.getElementById('updateVersionText');
const updateNotesText = document.getElementById('updateNotesText');
const updateProgressFill = document.getElementById('updateProgressFill');
const updateProgressText = document.getElementById('updateProgressText');
const updateDownloadBtn = document.getElementById('updateDownloadBtn');
const updateInstallBtn = document.getElementById('updateInstallBtn');
const updateLaterBtn = document.getElementById('updateLaterBtn');

const myNickInput = document.getElementById('myNickInput');
const myCodeInput = document.getElementById('myCodeInput');
const signalServerInput = document.getElementById('signalServerInput');
const inputDeviceSelect = document.getElementById('inputDeviceSelect');
const outputDeviceSelect = document.getElementById('outputDeviceSelect');
const voiceModeSelect = document.getElementById('voiceModeSelect');
const pttKeyInput = document.getElementById('pttKeyInput');
const pttKeyRow = document.getElementById('pttKeyRow');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');

const sinkProbe = document.getElementById('sinkProbe');
const remoteAudio = document.getElementById('remoteAudio');
const toast = document.getElementById('toast');

const NET_TUNE = {
  incomingPollMs: 700,
  answerPollMs: 350,
  groupLinkPollMs: 900,
  chatPollMs: 850,
  iceGatherTimeoutMs: 2500,
  fetchTimeoutMs: 5000,
  fetchRetry: 1,
  presencePushMs: 12000,
  onlinePollMs: 7000,
  groupSyncMs: 3000,
};

const bootstrapCode = localStorage.getItem('nx_me_code') || createUniqueCode();
const bootstrapFriends = sanitizeFriends(safeJson('nx_friends') || []);
const bootstrapTextMessages = safeJson('nx_text_messages') || {};
const bootstrapChatSeen = safeJson('nx_chat_seen') || {};
const bootstrapFriendVolumes = safeJson('nx_friend_volumes') || {};
const bootstrapServers = safeJson('nx_servers') || [];

const state = {
  me: {
    nick: localStorage.getItem('nx_me_nick') || 'nizamvoice user',
    code: bootstrapCode,
    server: localStorage.getItem('nx_signal_server') || 'http://127.0.0.1:8080',
  },
  friends: bootstrapFriends,
  servers: normalizeServers(bootstrapServers, bootstrapCode, bootstrapFriends),
  selectedScope: 'home',
  selectedServerId: null,
  selectedTarget: null,
  callConnected: false,
  sec: 0,
  timerRef: null,
  micStream: null,
  inputDeviceId: localStorage.getItem('nx_input_device') || '',
  outputDeviceId: localStorage.getItem('nx_output_device') || '',
  voiceMode: localStorage.getItem('nx_voice_mode') || 'open',
  pttKey: localStorage.getItem('nx_ptt_key') || 'Space',
  pttHeld: false,
  capturingPttKey: false,
  sfx: null,
  call: null,
  callToken: 0,
  callTargetKey: '',
  ringingRef: null,
  incomingCall: null,
  incomingPollRef: null,
  groupVoice: null,
  textMessages: bootstrapTextMessages,
  chatSeenTs: bootstrapChatSeen,
  friendVolumes: bootstrapFriendVolumes,
  friendMenuCode: '',
  serverMenuServerId: '',
  chatPollRef: null,
  activeChatChannelId: '',
  presenceTimerRef: null,
  onlineTimerRef: null,
  groupSyncRef: null,
  groupLinkRef: null,
  groupDialLock: false,
  groupPeers: {},
  groupPending: {},
  pingTimerRef: null,
  deleteServerConfirmResolve: null,
  updateInfo: null,
  updatePollRef: null,
  updateBusy: false,
};

localStorage.setItem('nx_me_code', state.me.code);
persist('nx_servers', state.servers);
persist('nx_friends', state.friends);
persist('nx_text_messages', state.textMessages);
persist('nx_chat_seen', state.chatSeenTs);
persist('nx_friend_volumes', state.friendVolumes);

init();

function init() {
  bindEvents();
  renderProfile();
  renderServers();
  renderHome();
  bindTextCallMirror();
  syncTextCallInfo();
  loadSettingsFields();
  renderVoiceModeHint();
  initDevices();
  startPresenceLoops();
  startGroupSyncLoop();
  void syncGroupsFromServer(true);
  startIncomingWatcher();
  void checkForAppUpdate();
}

function bindEvents() {
  homeBtn.onclick = () => {
    state.selectedScope = 'home';
    state.selectedServerId = null;
    state.selectedTarget = null;
    renderServers();
    renderHome();
  };

  createServerBtn.onclick = () => openModal(modalCreateServer);
  settingsBtn.onclick = () => openModal(modalSettings);
  addFriendBtn.onclick = () => openModal(modalAddFriend);
  createChannelBtn.onclick = () => openModal(modalCreateChannel);
  addMemberBtn.onclick = () => openModal(modalAddMember);

  saveFriendBtn.onclick = onSaveFriend;
  saveServerBtn.onclick = onSaveServer;
  saveChannelBtn.onclick = onSaveChannel;
  saveMemberBtn.onclick = onSaveMember;
  saveSettingsBtn.onclick = onSaveSettings;
  acceptCallBtn.onclick = acceptIncomingCall;
  declineCallBtn.onclick = () => rejectIncomingCall(true);
  deleteServerYesBtn.onclick = () => closeDeleteServerConfirm(true);
  deleteServerNoBtn.onclick = () => closeDeleteServerConfirm(false);
  updateDownloadBtn.onclick = onUpdateDownload;
  updateInstallBtn.onclick = onUpdateInstall;
  updateLaterBtn.onclick = () => modalUpdate.classList.add('hidden');
  serverMenuDeleteBtn.onclick = () => {
    const serverId = state.serverMenuServerId;
    closeServerMenu();
    if (!serverId) return;
    void onServerContextDelete(serverId);
  };
  sendChatBtn.onclick = sendTextMessage;
  chatInput.onkeydown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendTextMessage();
    }
  };
  friendVolumeRange.oninput = onFriendVolumeInput;

  searchInput.oninput = () => {
    if (state.selectedScope === 'home') renderDMs();
    else renderServerChannels();
  };

  connectBtn.onclick = connectCall;
  disconnectBtn.onclick = disconnectCall;

  voiceModeSelect.onchange = () => {
    pttKeyRow.classList.toggle('hidden', voiceModeSelect.value !== 'ptt');
  };

  pttKeyInput.onclick = () => {
    state.capturingPttKey = true;
    pttKeyInput.value = 'Нажми клавишу или кнопку мыши...';
  };

  document.addEventListener('keydown', onGlobalKeyDown);
  document.addEventListener('keyup', onGlobalKeyUp);
  document.addEventListener('mousedown', onGlobalMouseDown);
  document.addEventListener('mouseup', onGlobalMouseUp);
  document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });
  document.addEventListener('click', (event) => {
    if (friendMenu && !friendMenu.classList.contains('hidden') && !friendMenu.contains(event.target)) {
      closeFriendMenu();
    }
    if (serverMenu && !serverMenu.classList.contains('hidden') && !serverMenu.contains(event.target)) {
      closeServerMenu();
    }
  });

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.onclick = () => document.getElementById(btn.dataset.close).classList.add('hidden');
  });

  [modalAddFriend, modalCreateServer, modalCreateChannel, modalSettings, modalAddMember, modalIncomingCall, modalDeleteServer, modalUpdate].forEach((m) => {
    m.onclick = (e) => {
      if (e.target !== m) return;
      if (m === modalDeleteServer) {
        closeDeleteServerConfirm(false);
        return;
      }
      if (m === modalIncomingCall) {
        void rejectIncomingCall(true);
        return;
      }
      m.classList.add('hidden');
    };
  });
}

function onGlobalKeyDown(event) {
  if (state.capturingPttKey) {
    event.preventDefault();
    state.capturingPttKey = false;
    state.pttKey = event.code || event.key;
    pttKeyInput.value = humanInputKey(state.pttKey);
    showToast(`Клавиша PTT: ${humanInputKey(state.pttKey)}`);
    return;
  }

  if (state.pttKey?.startsWith('Mouse')) return;
  if (!state.callConnected || state.voiceMode !== 'ptt' || !state.micStream) return;
  if ((event.code || event.key) !== state.pttKey) return;

  if (!state.pttHeld) {
    state.pttHeld = true;
    const track = state.micStream.getAudioTracks()[0];
    if (track) track.enabled = true;
    statusEl.textContent = `Статус: говоришь (${humanInputKey(state.pttKey)})`;
    playCue('pttDown');
  }
}

function onGlobalKeyUp(event) {
  if (state.pttKey?.startsWith('Mouse')) return;
  if (!state.callConnected || state.voiceMode !== 'ptt' || !state.micStream) return;
  if ((event.code || event.key) !== state.pttKey) return;

  state.pttHeld = false;
  const track = state.micStream.getAudioTracks()[0];
  if (track) track.enabled = false;
  statusEl.textContent = getConnectedStatusText();
  playCue('pttUp');
}

function onGlobalMouseDown(event) {
  if (state.capturingPttKey) {
    event.preventDefault();
    state.capturingPttKey = false;
    state.pttKey = `Mouse${event.button}`;
    pttKeyInput.value = humanInputKey(state.pttKey);
    showToast(`Кнопка PTT: ${humanInputKey(state.pttKey)}`);
    return;
  }

  if (!state.callConnected || state.voiceMode !== 'ptt' || !state.micStream) return;
  if (state.pttKey !== `Mouse${event.button}`) return;
  if (!state.pttHeld) {
    state.pttHeld = true;
    const track = state.micStream.getAudioTracks()[0];
    if (track) track.enabled = true;
    statusEl.textContent = `Статус: говоришь (${humanInputKey(state.pttKey)})`;
    playCue('pttDown');
  }
}

function onGlobalMouseUp(event) {
  if (!state.callConnected || state.voiceMode !== 'ptt' || !state.micStream) return;
  if (state.pttKey !== `Mouse${event.button}`) return;
  state.pttHeld = false;
  const track = state.micStream.getAudioTracks()[0];
  if (track) track.enabled = false;
  statusEl.textContent = getConnectedStatusText();
  playCue('pttUp');
}

function getConnectedStatusText() {
  if (!state.callConnected) return 'Статус: отключено';
  if (state.groupVoice) return `Статус: в голосовом канале ${state.groupVoice.channel}`;
  return 'Статус: подключено';
}

function renderProfile() {
  myNickLabel.textContent = state.me.nick;
  myCodeLabel.textContent = state.me.code;
  myAvatar.textContent = initials(state.me.nick);
}

function renderVoiceModeHint() {
  if (state.voiceMode === 'ptt') {
    voiceModeHint.textContent = `Режим ввода: нажать и говорить (${humanInputKey(state.pttKey)})`;
  } else {
    voiceModeHint.textContent = 'Режим ввода: открытый микрофон';
  }
}

function showVoicePanel() {
  voiceView.classList.remove('hidden');
  textView.classList.add('hidden');
}

function showTextPanel() {
  voiceView.classList.add('hidden');
  textView.classList.remove('hidden');
  syncTextCallInfo();
}

function bindTextCallMirror() {
  const targets = [activeMeta, timerEl, statusEl].filter(Boolean);
  if (!targets.length) return;
  const observer = new MutationObserver(() => {
    syncTextCallInfo();
  });
  targets.forEach((el) => {
    observer.observe(el, { childList: true, characterData: true, subtree: true });
  });
}

function syncTextCallInfo() {
  if (!textCallState || !textCallMeta || !textCallTimer || !textCallStatus) return;
  textCallMeta.textContent = activeMeta?.textContent || 'P2P • -- ms';
  textCallTimer.textContent = timerEl?.textContent || '00:00';
  textCallStatus.textContent = statusEl?.textContent || 'Статус: ожидание';

  let stateText = 'Звонок: не идет';
  let cssClass = 'idle';
  if (state.callConnected) {
    stateText = state.groupVoice ? 'Звонок: в группе' : 'Звонок: идет';
    cssClass = 'live';
  } else if (state.call || Object.keys(state.groupPending || {}).length > 0) {
    stateText = 'Звонок: подключение...';
    cssClass = 'dialing';
  }

  textCallState.textContent = stateText;
  textCallState.classList.remove('idle', 'live', 'dialing');
  textCallState.classList.add(cssClass);
}

function renderServers() {
  serverList.innerHTML = '';
  state.servers.forEach((srv) => {
    const btn = document.createElement('button');
    btn.className = 'server-btn';
    if (state.selectedScope === 'server' && state.selectedServerId === srv.id) btn.classList.add('active');
    btn.textContent = initials(srv.name);
    btn.title = srv.name;
    btn.onclick = () => selectServer(srv.id);
    btn.oncontextmenu = (event) => {
      event.preventDefault();
      event.stopPropagation();
      openServerMenu(srv, event.clientX, event.clientY);
    };
    serverList.appendChild(btn);
  });

  homeBtn.classList.toggle('active', state.selectedScope === 'home');
}

function openServerMenu(server, x, y) {
  if (!serverMenu || !serverMenuDeleteBtn) return;
  closeFriendMenu();

  state.serverMenuServerId = server.id;
  const canDelete = server.creatorCode === state.me.code;
  serverMenuDeleteBtn.disabled = !canDelete;
  serverMenuDeleteBtn.textContent = canDelete
    ? 'Удалить группу'
    : 'Удалить группу (только создатель)';

  serverMenu.classList.remove('hidden');
  const menuW = 230;
  const menuH = 58;
  const left = Math.min(x, window.innerWidth - menuW - 8);
  const top = Math.min(y, window.innerHeight - menuH - 8);
  serverMenu.style.left = `${Math.max(8, left)}px`;
  serverMenu.style.top = `${Math.max(8, top)}px`;
}

function closeServerMenu() {
  if (!serverMenu) return;
  serverMenu.classList.add('hidden');
  state.serverMenuServerId = '';
}

async function onServerContextDelete(serverId) {
  const server = state.servers.find((s) => s.id === serverId);
  if (!server) return;
  if (server.creatorCode !== state.me.code) {
    showToast('Удалять группу может только создатель');
    return;
  }
  const ok = await confirmDeleteServer(server.name);
  if (!ok) return;

  if (state.callConnected) await disconnectCall();
  try {
    await signalPost('/v1/groups/delete', {
      group_id: server.id,
      requester_code: state.me.code,
    });
  } catch (_) {}

  const chatKeysToDelete = [];
  server.textChannels.forEach((channel) => {
    chatKeysToDelete.push(
      getTextChannelKey({
        creatorCode: server.creatorCode,
        serverName: server.name,
        id: channel,
      }),
    );
  });

  state.servers = state.servers.filter((s) => s.id !== serverId);
  chatKeysToDelete.forEach((k) => delete state.textMessages[k]);
  persist('nx_servers', state.servers);
  persist('nx_text_messages', state.textMessages);

  if (state.selectedServerId === serverId) {
    state.selectedScope = 'home';
    state.selectedServerId = null;
    state.selectedTarget = null;
    renderHome();
  }
  renderServers();
  showToast(`Группа ${server.name} удалена`);
}

function confirmDeleteServer(serverName) {
  if (state.deleteServerConfirmResolve) {
    closeDeleteServerConfirm(false);
  }
  deleteServerText.textContent = `Удалить группу "${serverName}"? Это действие нельзя отменить.`;
  modalDeleteServer.classList.remove('hidden');
  return new Promise((resolve) => {
    state.deleteServerConfirmResolve = resolve;
  });
}

function closeDeleteServerConfirm(result) {
  modalDeleteServer.classList.add('hidden');
  const resolve = state.deleteServerConfirmResolve;
  state.deleteServerConfirmResolve = null;
  if (resolve) resolve(!!result);
}

function renderHome() {
  stopTextChannelPolling();
  scopeTitle.textContent = 'Личные';
  channelSection.classList.add('hidden');
  createChannelBtn.classList.add('hidden');
  addMemberBtn.classList.add('hidden');
  showVoicePanel();
  connectBtn.textContent = 'Подключиться';
  disconnectBtn.textContent = 'Отключиться';
  renderDMs();
  renderMembers([]);
}

function renderDMs() {
  const q = searchInput.value.trim().toLowerCase();
  dmList.innerHTML = '';

  state.friends
    .filter((f) => f.nick.toLowerCase().includes(q) || f.code.toLowerCase().includes(q))
    .forEach((f) => {
      const li = document.createElement('li');
      li.className = 'item';
      const unread = getUnreadCountByChannelId(getTextChannelKey({ kind: 'dm', id: f.code }));
      if (state.selectedTarget && state.selectedTarget.kind === 'dm' && state.selectedTarget.id === f.code) {
        li.classList.add('active');
      }
      li.innerHTML = `
        <div class="item-left">
          <div class="avatar sm">${initials(f.nick)}</div>
          <div class="item-meta">
            <strong>${escapeHtml(f.nick)}</strong>
            <code>${escapeHtml(f.code)}</code>
          </div>
        </div>
        <div class="item-right">
          ${unread > 0 ? `<span class="unread-badge">${unread > 99 ? '99+' : unread}</span>` : ''}
          <span class="dot ${f.online ? 'online' : ''}"></span>
        </div>
      `;
      li.onclick = () => selectDM(f);
      li.oncontextmenu = (event) => {
        event.preventDefault();
        openFriendMenu(f, event.clientX, event.clientY);
      };
      dmList.appendChild(li);
    });
}

function openFriendMenu(friend, x, y) {
  closeServerMenu();
  state.friendMenuCode = friend.code;
  const value = getFriendVolumePercent(friend.code);
  friendVolumeRange.value = String(value);
  friendVolumeValue.textContent = `${value}%`;
  friendMenu.classList.remove('hidden');

  const menuW = 220;
  const menuH = 96;
  const left = Math.min(x, window.innerWidth - menuW - 8);
  const top = Math.min(y, window.innerHeight - menuH - 8);
  friendMenu.style.left = `${Math.max(8, left)}px`;
  friendMenu.style.top = `${Math.max(8, top)}px`;
}

function closeFriendMenu() {
  if (!friendMenu) return;
  friendMenu.classList.add('hidden');
  state.friendMenuCode = '';
}

function onFriendVolumeInput() {
  if (!state.friendMenuCode) return;
  const value = Number(friendVolumeRange.value || 100);
  friendVolumeValue.textContent = `${value}%`;
  state.friendVolumes[state.friendMenuCode] = value;
  persist('nx_friend_volumes', state.friendVolumes);
  applyRemoteVolumeForCode(state.friendMenuCode);
}

function selectDM(friend) {
  ensureCallScope(`dm:${friend.code}`);
  showTextPanel();
  state.selectedTarget = {
    kind: 'dm',
    id: friend.code,
    name: friend.nick,
    memberCodes: [state.me.code, friend.code],
  };
  mainTitle.textContent = friend.nick;
  mainSubtitle.textContent = `Личный канал • ${friend.code}`;
  activeName.textContent = friend.nick;
  activeAvatar.textContent = initials(friend.nick);
  activeMeta.textContent = 'P2P • -- ms';
  statusEl.textContent = friend.online ? 'Статус: готов к звонку' : 'Статус: пользователь не в сети';
  connectBtn.textContent = 'Позвонить';
  disconnectBtn.textContent = 'Отклонить';
  renderMembers(state.selectedTarget.memberCodes);
  const channelId = getTextChannelKey(state.selectedTarget);
  state.activeChatChannelId = channelId;
  markChatAsSeen(channelId);
  renderTextChannel();
  startTextChannelPolling(channelId);
  void syncTextChannelFromServer(channelId);
  addMemberBtn.classList.add('hidden');
  renderDMs();
}

function selectServer(serverId) {
  stopTextChannelPolling();
  ensureCallScope(`server:${serverId}`);
  state.selectedScope = 'server';
  state.selectedServerId = serverId;
  state.selectedTarget = null;
  renderServers();
  renderServerChannels();
}

function renderServerChannels() {
  const server = state.servers.find((s) => s.id === state.selectedServerId);
  if (!server) return;

  scopeTitle.textContent = server.name;
  channelSection.classList.remove('hidden');
  createChannelBtn.classList.remove('hidden');
  dmList.innerHTML = '';

  const isCreator = server.creatorCode === state.me.code;
  const canManageMembers = isCreator && !!state.selectedTarget;
  addMemberBtn.classList.toggle('hidden', !canManageMembers);

  const q = searchInput.value.trim().toLowerCase();

  textChannelList.innerHTML = '';
  server.textChannels
    .filter((c) => c.toLowerCase().includes(q))
    .forEach((name) => {
      const li = document.createElement('li');
      li.className = 'item';
      const channelKey = getTextChannelKey({
        kind: 'text',
        id: name,
        serverId: server.id,
        serverName: server.name,
        creatorCode: server.creatorCode,
      });
      const unread = getUnreadCountByChannelId(channelKey);
      if (state.selectedTarget && state.selectedTarget.kind === 'text' && state.selectedTarget.id === name) {
        li.classList.add('active');
      }
      li.innerHTML = `
        <div class="item-left">
          <div class="item-meta">
            <strong># ${escapeHtml(name)}</strong>
            <span>Текстовый канал</span>
          </div>
        </div>
        ${unread > 0 ? `<span class="unread-badge">${unread > 99 ? '99+' : unread}</span>` : ''}
      `;
      li.onclick = () => selectTextChannel(server, name);
      textChannelList.appendChild(li);
    });

  voiceChannelList.innerHTML = '';
  server.voiceChannels
    .filter((c) => c.toLowerCase().includes(q))
    .forEach((name) => {
      const occupants = getVoiceChannelMembers(server.id, name);
      const li = document.createElement('li');
      li.className = 'item voice-item';
      if (state.selectedTarget && state.selectedTarget.kind === 'voice' && state.selectedTarget.id === name) {
        li.classList.add('active');
      }
      if (occupants.length) li.classList.add('occupied');
      li.innerHTML = `
        <div class="item-left">
          <div class="item-meta">
            <strong>🔊 ${escapeHtml(name)}</strong>
            <span>Голосовой канал${occupants.length ? ` • ${occupants.length} в канале` : ''}</span>
          </div>
        </div>
        ${occupants.length ? `<div class="voice-users">${occupants
          .map(
            (m) => `
              <div class="voice-user ${m.code === state.me.code ? 'self' : ''}" data-code="${escapeHtml(m.code)}">
                <span class="voice-user-dot"></span>
                <span>${escapeHtml(m.nick)}</span>
              </div>
            `,
          )
          .join('')}</div>` : ''}
      `;
      li.onclick = () => selectVoiceChannel(server, name);
      li.querySelectorAll('.voice-user[data-code]').forEach((node) => {
        node.oncontextmenu = (event) => {
          const code = node.dataset.code || '';
          const target = volumeTargetByCode(code);
          if (!target) return;
          event.preventDefault();
          event.stopPropagation();
          openFriendMenu(target, event.clientX, event.clientY);
        };
      });
      voiceChannelList.appendChild(li);
    });
}

function getVoiceChannelMembers(serverId, channel) {
  const members = [];
  const seen = new Set();
  if (
    state.callConnected
    && state.groupVoice
    && state.groupVoice.serverId === serverId
    && state.groupVoice.channel === channel
  ) {
    members.push({ code: state.me.code, nick: state.me.nick });
    seen.add(state.me.code);
  }

  state.friends.forEach((friend) => {
    const parsed = parseEndpoint(friend.endpoint || '');
    if (parsed.kind === 'group' && parsed.serverId === serverId && parsed.channel === channel) {
      if (seen.has(friend.code)) return;
      members.push({ code: friend.code, nick: friend.nick });
      seen.add(friend.code);
    }
  });

  if (
    state.callConnected
    && state.groupVoice
    && state.groupVoice.serverId === serverId
    && state.groupVoice.channel === channel
  ) {
    Object.keys(state.groupPeers).forEach((code) => {
      if (seen.has(code)) return;
      members.push({ code, nick: codeToNick(code) });
      seen.add(code);
    });
  }

  return members;
}

function selectTextChannel(server, channel) {
  ensureCallScope(`text:${server.id}:${channel}`);
  showTextPanel();
  state.selectedTarget = {
    kind: 'text',
    id: channel,
    serverId: server.id,
    serverName: server.name,
    creatorCode: server.creatorCode,
    name: `${server.name} / #${channel}`,
    memberCodes: [...server.memberCodes],
  };
  mainTitle.textContent = `#${channel}`;
  mainSubtitle.textContent = `${server.name} • текстовый канал`;
  activeName.textContent = `#${channel}`;
  activeAvatar.textContent = '#';
  activeMeta.textContent = 'Текстовый режим';
  statusEl.textContent = 'Статус: переключись в голосовой канал для звонка';
  connectBtn.textContent = 'Подключиться';
  disconnectBtn.textContent = 'Отключиться';
  renderMembers(state.selectedTarget.memberCodes);
  const channelId = getTextChannelKey(state.selectedTarget);
  state.activeChatChannelId = channelId;
  markChatAsSeen(channelId);
  renderTextChannel();
  startTextChannelPolling(channelId);
  void syncTextChannelFromServer(channelId);
  renderServerChannels();
}

function selectVoiceChannel(server, channel) {
  stopTextChannelPolling();
  ensureCallScope(`voice:${server.id}:${channel}`);
  showVoicePanel();
  state.selectedTarget = {
    kind: 'voice',
    id: channel,
    name: `${server.name} / ${channel}`,
    memberCodes: [...server.memberCodes],
  };
  mainTitle.textContent = `🔊 ${channel}`;
  mainSubtitle.textContent = `${server.name} • голосовой канал`;
  activeName.textContent = channel;
  activeAvatar.textContent = 'VC';
  activeMeta.textContent = 'Группа • -- ms';
  const isActive = state.callConnected
    && state.groupVoice
    && state.groupVoice.serverId === server.id
    && state.groupVoice.channel === channel;
  statusEl.textContent = isActive ? `Статус: в голосовом канале ${channel}` : 'Статус: готов к групповому звонку';
  connectBtn.textContent = 'Подключиться';
  disconnectBtn.textContent = 'Отключиться';
  renderMembers(state.selectedTarget.memberCodes);
  renderServerChannels();
}

function getTextChannelKey(target) {
  if (target.kind === 'dm') {
    const a = String(state.me.code || '').toUpperCase();
    const b = String(target.id || '').toUpperCase();
    const pair = [a, b].sort().join(':');
    return `dm:${pair}`;
  }
  const creator = normalizePart(target.creatorCode || 'unknown');
  const serverName = normalizePart(target.serverName || target.serverId || 'server');
  const channel = normalizePart(target.id || 'text');
  return `grp:${creator}:${serverName}:${channel}`;
}

function getUnreadCountByChannelId(channelId) {
  const list = Array.isArray(state.textMessages[channelId]) ? state.textMessages[channelId] : [];
  const seenTs = Number(state.chatSeenTs[channelId] || 0);
  return list.filter((msg) => msg.authorCode !== state.me.code && Number(msg.ts || 0) > seenTs).length;
}

function markChatAsSeen(channelId) {
  if (!channelId) return;
  const list = Array.isArray(state.textMessages[channelId]) ? state.textMessages[channelId] : [];
  const lastTs = list.length ? Number(list[list.length - 1].ts || Date.now()) : Date.now();
  const prevTs = Number(state.chatSeenTs[channelId] || 0);
  if (lastTs <= prevTs) return;
  state.chatSeenTs[channelId] = lastTs;
  persist('nx_chat_seen', state.chatSeenTs);
}

function refreshUnreadUi() {
  if (state.selectedScope === 'home') {
    renderDMs();
    return;
  }
  if (state.selectedScope === 'server') {
    renderServerChannels();
  }
}

function renderTextChannel() {
  if (!state.selectedTarget || (state.selectedTarget.kind !== 'text' && state.selectedTarget.kind !== 'dm')) return;
  const key = getTextChannelKey(state.selectedTarget);
  const list = Array.isArray(state.textMessages[key]) ? state.textMessages[key] : [];
  markChatAsSeen(key);

  chatMessages.innerHTML = '';
  if (!list.length) {
    const empty = document.createElement('div');
    empty.className = 'chat-empty';
    empty.textContent = 'Пока нет сообщений. Напиши первым.';
    chatMessages.appendChild(empty);
    return;
  }

  list.forEach((msg) => {
    const row = document.createElement('div');
    row.className = `chat-msg ${msg.authorCode === state.me.code ? 'me' : ''}`;
    row.innerHTML = `
      <div class="chat-msg-head">
        <strong>${escapeHtml(msg.authorNick)}</strong>
        <span>${formatTime(msg.ts)}</span>
      </div>
      <div class="chat-msg-body">${escapeHtml(msg.text)}</div>
    `;
    chatMessages.appendChild(row);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
  refreshUnreadUi();
}

async function sendTextMessage() {
  if (!state.selectedTarget || (state.selectedTarget.kind !== 'text' && state.selectedTarget.kind !== 'dm')) {
    showToast('Выбери чат');
    return;
  }

  const text = chatInput.value.trim();
  if (!text) return;

  const key = getTextChannelKey(state.selectedTarget);
  const msg = {
    id: id(),
    authorCode: state.me.code,
    authorNick: state.me.nick,
    text,
    ts: Date.now(),
  };
  chatInput.value = '';
  try {
    const resp = await signalPost('/v1/chat/send', {
      channel_id: key,
      author_code: state.me.code,
      author_nick: state.me.nick,
      text,
      ts: msg.ts,
    });
    const fromServer = normalizeChatList(resp?.messages);
    if (fromServer.length) {
      state.textMessages[key] = fromServer;
    } else {
      const list = Array.isArray(state.textMessages[key]) ? state.textMessages[key] : [];
      list.push(msg);
      state.textMessages[key] = list.slice(-300);
    }
  } catch (_) {
    const list = Array.isArray(state.textMessages[key]) ? state.textMessages[key] : [];
    list.push(msg);
    state.textMessages[key] = list.slice(-300);
    showToast('Сервер чата недоступен, сохранил локально');
  }
  persist('nx_text_messages', state.textMessages);
  markChatAsSeen(key);
  renderTextChannel();
}

function startTextChannelPolling(channelId) {
  stopTextChannelPolling();
  state.chatPollRef = setInterval(() => {
    if (!state.selectedTarget) return;
    if (state.selectedTarget.kind !== 'text' && state.selectedTarget.kind !== 'dm') return;
    if (state.activeChatChannelId !== channelId) return;
    void syncTextChannelFromServer(channelId, true);
  }, NET_TUNE.chatPollMs);
}

function stopTextChannelPolling() {
  if (state.chatPollRef) clearInterval(state.chatPollRef);
  state.chatPollRef = null;
  state.activeChatChannelId = '';
}

async function syncTextChannelFromServer(channelId, silent = false) {
  try {
    const prevList = Array.isArray(state.textMessages[channelId]) ? state.textMessages[channelId] : [];
    const prevLastId = prevList.length ? String(prevList[prevList.length - 1].id || '') : '';
    const resp = await signalGet(`/v1/chat/history/${channelId}?limit=200`);
    const list = normalizeChatList(resp?.messages);
    state.textMessages[channelId] = list;
    persist('nx_text_messages', state.textMessages);
    const nextLastId = list.length ? String(list[list.length - 1].id || '') : '';
    const hasNew = !!nextLastId && nextLastId !== prevLastId;
    if (
      (state.selectedTarget?.kind === 'text' || state.selectedTarget?.kind === 'dm')
      && state.activeChatChannelId === channelId
    ) {
      renderTextChannel();
    } else if (hasNew) {
      refreshUnreadUi();
    }
  } catch (err) {
    if (!silent) {
      const msg = String(err?.message || '');
      if (msg.includes('404') || msg.includes('not_found')) {
        showToast('На сервере пока нет API чата, обновляю сервер');
      } else {
        showToast('Ошибка загрузки сообщений');
      }
    }
  }
}

function renderMembers(memberCodes) {
  membersList.innerHTML = '';
  if (!memberCodes.length) {
    const li = document.createElement('li');
    li.className = 'member';
    li.textContent = 'Нет выбранного канала';
    membersList.appendChild(li);
    return;
  }

  let list = memberCodes;
  if (state.selectedTarget?.kind === 'voice') {
    list = memberCodes.filter((code) => isMemberActiveInCurrentTarget(code));
    if (!list.length) {
      const li = document.createElement('li');
      li.className = 'member';
      li.textContent = 'В этом канале пока никого';
      membersList.appendChild(li);
      return;
    }
  }

  list.forEach((code) => {
    const li = document.createElement('li');
    const nick = codeToNick(code);
    const online = isMemberActiveInCurrentTarget(code);
    li.className = 'member';
    li.dataset.code = code;
    li.innerHTML = `<span>${escapeHtml(nick)} <small>(${escapeHtml(code)})</small></span><span class="dot ${online ? 'online' : ''}"></span>`;
    li.oncontextmenu = (event) => {
      const target = volumeTargetByCode(code);
      if (!target) return;
      event.preventDefault();
      openFriendMenu(target, event.clientX, event.clientY);
    };
    membersList.appendChild(li);
  });
}

function onSaveFriend() {
  const nick = friendNickInput.value.trim();
  const code = friendCodeInput.value.trim().toUpperCase();

  if (!nick || !/^NX-[A-Z0-9]{6}$/.test(code)) {
    showToast('Нужны имя друга и код вида NX-XXXXXX');
    return;
  }

  if (code === state.me.code) {
    showToast('Это твой код');
    return;
  }

  const exists = state.friends.some((f) => f.code === code || f.nick.toLowerCase() === nick.toLowerCase());
  if (exists) {
    showToast('Пользователь уже добавлен');
    return;
  }

  state.friends.push({ nick, code, online: false, endpoint: '' });
  persist('nx_friends', state.friends);
  friendNickInput.value = '';
  friendCodeInput.value = '';
  modalAddFriend.classList.add('hidden');
  renderDMs();
  void refreshOnlineStatuses();
  showToast(`Друг ${nick} добавлен`);
}

async function onSaveServer() {
  const name = serverNameInput.value.trim();
  const text = (defaultTextInput.value.trim() || 'общий').toLowerCase();
  const voice = (defaultVoiceInput.value.trim() || 'voice-1').toLowerCase();

  if (!name) {
    showToast('Укажи название группы');
    return;
  }

  const server = {
    id: id(),
    name,
    creatorCode: state.me.code,
    memberCodes: [state.me.code],
    textChannels: [text],
    voiceChannels: [voice],
  };

  state.servers.push(server);
  persist('nx_servers', state.servers);
  await syncServerToBackend(server);
  await syncGroupsFromServer(true);

  serverNameInput.value = '';
  defaultTextInput.value = '';
  defaultVoiceInput.value = '';
  modalCreateServer.classList.add('hidden');

  renderServers();
  selectServer(server.id);
  showToast(`Группа ${name} создана`);
}

async function onSaveChannel() {
  const name = channelNameInput.value.trim().toLowerCase();
  const type = channelTypeSelect.value;
  const server = state.servers.find((s) => s.id === state.selectedServerId);

  if (!server) {
    showToast('Сначала выбери группу');
    return;
  }
  if (!name) {
    showToast('Укажи название канала');
    return;
  }

  const list = type === 'voice' ? server.voiceChannels : server.textChannels;
  if (list.includes(name)) {
    showToast('Канал уже существует');
    return;
  }

  list.push(name);
  persist('nx_servers', state.servers);
  await syncServerToBackend(server);
  await syncGroupsFromServer(true);
  channelNameInput.value = '';
  modalCreateChannel.classList.add('hidden');
  renderServerChannels();
  showToast(`Канал ${name} создан`);
}

async function onSaveMember() {
  const code = memberCodeInput.value.trim().toUpperCase();
  const server = state.servers.find((s) => s.id === state.selectedServerId);

  if (!server) {
    showToast('Сначала выбери группу');
    return;
  }

  if (server.creatorCode !== state.me.code) {
    showToast('Добавлять участников может только создатель');
    return;
  }

  if (!/^NX-[A-Z0-9]{6}$/.test(code)) {
    showToast('Код должен быть NX-XXXXXX');
    return;
  }

  if (!knownCode(code)) {
    showToast('Сначала добавь этого пользователя в друзья по ID');
    return;
  }

  if (server.memberCodes.includes(code)) {
    showToast('Участник уже в канале');
    return;
  }

  server.memberCodes.push(code);
  persist('nx_servers', state.servers);
  await syncServerToBackend(server);
  await syncGroupsFromServer(true);

  memberCodeInput.value = '';
  modalAddMember.classList.add('hidden');

  if (state.selectedTarget && (state.selectedTarget.kind === 'voice' || state.selectedTarget.kind === 'text')) {
    state.selectedTarget.memberCodes = [...server.memberCodes];
    renderMembers(state.selectedTarget.memberCodes);
  }
  showToast(`Участник ${code} добавлен`);
}

function loadSettingsFields() {
  myNickInput.value = state.me.nick;
  myCodeInput.value = state.me.code;
  signalServerInput.value = state.me.server;
  voiceModeSelect.value = state.voiceMode;
  pttKeyInput.value = humanInputKey(state.pttKey);
  pttKeyRow.classList.toggle('hidden', state.voiceMode !== 'ptt');
}

function onSaveSettings() {
  const nick = myNickInput.value.trim();
  const server = signalServerInput.value.trim();
  if (!nick || !server) {
    showToast('Заполни ник и сервер');
    return;
  }

  state.me.nick = nick;
  state.me.server = server;
  state.voiceMode = voiceModeSelect.value;

  localStorage.setItem('nx_me_nick', nick);
  localStorage.setItem('nx_signal_server', server);
  localStorage.setItem('nx_voice_mode', state.voiceMode);
  localStorage.setItem('nx_ptt_key', state.pttKey);

  if (state.inputDeviceId) localStorage.setItem('nx_input_device', state.inputDeviceId);
  if (state.outputDeviceId) localStorage.setItem('nx_output_device', state.outputDeviceId);

  renderProfile();
  renderVoiceModeHint();
  modalSettings.classList.add('hidden');
  applyMicState();
  startPresenceLoops();
  startGroupSyncLoop();
  void syncGroupsFromServer(true);
  showToast('Настройки сохранены');
}

async function connectCall() {
  if (!state.selectedTarget) {
    showToast('Выбери контакт или голосовой канал');
    return;
  }

  if (state.selectedTarget.kind === 'text') {
    showToast('Текстовый канал не поддерживает созвон');
    return;
  }

  if (state.me.server.includes('127.0.0.1') || state.me.server.includes('localhost')) {
    showToast('Сервер localhost работает только для теста на одном ПК');
  }

  const requestedKey = selectedTargetCallKey();

  if (state.callConnected || state.call) {
    if (requestedKey && requestedKey === state.callTargetKey) {
      showToast('Созвон уже активен');
      return;
    }
    if (state.selectedTarget.kind === 'voice' && state.callTargetKey?.startsWith('voice:')) {
      await switchActiveCall();
    } else {
      showToast('Сначала отключись от текущего звонка');
      return;
    }
  }

  if (state.selectedTarget.kind === 'voice') {
    ++state.callToken;
    state.callTargetKey = `voice:${state.selectedServerId}:${state.selectedTarget.id}`;
    state.groupVoice = { serverId: state.selectedServerId, channel: state.selectedTarget.id };
    state.callConnected = true;
    statusEl.textContent = `Статус: в голосовом канале ${state.selectedTarget.id}`;
    startPingLoop();
    startTimer();
    await ensureMicStream(true);
    applyMicState();
    await sendSelfPresence();
    startGroupLinkLoop();
    renderServerChannels();
    renderMembers(state.selectedTarget.memberCodes);
    showToast(`Подключен к каналу ${state.selectedTarget.id}`);
    playCue('join');
    return;
  }

  if (state.selectedTarget.kind !== 'dm') {
    showToast('Выбери друга или голосовой канал');
    return;
  }

  const friendCode = state.selectedTarget.id;
  if (!friendCode || !/^NX-[A-Z0-9]{6}$/.test(friendCode)) {
    showToast('Некорректный код друга');
    return;
  }

  const token = ++state.callToken;
  state.callTargetKey = `dm:${friendCode}`;
  statusEl.textContent = 'Статус: подключение...';
  showToast('Звоним другу...');

  try {
    await ensureMicStream(true);
    if (!state.micStream || !state.micStream.getAudioTracks().length) {
      throw new Error('Микрофон недоступен');
    }

    await createOutgoingSession(friendCode, token);

    if (!isActiveToken(token)) return;
    stopRingingLoop();
    state.callConnected = true;
    state.groupVoice = null;
    statusEl.textContent = 'Статус: подключено';
    startPingLoop();
    startTimer();
    applyMicState();
    await sendSelfPresence();
    playCue('join');
    showToast('P2P-соединение установлено');
  } catch (err) {
    if (isActiveToken(token)) {
      stopRingingLoop();
      await teardownCall(false);
      statusEl.textContent = 'Статус: ошибка подключения';
      showToast(`Ошибка созвона: ${err.message || err}`);
    }
  }
}

async function disconnectCall() {
  ++state.callToken;
  stopRingingLoop();
  await teardownCall(true);
  await sendSelfPresence();
  if (state.selectedScope === 'server') {
    renderServerChannels();
    if (state.selectedTarget?.memberCodes) renderMembers(state.selectedTarget.memberCodes);
  }
  state.callTargetKey = '';
  state.groupVoice = null;
  statusEl.textContent = 'Статус: отключено';
  showToast('Отключено');
  playCue('leave');
}

async function switchActiveCall() {
  ++state.callToken;
  stopRingingLoop();
  await teardownCall(true);
  await sendSelfPresence();
  if (state.selectedScope === 'server') {
    renderServerChannels();
    if (state.selectedTarget?.memberCodes) renderMembers(state.selectedTarget.memberCodes);
  }
}

async function teardownCall(notifyRemote = false) {
  state.callConnected = false;
  state.pttHeld = false;
  stopGroupLinkLoop();
  stopPingLoop();
  stopTimer();
  teardownAllGroupPeers();
  state.groupPending = {};

  if (state.call?.pollRef) clearTimeout(state.call.pollRef);

  const sessionId = state.call?.sessionId;
  const friendCode = state.call?.friendCode;

  if (state.call?.pc) {
    try {
      state.call.pc.ontrack = null;
      state.call.pc.onconnectionstatechange = null;
      state.call.pc.onicecandidate = null;
      state.call.pc.close();
    } catch (_) {}
  }
  state.call = null;
  state.callTargetKey = '';
  state.groupVoice = null;

  if (remoteAudio) {
    remoteAudio.pause();
    remoteAudio.srcObject = null;
  }

  applyMicState();

  if (notifyRemote && sessionId && friendCode) {
    // Mark that the endpoint is free again; session TTL cleanup is done on server side.
    try {
      await signalPost('/v1/register', {
        key: state.me.code,
        endpoint: 'online',
        sdp_offer: null,
      });
    } catch (_) {}
  }
}

function createPeer(friendCode, token) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  });

  const remoteStream = new MediaStream();
  if (remoteAudio) {
    remoteAudio.srcObject = remoteStream;
    remoteAudio.autoplay = true;
    remoteAudio.muted = false;
    applyRemoteVolumeForCode(friendCode);
    void applyOutputDevice(true);
  }

  pc.ontrack = (ev) => {
    ev.streams[0].getAudioTracks().forEach((t) => remoteStream.addTrack(t));
    if (remoteAudio) {
      remoteAudio.play().catch(() => {});
    }
  };

  pc.onconnectionstatechange = () => {
    if (!isActiveToken(token)) return;
    if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
      disconnectCall();
    }
  };

  state.micStream.getAudioTracks().forEach((track) => pc.addTrack(track, state.micStream));
  state.call = { pc, sessionId: '', friendCode, role: '', pollRef: null };
  return pc;
}

function ensureGroupAudioElement(friendCode) {
  const idSafe = friendCode.replace(/[^a-zA-Z0-9_-]/g, '_');
  let el = document.getElementById(`remoteAudio_${idSafe}`);
  if (!el) {
    el = document.createElement('audio');
    el.id = `remoteAudio_${idSafe}`;
    el.className = 'hidden';
    el.autoplay = true;
    document.body.appendChild(el);
  }
  return el;
}

function createGroupPeer(friendCode, token) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  });

  const remoteStream = new MediaStream();
  const audioEl = ensureGroupAudioElement(friendCode);
  audioEl.srcObject = remoteStream;
  audioEl.autoplay = true;
  audioEl.muted = false;
  applyRemoteVolumeForCode(friendCode);
  void applyOutputDevice(true);

  pc.ontrack = (ev) => {
    ev.streams[0].getAudioTracks().forEach((t) => remoteStream.addTrack(t));
    audioEl.play().catch(() => {});
  };

  pc.onconnectionstatechange = () => {
    if (!isActiveToken(token)) return;
    const peer = state.groupPeers[friendCode];
    if (!peer) return;
    const cs = pc.connectionState;
    peer.connected = cs === 'connected';
    if (state.selectedScope === 'server') {
      renderServerChannels();
      if (state.selectedTarget?.memberCodes) renderMembers(state.selectedTarget.memberCodes);
    }
    if (cs === 'failed' || cs === 'disconnected' || cs === 'closed') {
      void teardownGroupPeer(friendCode, false);
    }
  };

  state.micStream.getAudioTracks().forEach((track) => pc.addTrack(track, state.micStream));
  state.groupPeers[friendCode] = {
    pc,
    sessionId: '',
    friendCode,
    role: '',
    audioEl,
    connected: false,
  };
  return state.groupPeers[friendCode];
}

async function teardownGroupPeer(friendCode, removePending = true) {
  const peer = state.groupPeers[friendCode];
  if (!peer) {
    if (removePending) delete state.groupPending[friendCode];
    return;
  }

  try {
    peer.pc.ontrack = null;
    peer.pc.onconnectionstatechange = null;
    peer.pc.onicecandidate = null;
    peer.pc.close();
  } catch (_) {}

  if (peer.audioEl) {
    try {
      peer.audioEl.pause();
      peer.audioEl.srcObject = null;
      peer.audioEl.remove();
    } catch (_) {}
  }

  delete state.groupPeers[friendCode];
  if (removePending) delete state.groupPending[friendCode];
  if (state.selectedScope === 'server') {
    renderServerChannels();
    if (state.selectedTarget?.memberCodes) renderMembers(state.selectedTarget.memberCodes);
  }
}

function teardownAllGroupPeers() {
  Object.keys(state.groupPeers).forEach((code) => {
    void teardownGroupPeer(code, true);
  });
}

async function createOutgoingGroupSession(friendCode, token) {
  if (!isActiveToken(token) || !state.callConnected || !state.groupVoice) return;
  if (state.groupPeers[friendCode] || state.groupPending[friendCode]) return;
  state.groupPending[friendCode] = true;

  try {
    await ensureMicStream(false);
    if (!state.micStream || !state.micStream.getAudioTracks().length) {
      await ensureMicStream(true);
    }
    if (!state.micStream || !state.micStream.getAudioTracks().length) {
      throw new Error('Микрофон недоступен');
    }
    const peer = createGroupPeer(friendCode, token);
    peer.role = 'caller';

    const offer = await peer.pc.createOffer({ offerToReceiveAudio: true });
    await peer.pc.setLocalDescription(offer);
    await waitIceComplete(peer.pc, token);
    if (!isActiveToken(token) || !state.callConnected || !state.groupVoice) {
      throw new Error('Звонок отменен');
    }

    const createResp = await signalPost('/v1/sessions/offer', {
      caller_key: state.me.code,
      callee_key: friendCode,
      sdp_offer: peer.pc.localDescription?.sdp || offer.sdp,
      context: {
        mode: 'group',
        server_id: state.groupVoice?.serverId,
        channel: state.groupVoice?.channel,
      },
    });

    const sessionId = createResp.session_id;
    if (!sessionId) throw new Error('Не получили session_id от signal-server');
    peer.sessionId = sessionId;

    await signalPost('/v1/register', {
      key: state.me.code,
      endpoint: `ring:${sessionId}:${friendCode}:${state.me.code}`,
      sdp_offer: null,
    });

    const answer = await waitForAnswerOrDecline(sessionId, friendCode, token, 9000);
    if (!answer) throw new Error('Участник не принял подключение');
    if (!isActiveToken(token) || !state.callConnected || !state.groupVoice) {
      throw new Error('Звонок отменен');
    }

    await applyRemoteDescriptionWithFallback(peer.pc, 'answer', answer);
    peer.connected = true;
    await sendSelfPresence();
  } catch (err) {
    await teardownGroupPeer(friendCode, false);
    throw err;
  } finally {
    delete state.groupPending[friendCode];
    if (isActiveToken(token) && state.callConnected && state.groupVoice) {
      await sendSelfPresence();
    }
  }
}

async function acceptIncomingGroupSession(friendCode, sessionId, token) {
  if (!isActiveToken(token) || !state.callConnected || !state.groupVoice) return;
  if (state.groupPeers[friendCode] || state.groupPending[friendCode]) return;
  state.groupPending[friendCode] = true;

  try {
    await ensureMicStream(false);
    if (!state.micStream || !state.micStream.getAudioTracks().length) {
      await ensureMicStream(true);
    }
    if (!state.micStream || !state.micStream.getAudioTracks().length) {
      throw new Error('Микрофон недоступен');
    }
    const peer = createGroupPeer(friendCode, token);
    peer.role = 'callee';
    peer.sessionId = sessionId;

    const session = await signalGet(`/v1/sessions/${encodeURIComponent(sessionId)}?key=${encodeURIComponent(state.me.code)}`);
    const offerSdp = session?.sdp_offer;
    if (!offerSdp) throw new Error('Входящий оффер не найден');

    await applyRemoteDescriptionWithFallback(peer.pc, 'offer', offerSdp);
    const answer = await peer.pc.createAnswer();
    await peer.pc.setLocalDescription(answer);
    await waitIceComplete(peer.pc, token);
    if (!isActiveToken(token) || !state.callConnected || !state.groupVoice) {
      throw new Error('Звонок отменен');
    }

    await signalPost(`/v1/sessions/${encodeURIComponent(sessionId)}/answer`, {
      key: state.me.code,
      callee_key: state.me.code,
      sdp_answer: peer.pc.localDescription?.sdp || answer.sdp,
    });

    peer.connected = true;
    await sendSelfPresence();
  } catch (err) {
    await teardownGroupPeer(friendCode, false);
    throw err;
  } finally {
    delete state.groupPending[friendCode];
  }
}

async function createOutgoingSession(friendCode, token, options = null) {
  const pc = createPeer(friendCode, token);
  state.call.role = 'caller';

  const offer = await pc.createOffer({ offerToReceiveAudio: true });
  await pc.setLocalDescription(offer);
  await waitIceComplete(pc, token);

  const createResp = await signalPost('/v1/sessions/offer', {
    caller_key: state.me.code,
    callee_key: friendCode,
    sdp_offer: pc.localDescription?.sdp || offer.sdp,
    ...(options?.context ? { context: options.context } : {}),
  });
  const sessionId = createResp.session_id;
  if (!sessionId) throw new Error('Не получили session_id от signal-server');

  state.call.sessionId = sessionId;

  await signalPost('/v1/register', {
    key: state.me.code,
    endpoint: `ring:${sessionId}:${friendCode}:${state.me.code}`,
    sdp_offer: null,
  });

  startRingingLoop('outgoing');

  const answer = await waitForAnswerOrDecline(sessionId, friendCode, token);
  if (!answer) throw new Error('Друг не принял звонок');

  await applyRemoteDescriptionWithFallback(pc, 'answer', answer);

  await signalPost('/v1/register', {
    key: state.me.code,
    endpoint: options?.presenceEndpoint || `session:${sessionId}:${friendCode}:${state.me.code}`,
    sdp_offer: null,
  });
}

async function acceptIncomingSession(friendCode, sessionId, token, options = null) {
  const pc = createPeer(friendCode, token);
  state.call.role = 'callee';
  state.call.sessionId = sessionId;

  const session = await signalGet(`/v1/sessions/${encodeURIComponent(sessionId)}?key=${encodeURIComponent(state.me.code)}`);
  const offerSdp = session?.sdp_offer;
  if (!offerSdp) throw new Error('Входящий оффер не найден');

  await applyRemoteDescriptionWithFallback(pc, 'offer', offerSdp);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await waitIceComplete(pc, token);

  await signalPost(`/v1/sessions/${encodeURIComponent(sessionId)}/answer`, {
    key: state.me.code,
    callee_key: state.me.code,
    sdp_answer: pc.localDescription?.sdp || answer.sdp,
  });

  await signalPost('/v1/register', {
    key: state.me.code,
    endpoint: options?.presenceEndpoint || `session:${sessionId}:${friendCode}:${state.me.code}`,
    sdp_offer: null,
  });
}

function startIncomingWatcher() {
  if (state.incomingPollRef) clearInterval(state.incomingPollRef);
  state.incomingPollRef = setInterval(() => {
    void checkIncomingCalls();
  }, NET_TUNE.incomingPollMs);
  void checkIncomingCalls();
}

async function checkIncomingCalls() {
  if (state.incomingCall) return;
  if (state.call && !state.groupVoice) return;
  if (!state.friends.length) return;

  for (const friend of state.friends) {
    try {
      const resolved = await signalGet(`/v1/resolve/${encodeURIComponent(friend.code)}`);
      const endpoint = parseEndpoint(resolved?.endpoint);
      if (endpoint.kind === 'ring' && endpoint.to === state.me.code) {
        let hasValidOffer = false;
        let incomingMode = 'dm';
        let groupMeta = null;
        try {
          const session = await signalGet(`/v1/sessions/${encodeURIComponent(endpoint.sessionId)}?key=${encodeURIComponent(state.me.code)}`);
          hasValidOffer = isLikelySdp(session?.sdp_offer);
          const ctx = session?.context;
          if (ctx?.mode === 'group' && ctx?.server_id && ctx?.channel) {
            incomingMode = 'group';
            groupMeta = { serverId: String(ctx.server_id), channel: String(ctx.channel) };
          }
        } catch (_) {
          hasValidOffer = false;
        }
        if (!hasValidOffer) continue;

        if (incomingMode === 'group' && groupMeta) {
          const inCurrentGroup = state.callConnected
            && state.groupVoice
            && state.groupVoice.serverId === groupMeta.serverId
            && state.groupVoice.channel === groupMeta.channel;
          if (!inCurrentGroup) continue;
          if (state.groupPeers[friend.code] || state.groupPending[friend.code]) continue;
          void acceptIncomingGroupSession(friend.code, endpoint.sessionId, state.callToken).catch(() => {});
          continue;
        }

        if (state.call) continue;
        state.incomingCall = {
          fromCode: friend.code,
          fromNick: friend.nick,
          sessionId: endpoint.sessionId,
          mode: incomingMode,
          group: groupMeta,
        };
        incomingCallText.textContent = `${friend.nick} (${friend.code}) звонит...`;
        modalIncomingCall.classList.remove('hidden');
        startRingingLoop('incoming');
        return;
      }
    } catch (_) {}
  }
}

async function acceptIncomingCall() {
  if (!state.incomingCall) return;
  const incoming = state.incomingCall;
  if (incoming.mode === 'group') {
    state.incomingCall = null;
    modalIncomingCall.classList.add('hidden');
    stopRingingLoop();
    return;
  }

  stopRingingLoop();
  modalIncomingCall.classList.add('hidden');
  state.incomingCall = null;

  const token = ++state.callToken;
  state.callTargetKey = `dm:${incoming.fromCode}`;
  statusEl.textContent = 'Статус: принимаем звонок...';

  try {
    await ensureMicStream(true);
    if (!state.micStream || !state.micStream.getAudioTracks().length) {
      throw new Error('Микрофон недоступен');
    }
    await acceptIncomingSession(incoming.fromCode, incoming.sessionId, token);
    if (!isActiveToken(token)) return;
    state.callConnected = true;
    state.groupVoice = null;
    statusEl.textContent = 'Статус: подключено';
    startPingLoop();
    startTimer();
    applyMicState();
    await sendSelfPresence();
    playCue('join');
    showToast(`Соединение с ${incoming.fromNick}`);
  } catch (err) {
    await teardownCall(false);
    state.callTargetKey = '';
    statusEl.textContent = 'Статус: ошибка подключения';
    showToast(`Ошибка принятия звонка: ${err.message || err}`);
  }
}

async function rejectIncomingCall(notify = false) {
  if (!state.incomingCall) return;
  const incoming = state.incomingCall;
  stopRingingLoop();
  modalIncomingCall.classList.add('hidden');
  state.incomingCall = null;

  if (notify) {
    try {
      await signalPost('/v1/register', {
        key: state.me.code,
        endpoint: `decline:${incoming.sessionId}:${incoming.fromCode}:${state.me.code}`,
        sdp_offer: null,
      });
      setTimeout(() => {
        void sendSelfPresence();
      }, 1500);
    } catch (_) {}
  }
}

function startRingingLoop(mode) {
  stopRingingLoop();
  state.ringingRef = setInterval(() => {
    playCue(mode === 'incoming' ? 'ringIn' : 'ringOut');
  }, 1800);
  playCue(mode === 'incoming' ? 'ringIn' : 'ringOut');
}

function stopRingingLoop() {
  if (state.ringingRef) clearInterval(state.ringingRef);
  state.ringingRef = null;
}

function startGroupLinkLoop() {
  stopGroupLinkLoop();
  state.groupLinkRef = setInterval(() => {
    void maybeLinkGroupPeer();
  }, NET_TUNE.groupLinkPollMs);
  void maybeLinkGroupPeer();
}

function stopGroupLinkLoop() {
  if (state.groupLinkRef) clearInterval(state.groupLinkRef);
  state.groupLinkRef = null;
  state.groupDialLock = false;
}

async function maybeLinkGroupPeer() {
  if (!state.callConnected || !state.groupVoice) return;
  if (state.call || state.groupDialLock) return;

  const server = state.servers.find((s) => s.id === state.groupVoice.serverId);
  if (!server) return;

  const token = state.callToken;
  const peers = state.friends
    .filter((f) => server.memberCodes.includes(f.code))
    .filter((f) => {
      const ep = parseEndpoint(f.endpoint || '');
      return ep.kind === 'group'
        && ep.serverId === state.groupVoice.serverId
        && ep.channel === state.groupVoice.channel;
    })
    .sort((a, b) => a.code.localeCompare(b.code));

  let targetToDial = null;
  peers.forEach((target) => {
    if (targetToDial) return;
    if (!isActiveToken(token)) return;
    if (target.code === state.me.code || state.me.code >= target.code) return;
    const existing = state.groupPeers[target.code];
    if (existing) {
      const cs = existing.pc?.connectionState;
      if (cs === 'failed' || cs === 'disconnected' || cs === 'closed') {
        void teardownGroupPeer(target.code, false);
      }
      return;
    }
    if (state.groupPending[target.code]) return;
    targetToDial = target;
  });

  if (!targetToDial) return;
  state.groupDialLock = true;
  try {
    await createOutgoingGroupSession(targetToDial.code, token);
  } catch (_) {
    // keep loop alive, next tick retries or connects to other peers
  } finally {
    state.groupDialLock = false;
  }
}

function startPingLoop() {
  stopPingLoop();
  state.pingTimerRef = setInterval(() => {
    void refreshPeerPing();
  }, 2000);
  void refreshPeerPing();
}

function stopPingLoop() {
  if (state.pingTimerRef) clearInterval(state.pingTimerRef);
  state.pingTimerRef = null;
}

async function refreshPeerPing() {
  if (!state.callConnected) return;
  const mode = state.groupVoice ? 'Группа' : 'P2P';
  try {
    if (state.groupVoice) {
      const peers = Object.values(state.groupPeers).filter((peer) => peer.pc?.connectionState === 'connected');
      if (!peers.length) {
        activeMeta.textContent = `${mode} • -- ms`;
        return;
      }
      const pings = await Promise.all(peers.map(async (peer) => extractPingMsFromPeerConnection(peer.pc)));
      const valid = pings.filter((n) => Number.isFinite(n));
      if (!valid.length) {
        activeMeta.textContent = `${mode} • -- ms`;
        return;
      }
      const avg = Math.round(valid.reduce((acc, n) => acc + n, 0) / valid.length);
      activeMeta.textContent = `${mode} • ${avg}ms`;
      return;
    }

    if (!state.call?.pc) {
      activeMeta.textContent = `${mode} • -- ms`;
      return;
    }
    const one = await extractPingMsFromPeerConnection(state.call.pc);
    activeMeta.textContent = Number.isFinite(one) ? `${mode} • ${one}ms` : `${mode} • -- ms`;
  } catch (_) {}
}

async function extractPingMsFromPeerConnection(pc) {
  if (!pc) return null;
  const stats = await pc.getStats();
  const byId = new Map();
  stats.forEach((r) => byId.set(r.id, r));

  let bestMs = null;
  const takeSec = (secMaybe) => {
    const sec = Number(secMaybe);
    if (!Number.isFinite(sec) || sec < 0) return;
    const ms = Math.round(sec * 1000);
    if (!Number.isFinite(ms)) return;
    if (bestMs === null || ms < bestMs) bestMs = ms;
  };

  stats.forEach((r) => {
    if (r.type !== 'transport' || !r.selectedCandidatePairId) return;
    const pair = byId.get(r.selectedCandidatePairId);
    if (!pair) return;
    takeSec(pair.currentRoundTripTime);
    if (bestMs === null && Number(pair.responsesReceived) > 0) {
      takeSec(Number(pair.totalRoundTripTime) / Number(pair.responsesReceived));
    }
  });

  stats.forEach((r) => {
    if (r.type !== 'candidate-pair') return;
    const active = r.selected || r.nominated || r.state === 'succeeded';
    if (!active) return;
    takeSec(r.currentRoundTripTime);
    if (bestMs === null && Number(r.responsesReceived) > 0) {
      takeSec(Number(r.totalRoundTripTime) / Number(r.responsesReceived));
    }
  });

  if (bestMs === null) {
    stats.forEach((r) => {
      if (r.type !== 'remote-inbound-rtp') return;
      takeSec(r.roundTripTime);
    });
  }

  return bestMs;
}

async function waitForAnswerOrDecline(sessionId, friendCode, token, timeoutMs = 45000) {
  const started = Date.now();
  while (isActiveToken(token) && Date.now() - started < timeoutMs) {
    const session = await signalGet(`/v1/sessions/${encodeURIComponent(sessionId)}?key=${encodeURIComponent(state.me.code)}`);
    if (session?.sdp_answer) return session.sdp_answer;
    try {
      const resolved = await signalGet(`/v1/resolve/${encodeURIComponent(friendCode)}`);
      const endpoint = parseEndpoint(resolved?.endpoint);
      if (endpoint.kind === 'decline' && endpoint.sessionId === sessionId && endpoint.to === state.me.code) {
        throw new Error('Звонок отклонен');
      }
    } catch (err) {
      if (String(err?.message || '').includes('отклонен')) throw err;
    }
    await sleep(NET_TUNE.answerPollMs);
  }
  return null;
}

async function waitIceComplete(pc, token, timeoutMs = NET_TUNE.iceGatherTimeoutMs) {
  if (!isActiveToken(token)) throw new Error('Звонок отменен');
  if (pc.iceGatheringState === 'complete') return;
  await new Promise((resolve) => {
    const t = setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', onChange);
      resolve();
    }, timeoutMs);
    const onChange = () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(t);
        pc.removeEventListener('icegatheringstatechange', onChange);
        resolve();
      }
    };
    pc.addEventListener('icegatheringstatechange', onChange);
  });
}

async function signalGet(path) {
  return signalRequest(path, { method: 'GET', headers: { Accept: 'application/json' } });
}

async function signalPost(path, payload) {
  return signalRequest(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

async function signalRequest(path, init) {
  let lastErr = null;
  for (let attempt = 0; attempt <= NET_TUNE.fetchRetry; attempt += 1) {
    try {
      const res = await fetchWithTimeout(`${baseSignalUrl()}${path}`, init, NET_TUNE.fetchTimeoutMs);
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body?.error) msg = body.error;
        } catch (_) {}
        throw new Error(msg);
      }
      return res.json();
    } catch (err) {
      lastErr = err;
      const msg = String(err?.message || '');
      const retryable = msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('timeout');
      if (!retryable || attempt >= NET_TUNE.fetchRetry) break;
      await sleep(120);
    }
  }
  throw lastErr || new Error('network_error');
}

async function fetchWithTimeout(url, init, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error('timeout');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function baseSignalUrl() {
  return state.me.server.replace(/\/+$/, '');
}

function isActiveToken(token) {
  return token === state.callToken;
}

function ensureCallScope(nextKey) {
  // No auto-disconnect on navigation. Switch happens only on explicit "Подключиться".
  void nextKey;
}

function selectedTargetCallKey() {
  if (!state.selectedTarget) return '';
  if (state.selectedTarget.kind === 'dm') return `dm:${state.selectedTarget.id}`;
  if (state.selectedTarget.kind === 'voice') return `voice:${state.selectedServerId}:${state.selectedTarget.id}`;
  return '';
}

function startPresenceLoops() {
  stopPresenceLoops();
  void sendSelfPresence();
  void refreshOnlineStatuses();

  state.presenceTimerRef = setInterval(() => {
    void sendSelfPresence();
  }, NET_TUNE.presencePushMs);

  state.onlineTimerRef = setInterval(() => {
    void refreshOnlineStatuses();
  }, NET_TUNE.onlinePollMs);
}

function stopPresenceLoops() {
  if (state.presenceTimerRef) clearInterval(state.presenceTimerRef);
  if (state.onlineTimerRef) clearInterval(state.onlineTimerRef);
  state.presenceTimerRef = null;
  state.onlineTimerRef = null;
}

function startGroupSyncLoop() {
  if (state.groupSyncRef) clearInterval(state.groupSyncRef);
  state.groupSyncRef = setInterval(() => {
    void syncGroupsFromServer(true);
  }, NET_TUNE.groupSyncMs);
}

async function syncGroupsFromServer(silent = false) {
  try {
    const resp = await signalGet(`/v1/groups/${encodeURIComponent(state.me.code)}`);
    const remoteRaw = Array.isArray(resp?.groups) ? resp.groups : [];
    const remote = normalizeServers(remoteRaw, state.me.code, state.friends);
    state.servers = remote;
    persist('nx_servers', state.servers);
    renderServers();

    if (state.selectedScope === 'server') {
      const selectedExists = state.servers.some((s) => s.id === state.selectedServerId);
      if (!selectedExists) {
        state.selectedScope = 'home';
        state.selectedServerId = null;
        state.selectedTarget = null;
        renderHome();
      } else {
        renderServerChannels();
      }
    }
  } catch (err) {
    if (!silent) {
      const msg = String(err?.message || '');
      if (msg.includes('404')) showToast('Signal-server без API групп, обнови сервер');
      else showToast('Ошибка синхронизации групп');
    }
  }
}

async function syncServerToBackend(server) {
  try {
    await signalPost('/v1/groups/upsert', {
      group: {
        id: server.id,
        name: server.name,
        creator_code: server.creatorCode,
        member_codes: [...server.memberCodes],
        text_channels: [...server.textChannels],
        voice_channels: [...server.voiceChannels],
      },
    });
  } catch (_) {
    showToast('Не удалось синхронизировать группу на сервер');
  }
}

async function sendSelfPresence() {
  try {
    let endpoint = 'online';
    if (state.groupVoice && state.callConnected) {
      endpoint = `group:${state.groupVoice.serverId}:${state.groupVoice.channel}:${state.me.code}`;
    } else if (state.call?.sessionId) {
      const peerCode = state.call?.friendCode || '';
      endpoint = `session:${state.call.sessionId}:${peerCode}:${state.me.code}`;
    }
    await signalPost('/v1/register', {
      key: state.me.code,
      endpoint,
      sdp_offer: null,
    });
  } catch (_) {}
}

async function refreshOnlineStatuses() {
  if (!state.friends.length) return;

  const checks = await Promise.all(
    state.friends.map(async (friend) => {
      try {
        const resolved = await signalGet(`/v1/resolve/${encodeURIComponent(friend.code)}`);
        const endpoint = String(resolved?.endpoint || '').trim();
        const parsed = parseEndpoint(endpoint);
        return { code: friend.code, online: parsed.kind !== 'none' && parsed.kind !== 'idle', endpoint };
      } catch (_) {
        return { code: friend.code, online: false, endpoint: '' };
      }
    }),
  );

  let changed = false;
  checks.forEach((check) => {
    const f = state.friends.find((friend) => friend.code === check.code);
    if (!f) return;
    if (f.online !== check.online) {
      f.online = check.online;
      changed = true;
    }
    if ((f.endpoint || '') !== check.endpoint) {
      f.endpoint = check.endpoint;
      changed = true;
    }
  });

  if (!changed) return;
  persist('nx_friends', state.friends);
  if (state.selectedScope === 'home') renderDMs();
  if (state.selectedScope === 'server') renderServerChannels();
  refreshSelectedPresence();
}

function refreshSelectedPresence() {
  if (!state.selectedTarget) return;
  if (state.selectedTarget.kind === 'dm') {
    const friend = state.friends.find((f) => f.code === state.selectedTarget.id);
    if (!friend) return;
    statusEl.textContent = friend.online ? 'Статус: готов к звонку' : 'Статус: пользователь не в сети';
  }
  if (state.selectedTarget.memberCodes) {
    renderMembers(state.selectedTarget.memberCodes);
  }
}

function startTimer() {
  stopTimer();
  state.sec = 0;
  timerEl.textContent = '00:00';
  state.timerRef = setInterval(() => {
    state.sec += 1;
    const mm = String(Math.floor(state.sec / 60)).padStart(2, '0');
    const ss = String(state.sec % 60).padStart(2, '0');
    timerEl.textContent = `${mm}:${ss}`;
  }, 1000);
}

function stopTimer() {
  if (state.timerRef) clearInterval(state.timerRef);
  state.timerRef = null;
  timerEl.textContent = '00:00';
}

async function initDevices() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    showToast('Устройство не поддерживает выбор аудио');
    return;
  }

  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (_) {
    showToast('Разреши доступ к микрофону в системе');
  }

  await refreshDeviceLists();

  inputDeviceSelect.onchange = async () => {
    state.inputDeviceId = inputDeviceSelect.value;
    await ensureMicStream(true);
    applyMicState();
  };

  outputDeviceSelect.onchange = async () => {
    state.outputDeviceId = outputDeviceSelect.value;
    await applyOutputDevice();
  };
}

async function refreshDeviceLists() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const inputs = devices.filter((d) => d.kind === 'audioinput');
  const outputs = devices.filter((d) => d.kind === 'audiooutput');

  inputDeviceSelect.innerHTML = '';
  outputDeviceSelect.innerHTML = '';

  inputs.forEach((d, i) => {
    const o = document.createElement('option');
    o.value = d.deviceId;
    o.textContent = d.label || `Микрофон ${i + 1}`;
    inputDeviceSelect.appendChild(o);
  });

  outputs.forEach((d, i) => {
    const o = document.createElement('option');
    o.value = d.deviceId;
    o.textContent = d.label || `Вывод ${i + 1}`;
    outputDeviceSelect.appendChild(o);
  });

  if (!outputs.length) {
    const o = document.createElement('option');
    o.value = '';
    o.textContent = 'Системный по умолчанию';
    outputDeviceSelect.appendChild(o);
  }

  if (state.inputDeviceId) inputDeviceSelect.value = state.inputDeviceId;
  if (state.outputDeviceId) outputDeviceSelect.value = state.outputDeviceId;
}

async function ensureMicStream(force = false) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

  if (state.micStream && !force) return;
  if (state.micStream && force) {
    state.micStream.getTracks().forEach((t) => t.stop());
    state.micStream = null;
  }

  try {
    const audio = state.inputDeviceId ? { deviceId: { exact: state.inputDeviceId } } : true;
    state.micStream = await navigator.mediaDevices.getUserMedia({ audio });
  } catch (_) {
    showToast('Не удалось открыть выбранный микрофон');
  }
}

function applyMicState() {
  if (!state.micStream) return;
  const track = state.micStream.getAudioTracks()[0];
  if (!track) return;

  if (!state.callConnected) {
    track.enabled = false;
    return;
  }

  if (state.voiceMode === 'open') {
    track.enabled = true;
    return;
  }

  track.enabled = state.pttHeld;
}

async function applyOutputDevice(silent = false) {
  if (!state.outputDeviceId) return;
  const targets = [];
  if (remoteAudio && typeof remoteAudio.setSinkId === 'function') targets.push(remoteAudio);
  Object.values(state.groupPeers).forEach((peer) => {
    if (peer.audioEl && typeof peer.audioEl.setSinkId === 'function') targets.push(peer.audioEl);
  });
  if (!targets.length && sinkProbe && typeof sinkProbe.setSinkId === 'function') targets.push(sinkProbe);

  if (!targets.length) {
    if (!silent) showToast('Выбор устройства вывода недоступен в этом окружении');
    return;
  }

  try {
    await Promise.all(targets.map((t) => t.setSinkId(state.outputDeviceId)));
    if (!silent) showToast('Устройство вывода обновлено');
  } catch (_) {
    if (!silent) showToast('Не удалось применить устройство вывода');
  }
}

function hasTauriInvoke() {
  return typeof window !== 'undefined'
    && typeof window.__TAURI__ !== 'undefined'
    && typeof window.__TAURI__.core !== 'undefined'
    && typeof window.__TAURI__.core.invoke === 'function';
}

async function tauriInvoke(command, args = {}) {
  if (!hasTauriInvoke()) {
    throw new Error('tauri_invoke_unavailable');
  }
  return window.__TAURI__.core.invoke(command, args);
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const size = value / (1024 ** index);
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function applyUpdateProgressUi(progress) {
  const downloaded = Number(progress?.downloaded || 0);
  const total = Number(progress?.total || 0);
  const hasTotal = total > 0;
  const percent = hasTotal ? Math.max(0, Math.min(100, Math.round((downloaded / total) * 100))) : 0;
  updateProgressFill.style.width = `${percent}%`;

  if (progress?.error) {
    updateProgressText.textContent = `Ошибка: ${progress.error}`;
    updateProgressText.classList.add('is-error');
    return;
  }

  updateProgressText.classList.remove('is-error');
  if (progress?.finished) {
    updateProgressText.textContent = `Готово: ${formatBytes(downloaded)}`;
    return;
  }

  if (hasTotal) {
    updateProgressText.textContent = `${percent}% • ${formatBytes(downloaded)} / ${formatBytes(total)}`;
  } else if (progress?.in_progress) {
    updateProgressText.textContent = `Загрузка... ${formatBytes(downloaded)}`;
  } else {
    updateProgressText.textContent = '0%';
  }
}

function stopUpdatePolling() {
  if (!state.updatePollRef) return;
  clearInterval(state.updatePollRef);
  state.updatePollRef = null;
}

function setUpdateButtonsMode(mode) {
  if (mode === 'idle') {
    updateDownloadBtn.disabled = false;
    updateDownloadBtn.classList.remove('hidden');
    updateInstallBtn.classList.add('hidden');
    return;
  }
  if (mode === 'downloading') {
    updateDownloadBtn.disabled = true;
    updateDownloadBtn.classList.remove('hidden');
    updateInstallBtn.classList.add('hidden');
    return;
  }
  if (mode === 'ready') {
    updateDownloadBtn.classList.add('hidden');
    updateInstallBtn.classList.remove('hidden');
    updateInstallBtn.disabled = false;
  }
}

async function checkForAppUpdate() {
  if (!modalUpdate || !hasTauriInvoke()) return;
  try {
    const info = await tauriInvoke('check_update');
    if (!info?.available) return;
    state.updateInfo = info;
    updateVersionText.textContent = `Доступна версия ${info.version} (текущая ${info.current_version})`;
    updateNotesText.textContent = info.notes ? `Что нового: ${info.notes.slice(0, 300)}` : '';
    applyUpdateProgressUi({ downloaded: 0, total: info.size || 0 });
    setUpdateButtonsMode('idle');
    openModal(modalUpdate);
  } catch (error) {
    console.warn('update check failed', error);
  }
}

async function onUpdateDownload() {
  if (!state.updateInfo || state.updateBusy) return;
  state.updateBusy = true;
  setUpdateButtonsMode('downloading');
  applyUpdateProgressUi({ downloaded: 0, total: state.updateInfo.size || 0 });
  try {
    await tauriInvoke('start_update_download', {
      downloadUrl: state.updateInfo.download_url,
      version: state.updateInfo.version,
      assetName: state.updateInfo.asset_name,
    });

    stopUpdatePolling();
    state.updatePollRef = setInterval(async () => {
      try {
        const progress = await tauriInvoke('get_update_progress');
        applyUpdateProgressUi(progress);
        if (progress?.error) {
          stopUpdatePolling();
          state.updateBusy = false;
          setUpdateButtonsMode('idle');
          showToast('Ошибка загрузки обновления');
          return;
        }
        if (progress?.finished) {
          stopUpdatePolling();
          state.updateBusy = false;
          setUpdateButtonsMode('ready');
          showToast('Обновление загружено');
        }
      } catch (_) {
        stopUpdatePolling();
        state.updateBusy = false;
        setUpdateButtonsMode('idle');
        showToast('Ошибка проверки прогресса обновления');
      }
    }, 400);
  } catch (_) {
    state.updateBusy = false;
    setUpdateButtonsMode('idle');
    showToast('Не удалось начать загрузку обновления');
  }
}

async function onUpdateInstall() {
  try {
    updateInstallBtn.disabled = true;
    await tauriInvoke('install_downloaded_update');
  } catch (_) {
    updateInstallBtn.disabled = false;
    showToast('Не удалось запустить установщик обновления');
  }
}

function openModal(el) {
  el.classList.remove('hidden');
}

function knownCode(code) {
  if (code === state.me.code) return true;
  return state.friends.some((f) => f.code === code);
}

function volumeTargetByCode(code) {
  if (!code || code === state.me.code) return null;
  return {
    code,
    nick: codeToNick(code),
  };
}

function getFriendVolumePercent(code) {
  const v = Number(state.friendVolumes[code]);
  if (!Number.isFinite(v)) return 100;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function applyRemoteVolumeForCode(code) {
  const pct = getFriendVolumePercent(code);
  if (state.call?.friendCode === code && remoteAudio) {
    remoteAudio.volume = pct / 100;
  }
  const peer = state.groupPeers[code];
  if (peer?.audioEl) {
    peer.audioEl.volume = pct / 100;
  }
}

function isCodeOnline(code) {
  if (code === state.me.code) return true;
  return !!state.friends.find((f) => f.code === code)?.online;
}

function isMemberActiveInCurrentTarget(code) {
  if (!state.selectedTarget) return isCodeOnline(code);

  if (state.selectedTarget.kind === 'voice') {
    if (code === state.me.code) {
      return (
        state.callConnected
        && state.groupVoice
        && state.groupVoice.serverId === state.selectedServerId
        && state.groupVoice.channel === state.selectedTarget.id
      );
    }
    const friend = state.friends.find((f) => f.code === code);
    if (state.groupPeers[code]) {
      return (
        state.callConnected
        && state.groupVoice
        && state.groupVoice.serverId === state.selectedServerId
        && state.groupVoice.channel === state.selectedTarget.id
      );
    }
    if (!friend?.endpoint) return false;
    const parsed = parseEndpoint(friend.endpoint);
    return parsed.kind === 'group'
      && parsed.serverId === state.selectedServerId
      && parsed.channel === state.selectedTarget.id;
  }

  if (state.selectedTarget.kind === 'dm') {
    return isCodeOnline(code);
  }

  return isCodeOnline(code);
}

function codeToNick(code) {
  if (code === state.me.code) return state.me.nick;
  return state.friends.find((f) => f.code === code)?.nick || `User ${code}`;
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => toast.classList.add('hidden'), 2200);
}

function createUniqueCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let out = 'NX-';
  for (let i = 0; i < 6; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || 'NX';
}

function humanKey(code) {
  if (!code) return 'Space';
  return code.startsWith('Key') ? code.replace('Key', '') : code;
}

function humanInputKey(code) {
  if (!code) return 'Space';
  if (code.startsWith('Mouse')) {
    const id = Number(code.replace('Mouse', ''));
    const names = {
      0: 'Mouse Left',
      1: 'Mouse Middle',
      2: 'Mouse Right',
      3: 'Mouse Back',
      4: 'Mouse Forward',
    };
    return names[id] || `Mouse ${id}`;
  }
  return humanKey(code);
}

function parseEndpoint(endpointRaw) {
  const endpoint = String(endpointRaw || '').trim();
  if (!endpoint) return { kind: 'none' };
  if (endpoint === 'idle') return { kind: 'idle' };
  if (endpoint === 'online') return { kind: 'online' };

  const ring = endpoint.match(/^ring:([^:]+):([^:]+):([^:]+)$/);
  if (ring) return { kind: 'ring', sessionId: ring[1], to: ring[2], from: ring[3] };

  const session = endpoint.match(/^session:([^:]+):([^:]*):([^:]+)$/);
  if (session) return { kind: 'session', sessionId: session[1], to: session[2], from: session[3] };

  const decline = endpoint.match(/^decline:([^:]+):([^:]+):([^:]+)$/);
  if (decline) return { kind: 'decline', sessionId: decline[1], to: decline[2], from: decline[3] };

  const group = endpoint.match(/^group:([^:]+):([^:]+):([^:]+)$/);
  if (group) return { kind: 'group', serverId: group[1], channel: group[2], user: group[3] };

  return { kind: 'other', raw: endpoint };
}

function isLikelySdp(sdp) {
  const value = String(sdp || '');
  return value.startsWith('v=0') && value.includes('\n');
}

function normalizeRemoteSdp(sdp) {
  const lines = String(sdp || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => /^[a-z]=/i.test(l));
  return `${lines.join('\r\n')}\r\n`;
}

function stripSsrcLines(sdp) {
  const lines = String(sdp || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => !/^a=ssrc:/i.test(l))
    .filter((l) => !/^a=ssrc-group:/i.test(l));
  return `${lines.join('\r\n')}\r\n`;
}

async function applyRemoteDescriptionWithFallback(pc, type, sdpRaw) {
  const normalized = normalizeRemoteSdp(sdpRaw);
  try {
    await pc.setRemoteDescription({ type, sdp: normalized });
    return;
  } catch (err) {
    const msg = String(err?.message || '');
    if (!msg.toLowerCase().includes('invalid sdp')) throw err;
  }

  const reduced = stripSsrcLines(normalized);
  await pc.setRemoteDescription({ type, sdp: reduced });
}

function id() {
  return `srv_${Math.random().toString(36).slice(2, 9)}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatTime(ts) {
  const d = new Date(ts || Date.now());
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function normalizePart(s) {
  return encodeURIComponent(String(s || '').trim().toLowerCase().replace(/\s+/g, '-'));
}

function normalizeChatList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((m) => m && typeof m.text === 'string' && typeof m.author_code === 'string')
    .map((m) => ({
      id: String(m.id || id()),
      authorCode: String(m.author_code).toUpperCase(),
      authorNick: String(m.author_nick || m.author_code || 'User'),
      text: String(m.text),
      ts: Number(m.ts || Date.now()),
    }))
    .slice(-300);
}

function persist(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function safeJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    localStorage.removeItem(key);
    return null;
  }
}

function sanitizeFriends(input) {
  if (!Array.isArray(input)) return [];
  const demoCodes = new Set(['NX-AL3X10', 'NX-MAX009']);
  const demoNicks = new Set(['alex dev', 'maxo']);

  return input
    .filter((f) => f && typeof f.nick === 'string' && typeof f.code === 'string')
    .map((f) => ({
      nick: f.nick.trim(),
      code: f.code.trim().toUpperCase(),
      online: false,
      endpoint: '',
    }))
    .filter((f) => /^NX-[A-Z0-9]{6}$/.test(f.code))
    .filter((f) => !demoCodes.has(f.code) && !demoNicks.has(f.nick.toLowerCase()));
}

function normalizeServers(servers, fallbackCode, friends) {
  return servers.map((s) => {
    const creatorCode = (s.creatorCode || s.creator_code || fallbackCode).toUpperCase();
    const memberCodes = Array.isArray(s.memberCodes)
      ? [...new Set(s.memberCodes)]
      : Array.isArray(s.member_codes)
        ? [...new Set(s.member_codes)]
      : Array.isArray(s.members)
        ? [...new Set(s.members.map((name) => friends.find((f) => f.nick === name)?.code || fallbackCode))]
        : [fallbackCode];
    const normalizedMembers = memberCodes
      .map((c) => String(c || '').trim().toUpperCase())
      .filter((c) => /^NX-[A-Z0-9]{6}$/.test(c));

    return {
      id: s.id || id(),
      name: s.name || 'Server',
      creatorCode,
      memberCodes: normalizedMembers.length ? [...new Set(normalizedMembers)] : [fallbackCode],
      textChannels: Array.isArray(s.textChannels) && s.textChannels.length
        ? s.textChannels
        : Array.isArray(s.text_channels) && s.text_channels.length
          ? s.text_channels
          : ['общий'],
      voiceChannels: Array.isArray(s.voiceChannels) && s.voiceChannels.length
        ? s.voiceChannels
        : Array.isArray(s.voice_channels) && s.voice_channels.length
          ? s.voice_channels
          : ['voice-1'],
    };
  });
}

function playCue(type) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  if (!state.sfx) state.sfx = new AudioCtx();
  const ctx = state.sfx;
  const now = ctx.currentTime;

  const tones = {
    join: [[620, 0.06, 0], [820, 0.08, 0.07]],
    leave: [[820, 0.06, 0], [620, 0.08, 0.07]],
    pttDown: [[740, 0.03, 0]],
    pttUp: [[520, 0.03, 0]],
    ringOut: [[540, 0.16, 0], [680, 0.16, 0.2]],
    ringIn: [[680, 0.16, 0], [540, 0.16, 0.2]],
  }[type];

  const cueVolume = {
    join: 0.22,
    leave: 0.22,
    pttDown: 0.18,
    pttUp: 0.18,
    ringOut: 0.55,
    ringIn: 0.55,
  }[type] || 0.22;

  if (!tones) return;

  tones.forEach(([freq, dur, offs]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const volume = cueVolume;
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + offs);
    gain.gain.exponentialRampToValueAtTime(volume, now + offs + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offs + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + offs);
    osc.stop(now + offs + dur + 0.01);
  });
}

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

