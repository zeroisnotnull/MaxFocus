// Create notification element
function createNotification(message) {
    // Remove any existing notification
    const existingNotification = document.getElementById('strict-workflow-notification');
    if (existingNotification) {
      existingNotification.remove();
    }
  
    // Create new notification
    const notification = document.createElement('div');
    notification.id = 'strict-workflow-notification';
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 30px 50px;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      z-index: 999999;
      font-family: Arial, sans-serif;
      font-size: 24px;
      text-align: center;
      animation: fadeIn 0.5s ease-out;
      min-width: 300px;
    `;
  
    // Add message
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    notification.appendChild(messageElement);
  
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.cssText = `
      position: absolute;
      right: 15px;
      top: 15px;
      background: none;
      border: none;
      color: white;
      font-size: 28px;
      cursor: pointer;
      padding: 0;
      margin: 0;
      line-height: 1;
      opacity: 0.7;
      transition: opacity 0.2s;
    `;
    closeButton.onmouseover = () => closeButton.style.opacity = '1';
    closeButton.onmouseout = () => closeButton.style.opacity = '0.7';
    closeButton.onclick = () => notification.remove();
    notification.appendChild(closeButton);
  
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translate(-50%, -60%);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%);
        }
      }
    `;
    document.head.appendChild(style);
  
    // Add to page
    document.body.appendChild(notification);
  
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'fadeIn 0.5s ease-out reverse';
        setTimeout(() => notification.remove(), 500);
      }
    }, 10000);
  }
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'timerComplete') {
      createNotification(request.message);
    }
  });