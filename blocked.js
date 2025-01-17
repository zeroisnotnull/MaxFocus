let updateInterval;

function updateTimerDisplay(timeLeft) {
  if (typeof timeLeft !== 'number') return;
  
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  document.getElementById('timer').textContent = timeString;
  document.getElementById('timeLeft').textContent = 
    `${minutes} ${getMinutesWord(minutes)}`;
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

function getTimerState() {
  chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
    if (response && typeof response.timeLeft === 'number') {
      updateTimerDisplay(response.timeLeft);
    }
  });
}

// Initial state
document.addEventListener('DOMContentLoaded', () => {
  getTimerState();

  // Set up regular updates
  updateInterval = setInterval(getTimerState, 1000);

  // Listen for timer updates
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateTimer' && typeof request.timeLeft === 'number') {
      updateTimerDisplay(request.timeLeft);
    }
  });

  // Clean up interval when page is unloaded
  window.addEventListener('unload', () => {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
  });
});