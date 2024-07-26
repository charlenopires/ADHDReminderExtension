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
    reminder.textContent = "*".repeat(10);

    chrome.storage.local.get(["reminder"], function (result) {
      if (result.reminder) {
        var content = result.reminder;
        var pass = "*".repeat(content.length);
        var toggler = document.getElementById("toggler");
        toggler.addEventListener("click", function () {
          let reminder = document.querySelector("#reminder");
          if (reminder.getAttribute("data-type") === "password") {
            reminder.setAttribute("data-type", "text");
            reminder.textContent = pass;
          } else {
            reminder.setAttribute("data-type", "password");
            reminder.textContent = content;
          }
        });
      }
    });
  });

  reminder.style.color = getRandomHex();
  document.body.style.backgroundColor = getRandomHex();
})();
