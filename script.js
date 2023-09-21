let username = document.getElementById("text")
let email = document.getElementById("email")
let password = document.getElementById("password")
let file = document.getElementById("file")
let submit = document.getElementById("submit")

submit.addEventListener("click", () => {
    // Find a way to store the values either into a online database like Firebase or through JSON files.
    window.location.replace('home.html')

})