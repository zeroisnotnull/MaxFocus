let timer;
let timeLeft;
let isRunning = false;
let isPaused = false;
let currentTimerType = null;
let blockedSites = [
  'vk.com',
  'youtube.com',
  'instagram.com',
  'facebook.com'
];

// Work time tracking
let workTimeLog = [];

function logWorkTime(minutes) {
  const now = new Date();
  workTimeLog.push({
    timestamp: now.getTime(),
    minutes: minutes
  });

  // Remove entries older than 24 hours
  const twentyFourHoursAgo = now.getTime() - (24 * 60 * 60 * 1000);
  workTimeLog = workTimeLog.filter(entry => entry.timestamp >= twentyFourHoursAgo);

  // Save to storage
  chrome.storage.local.set({ workTimeLog: workTimeLog });
}

function getTotalWorkTime() {
  const now = new Date();
  const twentyFourHoursAgo = now.getTime() - (24 * 60 * 60 * 1000);

  return workTimeLog
    .filter(entry => entry.timestamp >= twentyFourHoursAgo)
    .reduce((total, entry) => total + entry.minutes, 0);
}

// Initialize context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'toggleSite',
    title: 'Toggle site in blocking list',
    contexts: ['page']
  });

  // Set default timer values and blocked sites
  chrome.storage.sync.get(['workTime', 'breakTime', 'blockedSites'], (data) => {
    if (!data.workTime) chrome.storage.sync.set({ workTime: 25 });
    if (!data.breakTime) chrome.storage.sync.set({ breakTime: 5 });
    if (!data.blockedSites) chrome.storage.sync.set({ blockedSites: blockedSites });
    else blockedSites = data.blockedSites;
  });

  // Load work time log
  chrome.storage.local.get(['workTimeLog'], (data) => {
    if (data.workTimeLog) {
      workTimeLog = data.workTimeLog;
    }
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const url = new URL(tab.url);
  const domain = url.hostname.replace('www.', '');

  const index = blockedSites.indexOf(domain);
  if (index === -1) {
    blockedSites.push(domain);
  } else {
    blockedSites.splice(index, 1);
  }

  chrome.storage.sync.set({ blockedSites: blockedSites }, () => {
    chrome.runtime.sendMessage({ action: 'updateSites' }).catch(() => {
      // Ignore error if popup is not open
    });
  });
});

// Handle navigation
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (!isRunning || isPaused || currentTimerType === 'break') return;

  const url = new URL(details.url);
  const domain = url.hostname.replace('www.', '');

  if (blockedSites.includes(domain)) {
    chrome.tabs.update(details.tabId, { url: 'blocked.html' });
  }
});

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'startTimer':
      startTimer(request.minutes, request.type);
      break;
    case 'togglePause':
      isPaused = request.isPaused;
      break;
    case 'finishWork':
      if (currentTimerType === 'work' && isRunning) {
        const workMinutes = Math.ceil((request.initialMinutes * 60 - timeLeft) / 60);
        if (workMinutes > 0) {
          logWorkTime(workMinutes);
        }
      }
      stopTimer();
      break;
    case 'removeSite':
      removeSite(request.site);
      break;
    case 'getState':
      sendResponse({
        timeLeft: timeLeft,
        isRunning: isRunning,
        isPaused: isPaused,
        currentTimerType: currentTimerType,
        totalWorkTime: getTotalWorkTime()
      });
      return true;
  }
});

function startTimer(minutes, type) {
  stopTimer(); // Clear any existing timer

  timeLeft = minutes * 60;
  isRunning = true;
  isPaused = false;
  currentTimerType = type;

  timer = setInterval(() => {
    if (!isPaused && isRunning) {
      timeLeft--;
      if (timeLeft <= 0) {
        if (currentTimerType === 'work') {
          // Log completed work time
          logWorkTime(minutes);

          // When work timer ends, automatically start break timer
          chrome.storage.sync.get(['breakTime'], (data) => {
            showNotification();
            startTimer(data.breakTime, 'break');
          });
        } else {
          stopTimer();
          showNotification();
        }
      }
      broadcastUpdate();
    }
  }, 1000);
}

function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  isRunning = false;
  isPaused = false;
  currentTimerType = null;
  broadcastUpdate();
}

function removeSite(site) {
  const index = blockedSites.indexOf(site);
  if (index > -1) {
    blockedSites.splice(index, 1);
    chrome.storage.sync.set({ blockedSites: blockedSites }, () => {
      chrome.runtime.sendMessage({ action: 'updateSites' }).catch(() => {
        // Ignore error if popup is not open
      });
    });
  }
}

function showNotification() {
  let title, message;
  if (currentTimerType === 'work') {
    title = 'Рабочее время завершено!';
    chrome.storage.sync.get(['breakTime'], (data) => {
      message = `Рабочее время закончилось! Вы можете сделать ${data.breakTime}-минутный перерыв.`;
      createNotification(title, message);
    });
  } else {
    title = 'Перерыв завершен!';
    message = 'Время перерыва закончилось! Готовы к работе?';
    createNotification(title, message);
  }
}

function broadcastUpdate() {
  const updateMessage = {
    action: 'updateTimer',
    timeLeft: timeLeft,
    isRunning: isRunning,
    isPaused: isPaused,
    currentTimerType: currentTimerType,
    totalWorkTime: getTotalWorkTime()
  };

  // Send update to all tabs
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, updateMessage).catch(() => {
        // Ignore errors for tabs where content script is not loaded
      });
    });
  });

  // Send update to popup
  chrome.runtime.sendMessage(updateMessage).catch(() => {
    // Ignore error if popup is not open
  });
}

async function createNotification(title, message) {
  // Create Chrome notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon96.png',
    title: title,
    message: message,
    priority: 2,
    requireInteraction: true
  });

  // Send message to all tabs to show notification
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'timerComplete',
          type: currentTimerType,
          message: message
        });
      } catch (error) {
        // Ignore errors for tabs where content script is not loaded
        console.debug(`Could not send message to tab ${tab.id}`);
      }
    }
  } catch (error) {
    console.debug('Error querying tabs:', error);
  }
}