document.getElementById('save-btn').addEventListener('click', function() {
    const reminder = document.getElementById('reminder-input').value;
    if (reminder) {
      chrome.storage.local.set({reminder: reminder}, function() {
        console.log('Reminder saved');
        window.close();
      });
    }
  });