import './style.css'
import fs from 'fs/promises'

import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'

let firebaseConfig
 
;(async () => {
  try {
    const data = await fs.readFile('firebase-config.json', 'utf8')
    firebaseConfig = JSON.parse(data)

  } catch (error) {
    console.error('Error reading JSON file:', error)
  }
})()

const app = initializeApp(firebaseConfig)
const auth = getAuth()





const registerForm = document.getElementById('register-form')
registerForm.addEventListener("submit", (e) => {
    e.preventDefault(e)
    let displayName = e.target[0].value
    let email = e.target[1].value
    let password = e.target[2].value
    let file = e.target[3].files[0]
})


createUserWithEmailAndPassword(auth, email, password)
  .then((userCredential) => {
    // Signed up 
    const user = userCredential.user;
    // ...
  })
  .catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
    // ..
  });