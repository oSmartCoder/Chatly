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

	try {
		// Create user
		const res = await createUserWithEmailAndPassword(auth, email, password)
		const storageRef = ref(storage, displayName)


		const uploadTask = uploadBytesResumable(storageRef, file)

		uploadTask.on(
			(error) => {
				console.log(error)
				setError(registerForm, 'errorSpan')
			},
			() => {
				getDownloadURL(uploadTask.snapshot.ref).then(async (downloadURL) => {
					// Update profile
					await updateProfile(res.user, {
						displayName,
						photoURL: downloadURL,
					})
	
					// Create user on firestore
					await setDoc(doc(db, 'users', res.user.uid), {
						uid: res.user.uid,
						displayName,
						email,
						photoURL: downloadURL,
					})

					// Create user chats on firestore
					await setDoc(doc(db, 'userChats', res.user.uid), {})

					
				})
			}
		)
	}
	catch (error) {
		console.log(error)
		setError(registerForm, 'errorSpan')
	}
})
