import './style.css'
import { app, auth, storage, db } from './firebase-config.js'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"
import { doc, setDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

const content = document.getElementById('content')

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

let loadHTML = (url, callback) => {
  const xhr = new XMLHttpRequest()
  xhr.open('GET', url, true)
  xhr.onreadystatechange = () => {
	if (xhr.readyState === 4 && xhr.status === 200) {
	  callback(xhr.responseText)
	}
  }
  xhr.send()
}

let updateContent = (route) => {
	content.innerHTML = ''

	switch (route) {
		case '/':
			loadHTML('home.html', (html) => {
				content.innerHTML = html
			})
			break
		case '/login':
			loadHTML('login.html', (html) => {
				content.innerHTML = html
			})
			break
		case '/register':
			loadHTML('register.html', (html) => {
				content.innerHTML = html
			})
			break
		default:
			content.innerHTML = '404 Page not found'
	}
}

let handleNavigation = () => {
	const route = window.location.pathname
	updateContent(route)
}	

// Add event listeners
window.addEventListener('popstate', handleNavigation)

// Initial page load
handleNavigation()

console.log(document)
let registerForm = document.getElementById('register-form')

registerForm.addEventListener("submit", async (e) => {
	e.preventDefault(e)
	const displayName = e.target[0].value
	const email = e.target[1].value
	const password = e.target[2].value
	const file = e.target[3].files[0]

	try {
		// Create user AUTHENTICATION
		const res = await createUserWithEmailAndPassword(auth, email, password)

		// Create storange reference
		const storageRef = ref(storage, displayName)

		// STORAGE
		const uploadTask = uploadBytesResumable(storageRef, file)

		uploadTask.on('state_changed',
			(snapshot) => {
				// Handle the upload progress
				const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
				console.log(`Upload is ${progress}% complete`)
			},

			(error) => {
				console.log('Upload error:', error)
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

					// This code runs INSIDE of the asynchronous function (so that the page won't refresh mid-upload)
					window.location.replace('home.html')
				})
			}
		)
	}
	catch (error) {
		console.log(error)
		setError(registerForm, 'errorSpan')
	}
})
