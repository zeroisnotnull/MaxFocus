let timeLeft;
let isRunning = false;
let isPaused = false;
let currentTimerType = null;

document.addEventListener('DOMContentLoaded', () => {
  // Load saved timer settings
  chrome.storage.sync.get(['workTime', 'breakTime'], (data) => {
    if (data.workTime) document.getElementById('workTime').value = data.workTime;
    if (data.breakTime) document.getElementById('breakTime').value = data.breakTime;
  });

  // Get initial state from background
  chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
    if (response) {
      timeLeft = response.timeLeft;
      isRunning = response.isRunning;
      isPaused = response.isPaused;
      currentTimerType = response.currentTimerType;
      updateTotalWorkTime(response.totalWorkTime);
      updateDisplay();
    }
  });

  // Initialize buttons
  document.getElementById('startWork').addEventListener('click', () => {
    const workTime = parseInt(document.getElementById('workTime').value);
    startTimer(workTime, 'work');
  });

  document.getElementById('pauseTimer').addEventListener('click', togglePause);
  document.getElementById('finishWork').addEventListener('click', () => {
    const workTime = parseInt(document.getElementById('workTime').value);
    chrome.runtime.sendMessage({
      action: 'finishWork',
      initialMinutes: workTime
    });
  });

  // Save timer settings when changed
  document.getElementById('workTime').addEventListener('change', saveTimerSettings);
  document.getElementById('breakTime').addEventListener('change', saveTimerSettings);

  // Add event delegation for remove site buttons
  document.getElementById('sitesList').addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-site')) {
      const site = e.target.dataset.site;
      chrome.runtime.sendMessage({
        action: 'removeSite',
        site: site
      });
    }
  });

  // Load initial state
  loadSites();
  updateDisplay();
});

function updateTotalWorkTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  const hoursWord = getHoursWord(hours);
  const minutesWord = getMinutesWord(remainingMinutes);
  
  document.getElementById('totalWorkTime').textContent =
    `${hours} ${hoursWord} ${remainingMinutes} ${minutesWord}`;
}
function getHoursWord(number) {
  const lastDigit = number % 10;
  const lastTwoDigits = number % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return 'часов';
  }

  if (lastDigit === 1) {
    return 'час';
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'часа';
  }

  return 'часов';
}

function getMinutesWord(number) {
  const lastDigit = number % 10;
  const lastTwoDigits = number % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return 'минут';
  }

  if (lastDigit === 1) {
    return 'минута';
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'минуты';
  }

  return 'минут';
}


function saveTimerSettings() {
  const workTime = parseInt(document.getElementById('workTime').value);
  const breakTime = parseInt(document.getElementById('breakTime').value);

  chrome.storage.sync.set({
    workTime: workTime,
    breakTime: breakTime
  });
}

function startTimer(minutes, type) {
  chrome.runtime.sendMessage({
    action: 'startTimer',
    minutes: minutes,
    type: type
  });
}

function togglePause() {
  isPaused = !isPaused;
  chrome.runtime.sendMessage({
    action: 'togglePause',
    isPaused: isPaused
  });

  document.getElementById('pauseTimer').textContent =
    isPaused ? 'Продолжить' : 'Пауза';
}

function resetDisplay() {
  isRunning = false;
  isPaused = false;
  document.getElementById('timer').textContent = document.getElementById('workTime').value + ':00';
  document.getElementById('pauseTimer').textContent = 'Pause Timer';
}

function updateDisplay() {
  if (timeLeft !== undefined) {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('timer').textContent =
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    document.getElementById('pauseTimer').textContent =
      isPaused ? 'Resume Timer' : 'Pause Timer';
  }
}

function loadSites() {
  chrome.storage.sync.get(['blockedSites'], (data) => {
    const sitesList = document.getElementById('sitesList');
    sitesList.innerHTML = '';

    const sites = data.blockedSites || [];
    sites.forEach(site => {
      const div = document.createElement('div');
      div.className = 'site-item';
      div.innerHTML = `
        <span>${site}</span>
        <span class="remove-site" data-site="${site}">X</span>
      `;
      sitesList.appendChild(div);
    });
  });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateTimer') {
    timeLeft = request.timeLeft;
    isRunning = request.isRunning;
    isPaused = request.isPaused;
    currentTimerType = request.currentTimerType;
    if (request.totalWorkTime !== undefined) {
      updateTotalWorkTime(request.totalWorkTime);
    }
    updateDisplay();
  } else if (request.action === 'updateSites') {
    loadSites();
  }
});

 // Handle star rating
 document.querySelectorAll('.star').forEach(star => {
    star.addEventListener('click', () => {
      const rating = star.dataset.rating;
      const extensionId = chrome.runtime.id;
      const chromeStoreUrl = `https://chrome.google.com/webstore/detail/${extensionId}`;
      chrome.tabs.create({ url: chromeStoreUrl });
    });
  });