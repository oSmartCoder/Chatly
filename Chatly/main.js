import './style.css'
import { app, auth, storage, db } from './firebase-config.js'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"
import { doc, setDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

const content = document.getElementById('content')

var userSignedIn

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

let updateUserStatus = new Promise((resolve, reject) => {
	onAuthStateChanged(auth, (user) => {
		
		userSignedIn = !!user
		console.log(userSignedIn)
	})
	resolve()
})


let updateContent = (route) => {
	return new Promise(async (resolve, reject) => {
		content.innerHTML = ''
		updateUserStatus.then(() => {
			switch (route) {
				case '/':
					loadHTML(`${(userSignedIn) ? 'home' : 'login'}.html`, (html) => {
						content.innerHTML = html
						resolve()
					})
					break
	
				case '/login':
					loadHTML(`${(userSignedIn) ? 'home' : 'login'}.html`, (html) => {
						content.innerHTML = html
						resolve()
					})
					break
	
				case '/register':
					loadHTML(`${(userSignedIn) ? 'home' : 'register'}.html`, (html) => {
						content.innerHTML = html
						resolve()
					})
					break
	
				default:
					content.innerHTML = '404 Page not found'
					reject('404 Page not found')
			}

		})
		console.log(userSignedIn, 'ee')
	})
}

let handleNavigation = () => {
	return new Promise(async resolve => {
		const route = window.location.pathname
		await updateContent(route)
		resolve()
	})
}	

// Add event listeners
window.addEventListener('popstate', handleNavigation)



;(async () => {
	// Initial page load
	await handleNavigation()

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
						await updateContent('/')

						userSignedIn = true
					})
				}
			)
		}
		catch (error) {
			console.log(error)
			setError(registerForm, 'errorSpan')
		}
	})

	
})()





