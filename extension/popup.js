document.addEventListener("click", function (event) {
    const popup = document.getElementById("my-popup");

    if (popup && !popup.contains(event.target)) {
        popup.style.display = "none";
    }
});