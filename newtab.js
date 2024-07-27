(function () {
  function getRandomHex() {
    var letters = "0123456789ABCDEF".split("");
    var color = "#";
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var reminder = document.getElementById("reminder");
    reminder.textContent = "*".repeat(20);

    chrome.storage.local.get(["reminder"], function (result) {
      if (result.reminder) {
        var content = result.reminder;
        var toggler = document.getElementById("toggler");
        toggler.addEventListener("click", function () {
          let reminder = document.querySelector("#reminder");
          if (reminder.getAttribute("data-type") === "password") {
            reminder.setAttribute("data-type", "text");
            reminder.textContent = content;
          } else {
            reminder.setAttribute("data-type", "password");
            reminder.textContent = "*".repeat(20);
          }
        });
      }
    });
  });

  reminder.style.color = getRandomHex();
  document.body.style.backgroundColor = getRandomHex();
})();
