import './style.css'
import { app, auth, storage, db } from './firebase-config.js'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, setDoc } from 'firebase/firestore'


let registerForm = document.getElementById('register-form')
// let errorSpan = document.getElementById('error-span')

const setError = (parentElement, id) => {
  if (parentElement.contains(document.getElementById(id))) {
    return
  }
  else {
    let span = document.createElement('span')
    span.id = id
    span.textContent = 'Something went wrong.'
    parentElement.appendChild(span)
  }
}
	
registerForm.addEventListener("submit", async (e) => {
	e.preventDefault(e)
	const displayName = e.target[0].value
	const email = e.target[1].value
	const password = e.target[2].value
	const file = e.target[3].files[0]

	createUserWithEmailAndPassword(auth, email, password)
	.then((userCredential) => {
	const user = userCredential.user;

	const storageRef = ref(storage, displayName)
	const uploadTask = uploadBytesResumable(storageRef, file)

	uploadTask.on('state_changed', 
		(error) => {setError(registerForm, 'errorSpan')}, 
		() => {
		getDownloadURL(uploadTask.snapshot.ref)
		.then(async (downloadURL) => {

			await updateProfile(user, {
                displayName,
                photoURL: downloadURL,
			})
			
            await setDoc(doc(db, 'users', user.uid)), {
                uid: user.uid,
                displayName,
                email,
                photoURL: downloadURL
			}
		})
        }
	)


	})
	.catch((error) => {
	// const errorCode = error.code;
	// const errorMessage = error.message;
	setError(registerForm, 'errorSpan')
	})
})

