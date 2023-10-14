import { auth, signIn } from "./firebase.js"


const registerForm = document.getElementById('register-form')

registerForm.addEventListener("submit", (e) => {
    e.preventDefault()
    console.log(e)
    let displayName = e.target[0].value
    let email = e.target[1].value
    let password = e.target[2].value
    let file = e.target[3].files[0]
})



auth = getAuth()

signIn(auth, email, password)
  .then((userCredential) => {
    // Signed in 
    const user = userCredential.user;
    // ...
  })
  .catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
  });