const registerForm = document.getElementById('register-form')

registerForm.addEventListener("submit", (e) => {
    e.preventDefault()
    console.log(e.target[0].value)


})


