import './style.css'
import firebaseConfig from './firebase-config.js'
import { initializeApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'

const app = initializeApp(firebaseConfig)
const auth = getAuth()
let registerForm = document.getElementById('register-form')


registerForm.addEventListener("submit", async (e) => {
  e.preventDefault(e)
  console.log(e, registerForm)
  const displayName = e.target[0].value
  const email = e.target[1].value
  const password = e.target[2].value
  const file = e.target[3].files[0]

  createUserWithEmailAndPassword(auth, email, password)
  .then((userCredential) => {
    // Signed up 
    const user = userCredential.user;

    console.log(user)
  })
  .catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
    console.log(errorCode, '\n\t', errorMessage)
    



  })
})

